import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    endpoints: [
      {
        path: "/api/cron/daily-reminders",
        method: "POST",
        schedule: "Every day 8am CT",
        description:
          "Per-user daily summary: past-due tasks + upcoming 7 days. Email only.",
      },
      {
        path: "/api/cron/notifications",
        method: "POST",
        schedule: "Every 15 minutes",
        description: "Drains pending TaskNotification records.",
      },
    ],
  });
}
