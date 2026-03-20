import { NextRequest, NextResponse } from "next/server";
import { sendPendingNotifications } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const { searchParams } = request.nextUrl;
  const querySecret = searchParams.get("secret");

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const providedSecret =
    authHeader?.replace("Bearer ", "") || querySecret;

  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await sendPendingNotifications();

  return NextResponse.json({ success: true, processed: count });
}
