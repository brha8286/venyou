import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAssignTasks } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      event: true,
      assignedUser: true,
      comments: {
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      },
      notifications: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (session.user.systemRole === "crew") {
    // Crew can only update status
    if ("status" in body) {
      data.status = body.status;
    }
  } else if (canAssignTasks(session.user.systemRole)) {
    const allowedFields = [
      "status",
      "assignedUserId",
      "assignedRole",
      "dueDate",
      "startDate",
      "description",
      "phase",
    ];
    for (const field of allowedFields) {
      if (field in body) {
        if (field === "dueDate" || field === "startDate") {
          data[field] = body[field] ? new Date(body[field]) : null;
        } else {
          data[field] = body[field];
        }
      }
    }
  }

  // When status changes to "done", set completedAt
  if (data.status === "done" && existing.status !== "done") {
    data.completedAt = new Date();
  }

  // If status changes away from "done", clear completedAt
  if (data.status && data.status !== "done" && existing.status === "done") {
    data.completedAt = null;
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      event: true,
      assignedUser: true,
    },
  });

  // Create notification when assignee changes
  if (
    "assignedUserId" in body &&
    body.assignedUserId &&
    body.assignedUserId !== existing.assignedUserId
  ) {
    await prisma.taskNotification.create({
      data: {
        taskId: id,
        userId: body.assignedUserId,
        channel: "email",
        notificationType: "assignment",
        scheduledFor: new Date(),
        status: "pending",
      },
    });
  }

  return NextResponse.json(task);
}
