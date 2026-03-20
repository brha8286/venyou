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
