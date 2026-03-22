import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageContacts } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await prisma.contact.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(contacts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageContacts(session.user.systemRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, phone, email, pocName, notes } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: { name, phone: phone || null, email: email || null, pocName: pocName || null, notes: notes || null },
  });

  return NextResponse.json(contact, { status: 201 });
}
