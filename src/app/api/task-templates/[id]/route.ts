import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTemplates } from "@/lib/permissions";

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

  const existing = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Task template not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const {
    conditions,
    ...fields
  } = body;

  const allowedFields = [
    "phase",
    "name",
    "description",
    "sortOrder",
    "dueOffsetDays",
    "startOffsetDays",
    "defaultRole",
    "defaultAssigneeUserId",
    "reminderEmail",
    "reminderSms",
    "reminderDaysBefore",
    "reminderDayOf",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in fields) {
      data[field] = fields[field];
    }
  }

  if (conditions !== undefined) {
    await prisma.taskTemplateCondition.deleteMany({
      where: { taskTemplateId: id },
    });

    if (conditions?.length) {
      data.conditions = {
        create: conditions.map(
          (c: { fieldName: string; operator: string; valueText: string }) => ({
            fieldName: c.fieldName,
            operator: c.operator,
            valueText: c.valueText,
          })
        ),
      };
    }
  }

  const taskTemplate = await prisma.taskTemplate.update({
    where: { id },
    data,
    include: {
      conditions: true,
    },
  });

  return NextResponse.json(taskTemplate);
}

export async function DELETE(
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

  const existing = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Task template not found" },
      { status: 404 }
    );
  }

  await prisma.taskTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
