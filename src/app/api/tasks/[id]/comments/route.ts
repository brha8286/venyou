import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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
    select: { id: true, eventId: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json();
  const { body: commentBody } = body;

  if (!commentBody) {
    return NextResponse.json(
      { error: "body is required" },
      { status: 400 }
    );
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId: id,
      authorUserId: session.user.id,
      body: commentBody,
    },
    include: {
      author: true,
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
