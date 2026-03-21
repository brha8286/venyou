import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const eventId = searchParams.get("eventId");
  const assignedUserId = searchParams.get("assignedUserId");
  const status = searchParams.get("status");
  const overdue = searchParams.get("overdue");
  const upcoming = searchParams.get("upcoming");

  const where: Record<string, unknown> = {};

  if (eventId) where.eventId = eventId;
  if (assignedUserId) where.assignedUserId = assignedUserId;
  if (status) where.status = status;

  if (overdue === "true") {
    where.dueDate = { lt: new Date() };
    where.status = { not: "done" };
  }

  if (upcoming) {
    const days = parseInt(upcoming, 10);
    if (!isNaN(days)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      where.dueDate = {
        gte: new Date(),
        lte: futureDate,
      };
    }
  }

  if (session.user.systemRole === "crew") {
    where.assignedUserId = session.user.id;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      event: {
        select: { title: true },
      },
      assignedUser: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { phase: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.systemRole;
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { eventId, name, phase, dueDate, assignedUserId, description } = body;

  if (!eventId || !name || !phase || !dueDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      eventId,
      name,
      phase,
      dueDate: new Date(dueDate),
      assignedUserId: assignedUserId || null,
      description: description || null,
      status: "not_started",
      isGenerated: false,
      sortOrder: 999,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
