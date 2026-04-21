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

  const images = await prisma.galleryImage.findMany({
    where: { isPublic: true },
    orderBy: [{ sortOrder: "asc" }, { uploadedAt: "desc" }],
    select: {
      id: true,
      url: true,
      alt: true,
      caption: true,
      width: true,
      height: true,
    },
  });

  return NextResponse.json({ images }, { headers: publicApiHeaders() });
}
