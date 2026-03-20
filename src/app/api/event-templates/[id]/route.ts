import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTemplates } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const template = await prisma.eventTemplate.findUnique({
    where: { id },
    include: {
      taskTemplates: {
        include: {
          conditions: true,
        },
        orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(template);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.systemRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.eventTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if ("name" in body) data.name = body.name;
  if ("description" in body) data.description = body.description;
  if ("isActive" in body) data.isActive = body.isActive;

  const template = await prisma.eventTemplate.update({
    where: { id },
    data,
    include: {
      taskTemplates: {
        include: { conditions: true },
        orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  return NextResponse.json(template);
}
