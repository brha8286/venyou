export type SystemRole = "admin" | "manager" | "crew";

export function isAdmin(role: string): boolean {
  return role === "admin";
}

export function canManageTemplates(role: string): boolean {
  return role === "admin";
}

export function canManageUsers(role: string): boolean {
  return role === "admin";
}

export function canCreateEvent(role: string): boolean {
  return role === "admin" || role === "manager";
}

export function canAssignTasks(role: string): boolean {
  return role === "admin" || role === "manager";
}

export function canViewAllEvents(role: string): boolean {
  return role === "admin" || role === "manager";
}
