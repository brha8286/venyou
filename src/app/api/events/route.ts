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
  const upcoming = searchParams.get("upcoming");

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (upcoming === "true") {
    where.eventDate = { gte: new Date() };
    if (!status) {
      where.status = { notIn: ["cancelled", "completed"] };
    }
  }

  if (session.user.systemRole === "crew") {
    where.OR = [
      { tasks: { some: { assignedUserId: session.user.id } } },
      { eventAssignments: { some: { userId: session.user.id } } },
    ];
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
    loadInDate,
    endDate,
    eventTemplateId,
    venueId,
    clientId,
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

  if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
    return NextResponse.json(
      { error: "endTime must be after startTime" },
      { status: 400 }
    );
  }

  try {
  const event = await prisma.event.create({
    data: {
      title,
      eventDate: new Date(eventDate),
      loadInDate: loadInDate ? new Date(loadInDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      eventTemplateId,
      venueId: venueId || null,
      clientId: clientId || null,
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

  try {
    await generateTasksForEvent(event.id);
  } catch (genErr) {
    // Task generation failed — delete the orphaned event so the DB stays clean
    await prisma.event.delete({ where: { id: event.id } }).catch(() => {});
    throw genErr;
  }

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
