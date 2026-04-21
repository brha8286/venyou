import { NextResponse } from "next/server";

const rateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // requests per window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimit.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  recent.push(now);
  rateLimit.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export function publicApiHeaders(): HeadersInit {
  const origin = process.env.PUBLIC_SITE_ORIGIN ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=30",
  };
}

export function handlePreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: publicApiHeaders() });
}

export function rateLimitCheck(
  ip: string | null
): NextResponse | null {
  if (ip && isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: publicApiHeaders() }
    );
  }
  return null;
}
