import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageVenues } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const images = await prisma.galleryImage.findMany({
    orderBy: [{ sortOrder: "asc" }, { uploadedAt: "desc" }],
  });

  return NextResponse.json(images);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageVenues(session.user.systemRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { url, alt, caption } = body;

  if (!url) {
    return NextResponse.json(
      { error: "url is required" },
      { status: 400 }
    );
  }

  const maxSort = await prisma.galleryImage.aggregate({
    _max: { sortOrder: true },
  });

  const image = await prisma.galleryImage.create({
    data: {
      url,
      key: url,
      alt: alt || null,
      caption: caption || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(image, { status: 201 });
}
