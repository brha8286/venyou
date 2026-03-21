import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    endpoints: [
      {
        path: "/api/cron/weekly-digest",
        method: "POST",
        schedule: "Every Monday 9am",
      },
      {
        path: "/api/cron/daily-reminders",
        method: "POST",
        schedule: "Every day 9am",
      },
      {
        path: "/api/cron/notifications",
        method: "POST",
        schedule: "Every 15 minutes",
      },
    ],
  });
}
