import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicApiHeaders, handlePreflight, rateLimitCheck } from "../cors";

export async function OPTIONS() {
  return handlePreflight();
}

export async function GET(request: NextRequest) {
  const limited = rateLimitCheck(
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? null
  );
  if (limited) return limited;

  const events = await prisma.event.findMany({
    where: {
      isPublic: true,
      eventDate: { gte: new Date() },
      status: { notIn: ["cancelled"] },
    },
    orderBy: { eventDate: "asc" },
    include: {
      venue: { select: { name: true, city: true, state: true } },
    },
  });

  const result = events.map((e) => ({
    id: e.id,
    title: e.publicTitle ?? e.title,
    description: e.publicDescription ?? e.description,
    eventDate: e.eventDate,
    startTime: e.startTime,
    endTime: e.endTime,
    ticketUrl: e.ticketUrl,
    flyerUrl: e.flyerUrl,
    venue: e.venue
      ? { name: e.venue.name, city: e.venue.city, state: e.venue.state }
      : null,
  }));

  return NextResponse.json({ events: result }, { headers: publicApiHeaders() });
}
