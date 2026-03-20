import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTemplates } from "@/lib/permissions";

export async function POST(
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

  const template = await prisma.eventTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json(
      { error: "Event template not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const {
    phase,
    name,
    description,
    sortOrder,
    dueOffsetDays,
    startOffsetDays,
    defaultRole,
    defaultAssigneeUserId,
    reminderEmail,
    reminderSms,
    reminderDaysBefore,
    reminderDayOf,
    conditions,
  } = body;

  if (!phase || !name) {
    return NextResponse.json(
      { error: "phase and name are required" },
      { status: 400 }
    );
  }

  const taskTemplate = await prisma.taskTemplate.create({
    data: {
      eventTemplateId: id,
      phase,
      name,
      description: description || null,
      sortOrder: sortOrder ?? 0,
      dueOffsetDays: dueOffsetDays ?? 0,
      startOffsetDays: startOffsetDays ?? null,
      defaultRole: defaultRole || null,
      defaultAssigneeUserId: defaultAssigneeUserId || null,
      reminderEmail: reminderEmail ?? false,
      reminderSms: reminderSms ?? false,
      reminderDaysBefore: reminderDaysBefore ?? null,
      reminderDayOf: reminderDayOf ?? false,
      conditions: conditions?.length
        ? {
            create: conditions.map(
              (c: { fieldName: string; operator: string; valueText: string }) => ({
                fieldName: c.fieldName,
                operator: c.operator,
                valueText: c.valueText,
              })
            ),
          }
        : undefined,
    },
    include: {
      conditions: true,
    },
  });

  return NextResponse.json(taskTemplate, { status: 201 });
}
