import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications";
import {
  buildDailySummaryEmail,
  type SummaryTask,
} from "@/lib/email-templates";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

const UPCOMING_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDueDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const upcomingEnd = new Date(todayStart);
    upcomingEnd.setDate(upcomingEnd.getDate() + UPCOMING_DAYS);
    upcomingEnd.setHours(23, 59, 59, 999);

    // Fetch everything open for any assigned user up through the upcoming window.
    // Past-due = dueDate < todayStart; upcoming = todayStart <= dueDate <= upcomingEnd.
    const tasks = await prisma.task.findMany({
      where: {
        assignedUserId: { not: null },
        status: { notIn: ["done", "skipped"] },
        dueDate: { lte: upcomingEnd },
      },
      include: {
        event: true,
        assignedUser: true,
      },
      orderBy: { dueDate: "asc" },
    });

    // Bucket per user into pastDue / upcoming.
    type Buckets = { pastDue: SummaryTask[]; upcoming: SummaryTask[] };
    const byUser = new Map<string, { user: (typeof tasks)[number]["assignedUser"]; buckets: Buckets }>();

    for (const task of tasks) {
      const user = task.assignedUser;
      if (!user || !user.isActive || !user.emailEnabled) continue;

      const summary: SummaryTask = {
        name: task.name,
        eventTitle: task.event.title,
        dueDate: formatDueDate(task.dueDate),
        status: task.status,
        phase: task.phase,
        eventId: task.eventId,
      };

      let bucket = byUser.get(user.id);
      if (!bucket) {
        bucket = { user, buckets: { pastDue: [], upcoming: [] } };
        byUser.set(user.id, bucket);
      }

      if (task.dueDate < todayStart) {
        summary.daysOverdue = Math.max(
          1,
          Math.floor((todayStart.getTime() - task.dueDate.getTime()) / MS_PER_DAY)
        );
        bucket.buckets.pastDue.push(summary);
      } else {
        bucket.buckets.upcoming.push(summary);
      }
    }

    // Past due should sort oldest-first (most stale at the top).
    for (const { buckets } of byUser.values()) {
      buckets.pastDue.sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://venyou.subculture.audio";
    let emailsSent = 0;

    for (const { user, buckets } of byUser.values()) {
      if (!user) continue;

      const subjectParts: string[] = [];
      if (buckets.pastDue.length > 0) {
        subjectParts.push(`${buckets.pastDue.length} past due`);
      }
      if (buckets.upcoming.length > 0) {
        subjectParts.push(`${buckets.upcoming.length} upcoming`);
      }
      const subject = `venyou — ${subjectParts.join(", ")}`;

      const textLines: string[] = [];
      if (buckets.pastDue.length > 0) {
        textLines.push(`Past due (${buckets.pastDue.length}):`);
        for (const t of buckets.pastDue) {
          textLines.push(`  • ${t.name} (${t.eventTitle}) — ${t.daysOverdue}d overdue`);
        }
      }
      if (buckets.upcoming.length > 0) {
        if (textLines.length > 0) textLines.push("");
        textLines.push(`Upcoming (${buckets.upcoming.length}):`);
        for (const t of buckets.upcoming) {
          textLines.push(`  • ${t.name} (${t.eventTitle}) — ${t.dueDate}`);
        }
      }

      const html = buildDailySummaryEmail(
        user.name,
        buckets.pastDue,
        buckets.upcoming,
        appUrl
      );
      const sent = await sendEmail(user.email, subject, textLines.join("\n"), html);
      if (sent) emailsSent++;
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      usersNotified: byUser.size,
      totalTasks: tasks.length,
    });
  } catch (error) {
    console.error("[cron/daily-reminders] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
