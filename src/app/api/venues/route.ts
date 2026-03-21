import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageVenues } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(venues);
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
  const {
    name,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    isHomeVenue,
    notes,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const venue = await prisma.venue.create({
    data: {
      name,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      city: city || null,
      state: state || null,
      postalCode: postalCode || null,
      country: country || "US",
      isHomeVenue: isHomeVenue ?? false,
      notes: notes || null,
    },
  });

  return NextResponse.json(venue, { status: 201 });
}
