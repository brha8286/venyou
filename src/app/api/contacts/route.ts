import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await prisma.contact.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(contacts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { type, name, phone, email, pocName, pocPhone, pocEmail, notes } = body;

  if (!type || !name) {
    return NextResponse.json({ error: "type and name are required" }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: { type, name, phone: phone || null, email: email || null, pocName: pocName || null, pocPhone: pocPhone || null, pocEmail: pocEmail || null, notes: notes || null },
  });

  return NextResponse.json(contact, { status: 201 });
}
