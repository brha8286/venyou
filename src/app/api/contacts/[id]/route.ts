import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { type, name, phone, email, pocName, pocPhone, pocEmail, notes } = body;

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(type !== undefined && { type }),
      ...(name !== undefined && { name }),
      phone: phone || null,
      email: email || null,
      pocName: pocName || null,
      pocPhone: pocPhone || null,
      pocEmail: pocEmail || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(contact);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.contact.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
