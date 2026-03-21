import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications";
import { buildWeeklyDigestEmail } from "@/lib/email-templates";

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
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        emailEnabled: true,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://plan.subculture.audio";
    let emailsSent = 0;

    for (const user of users) {
      const tasks = await prisma.task.findMany({
        where: {
          assignedUserId: user.id,
          dueDate: {
            gte: now,
            lte: nextWeek,
          },
          status: {
            notIn: ["done", "skipped"],
          },
        },
        include: {
          event: true,
        },
        orderBy: { dueDate: "asc" },
      });

      if (tasks.length === 0) continue;

      const taskData = tasks.map((t) => ({
        name: t.name,
        eventTitle: t.event.title,
        dueDate: t.dueDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        status: t.status,
        phase: t.phase,
      }));

      const html = buildWeeklyDigestEmail(user.name, taskData, appUrl);
      const sent = await sendEmail(
        user.email,
        "venyou — Weekly Task Summary",
        `You have ${tasks.length} task(s) due this week.`,
        html
      );

      if (sent) emailsSent++;
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      usersChecked: users.length,
    });
  } catch (error) {
    console.error("[cron/weekly-digest] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
