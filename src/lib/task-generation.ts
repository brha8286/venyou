import { prisma } from "./prisma";
import { addDays } from "date-fns";

interface EventConditionFields {
  is_home_venue: boolean;
  transport_required: boolean;
  co_hosted: boolean;
  merch_present: boolean;
}

function getEventFieldValue(
  event: EventConditionFields,
  fieldName: string
): string {
  const value = event[fieldName as keyof EventConditionFields];
  return String(value);
}

function evaluateConditions(
  conditions: { fieldName: string; operator: string; valueText: string }[],
  event: EventConditionFields
): boolean {
  if (conditions.length === 0) return true;

  return conditions.every((condition) => {
    const eventValue = getEventFieldValue(event, condition.fieldName);
    if (condition.operator === "eq") {
      return eventValue === condition.valueText;
    }
    return false;
  });
}

export async function generateTasksForEvent(eventId: string) {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      eventTemplate: {
        include: {
          taskTemplates: {
            where: { isActive: true },
            include: { conditions: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      eventAssignments: true,
    },
  });

  // Build a map from eventRole to userId(s) for role-based auto-assignment
  const roleAssignmentMap = new Map<string, string[]>();
  for (const assignment of event.eventAssignments) {
    const existing = roleAssignmentMap.get(assignment.eventRole) || [];
    existing.push(assignment.userId);
    roleAssignmentMap.set(assignment.eventRole, existing);
  }

  const conditionFields: EventConditionFields = {
    is_home_venue: event.isHomeVenue,
    transport_required: event.transportRequired,
    co_hosted: event.coHosted,
    merch_present: event.merchPresent,
  };

  const createdTasks = [];

  for (const template of event.eventTemplate.taskTemplates) {
    const conditionsMatch = evaluateConditions(
      template.conditions,
      conditionFields
    );

    if (!conditionsMatch) continue;

    const dueDate = addDays(event.eventDate, template.dueOffsetDays);
    const startDate =
      template.startOffsetDays != null
        ? addDays(event.eventDate, template.startOffsetDays)
        : null;

    // Determine assignee: explicit template assignee takes priority,
    // then fall back to role-based auto-assignment from event assignments
    let assignedUserId = template.defaultAssigneeUserId;
    if (!assignedUserId && template.defaultRole) {
      const roleUsers = roleAssignmentMap.get(template.defaultRole);
      if (roleUsers && roleUsers.length > 0) {
        // For multi-assignee roles (e.g. "hands"), pick the first available user
        assignedUserId = roleUsers[0];
      }
    }

    const task = await prisma.task.create({
      data: {
        eventId: event.id,
        taskTemplateId: template.id,
        phase: template.phase,
        name: template.name,
        description: template.description,
        sortOrder: template.sortOrder,
        assignedRole: template.defaultRole,
        assignedUserId,
        dueDate,
        startDate,
        status: "not_started",
        isGenerated: true,
      },
    });

    createdTasks.push(task);

    // Generate notifications for this task (use the resolved assignee)
    await generateNotificationsForTask(task.id, template, event.eventDate, assignedUserId);
  }

  return createdTasks;
}

async function generateNotificationsForTask(
  taskId: string,
  template: {
    reminderEmail: boolean;
    reminderSms: boolean;
    reminderDaysBefore: number;
    reminderDayOf: boolean;
    dueOffsetDays: number;
    defaultAssigneeUserId: string | null;
  },
  eventDate: Date,
  resolvedAssigneeUserId: string | null = null
) {
  const assignedUserId = resolvedAssigneeUserId ?? template.defaultAssigneeUserId;
  if (!assignedUserId) return;

  const dueDate = addDays(eventDate, template.dueOffsetDays);
  const channels: string[] = [];
  if (template.reminderEmail) channels.push("email");
  if (template.reminderSms) channels.push("sms");

  if (channels.length === 0) return;

  const notifications: {
    taskId: string;
    userId: string;
    channel: string;
    notificationType: string;
    scheduledFor: Date;
  }[] = [];

  for (const channel of channels) {
    // Reminder days before due date
    if (template.reminderDaysBefore > 0) {
      const reminderDate = addDays(dueDate, -template.reminderDaysBefore);
      notifications.push({
        taskId,
        userId: assignedUserId,
        channel,
        notificationType: "due_soon",
        scheduledFor: reminderDate,
      });
    }

    // Reminder on due date
    if (template.reminderDayOf) {
      notifications.push({
        taskId,
        userId: assignedUserId,
        channel,
        notificationType: "due_today",
        scheduledFor: dueDate,
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.taskNotification.createMany({
      data: notifications,
    });
  }
}
