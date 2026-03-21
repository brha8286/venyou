export const EVENT_ROLES = [
  { value: "event_manager", label: "Event Manager", required: true, maxAssignees: 1 },
  { value: "technical_lead", label: "Technical Lead (A1)", required: true, maxAssignees: 1 },
  { value: "a2", label: "A2", required: false, maxAssignees: 1 },
  { value: "marketing_lead", label: "Marketing Lead", required: true, maxAssignees: 1 },
  { value: "driver", label: "Transportation Lead", required: false, maxAssignees: 1 },
] as const;

export type EventRoleValue = typeof EVENT_ROLES[number]["value"];
