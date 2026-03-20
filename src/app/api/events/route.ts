import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateEvent } from "@/lib/permissions";
import { generateTasksForEvent } from "@/lib/task-generation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (session.user.systemRole === "crew") {
    where.tasks = {
      some: {
        assignedUserId: session.user.id,
      },
    };
  }

  const events = await prisma.event.findMany({
    where,
    include: {
      venue: true,
      _count: {
        select: { tasks: true },
      },
    },
    orderBy: { eventDate: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCreateEvent(session.user.systemRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    title,
    eventDate,
    eventTemplateId,
    venueId,
    description,
    isHomeVenue,
    transportRequired,
    coHosted,
    merchPresent,
    startTime,
    endTime,
    roleAssignments,
  } = body;

  if (!title || !eventDate || !eventTemplateId) {
    return NextResponse.json(
      { error: "title, eventDate, and eventTemplateId are required" },
      { status: 400 }
    );
  }

  try {
  const event = await prisma.event.create({
    data: {
      title,
      eventDate: new Date(eventDate),
      eventTemplateId,
      venueId: venueId || null,
      description: description || null,
      isHomeVenue: isHomeVenue ?? false,
      transportRequired: transportRequired ?? false,
      coHosted: coHosted ?? false,
      merchPresent: merchPresent ?? false,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      createdByUserId: session.user.id,
    },
  });

  if (roleAssignments && roleAssignments.length > 0) {
    // Deduplicate: same user+role combo should only appear once
    const seen = new Set<string>();
    const dedupedAssignments = roleAssignments.filter((ra: { role: string; userId: string }) => {
      if (!ra.userId) return false;
      const key = `${ra.role}:${ra.userId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (dedupedAssignments.length > 0) {
      await prisma.eventAssignment.createMany({
        data: dedupedAssignments.map((ra: { role: string; userId: string }) => ({
          eventId: event.id,
          userId: ra.userId,
          eventRole: ra.role,
        })),
      });
    }
  }

  await generateTasksForEvent(event.id);

  const createdEvent = await prisma.event.findUnique({
    where: { id: event.id },
    include: {
      venue: true,
      tasks: true,
      eventTemplate: true,
      eventAssignments: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(createdEvent, { status: 201 });
  } catch (err) {
    console.error("Failed to create event:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create event" },
      { status: 500 }
    );
  }
}
