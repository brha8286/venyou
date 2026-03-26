import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications";
import { buildMentionEmail } from "@/lib/email-templates";

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
    select: { id: true, name: true, eventId: true, event: { select: { id: true, title: true } } },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json();
  const { body: commentBody } = body;

  if (!commentBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
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

  // Parse @mentions and notify mentioned users (fire-and-forget)
  if (commentBody.includes("@")) {
    const allUsers = await prisma.user.findMany({
      where: { isActive: true, emailEnabled: true },
      select: { id: true, name: true, email: true },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://venyou.subculture.audio";
    const authorName = comment.author.name;

    for (const user of allUsers) {
      if (user.id === session.user.id) continue;
      const escaped = user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`@${escaped}(?=\\s|$|[^a-zA-Z])`, "i");
      if (pattern.test(commentBody)) {
        const html = buildMentionEmail(
          user.name,
          authorName,
          task.name,
          task.event.title,
          task.event.id,
          commentBody,
          appUrl
        );
        sendEmail(
          user.email,
          `venyou — ${authorName} mentioned you`,
          `${authorName} mentioned you in a comment.`,
          html
        ).catch(() => {});
      }
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
