import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (canManageUsers(session.user.systemRole)) {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // Remove password hashes from response
    const sanitized = users.map(({ passwordHash, ...user }) => user);
    return NextResponse.json(sanitized);
  }

  // Crew gets minimal list for assignment dropdowns
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.systemRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, phone, systemRole, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "name, email, and password are required" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      systemRole: systemRole || "crew",
      passwordHash,
    },
  });

  const { passwordHash: _, ...sanitized } = user;
  return NextResponse.json(sanitized, { status: 201 });
}
