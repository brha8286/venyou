import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications";
import { buildDailyReminderEmail } from "@/lib/email-templates";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
        status: {
          notIn: ["done", "skipped"],
        },
        assignedUserId: { not: null },
      },
      include: {
        event: true,
        assignedUser: true,
      },
      orderBy: { dueDate: "asc" },
    });

    // Group by user
    const tasksByUser: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      if (!task.assignedUserId || !task.assignedUser) continue;
      if (!tasksByUser[task.assignedUserId]) {
        tasksByUser[task.assignedUserId] = [];
      }
      tasksByUser[task.assignedUserId].push(task);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://plan.subculture.audio";
    let emailsSent = 0;

    for (const [userId, userTasks] of Object.entries(tasksByUser)) {
      const user = userTasks[0].assignedUser;
      if (!user || !user.emailEnabled || !user.isActive) continue;

      const taskData = userTasks.map((t) => ({
        name: t.name,
        eventTitle: t.event.title,
        dueDate: t.dueDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        status: t.status,
        phase: t.phase,
        eventId: t.eventId,
      }));

      const html = buildDailyReminderEmail(user.name, taskData, appUrl);
      const sent = await sendEmail(
        user.email,
        `venyou — ${userTasks.length} task${userTasks.length === 1 ? "" : "s"} due tomorrow`,
        `You have ${userTasks.length} task(s) due tomorrow.`,
        html
      );

      if (sent) emailsSent++;
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      totalTasks: tasks.length,
      usersNotified: Object.keys(tasksByUser).length,
    });
  } catch (error) {
    console.error("[cron/daily-reminders] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
