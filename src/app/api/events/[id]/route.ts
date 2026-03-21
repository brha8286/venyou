import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateEvent } from "@/lib/permissions";
import { generateTasksForEvent } from "@/lib/task-generation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      eventTemplate: true,
      tasks: {
        include: {
          assignedUser: true,
        },
        orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
      },
      eventAssignments: {
        include: { user: { select: { id: true, name: true } } },
      },
      client: { select: { id: true, name: true, pocName: true, pocPhone: true, pocEmail: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCreateEvent(session.user.systemRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await request.json();
  const { roleAssignments, ...rest } = body;
  const allowedFields = [
    "title",
    "description",
    "venueId",
    "clientId",
    "status",
    "isHomeVenue",
    "transportRequired",
    "coHosted",
    "merchPresent",
    "startTime",
    "endTime",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in rest) {
      if (field === "startTime" || field === "endTime") {
        data[field] = rest[field] ? new Date(rest[field]) : null;
      } else {
        data[field] = rest[field];
      }
    }
  }

  const event = await prisma.event.update({
    where: { id },
    data,
  });

  // If roleAssignments provided, replace existing assignments and re-assign tasks
  if (roleAssignments) {
    await prisma.eventAssignment.deleteMany({ where: { eventId: id } });

    // Deduplicate
    const seen = new Set<string>();
    const deduped = (roleAssignments as { role: string; userId: string }[]).filter((ra) => {
      if (!ra.userId) return false;
      const key = `${ra.role}:${ra.userId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (deduped.length > 0) {
      await prisma.eventAssignment.createMany({
        data: deduped.map((ra) => ({
          eventId: id,
          userId: ra.userId,
          eventRole: ra.role,
        })),
      });
    }

    // Build role-to-user map for re-assignment (first user per role for single-assignee roles)
    const roleMap = new Map<string, string>();
    for (const ra of deduped) {
      if (!roleMap.has(ra.role)) {
        roleMap.set(ra.role, ra.userId);
      }
    }

    // Re-assign ALL generated tasks based on their assignedRole
    const generatedTasks = await prisma.task.findMany({
      where: { eventId: id, isGenerated: true },
    });

    const emFallback = roleMap.get("event_manager") || null;
    for (const task of generatedTasks) {
      if (task.assignedRole) {
        const newUserId = roleMap.get(task.assignedRole) || emFallback;
        await prisma.task.update({
          where: { id: task.id },
          data: { assignedUserId: newUserId },
        });
      }
    }
  }

  const updatedEvent = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      eventTemplate: true,
      tasks: {
        include: { assignedUser: true },
        orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
      },
      eventAssignments: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(updatedEvent);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.systemRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await prisma.event.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
