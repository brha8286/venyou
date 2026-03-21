import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/notifications";
import { buildDailyReminderEmail } from "@/lib/email-templates";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://venyou.subculture.audio";

  const html = buildDailyReminderEmail(session.user.name, [
    {
      name: "Test Task — Soundcheck",
      eventTitle: "Test Event",
      eventId: "test-123",
      dueDate: new Date().toISOString(),
      status: "not_started",
      phase: "Event Day",
    },
    {
      name: "Test Task — Load-in",
      eventTitle: "Test Event",
      eventId: "test-123",
      dueDate: new Date().toISOString(),
      status: "not_started",
      phase: "Event Day",
    },
  ], appUrl);

  const sent = await sendEmail(session.user.email, "venyou — Test Email", "", html);

  return NextResponse.json({
    sent,
    to: session.user.email,
    message: sent ? "Check your inbox" : "Email not configured — check RESEND_API_KEY or SMTP settings",
  });
}
