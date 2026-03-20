"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO, isPast } from "date-fns";
import StatusBadge from "@/components/StatusBadge";
import PhaseBadge from "@/components/PhaseBadge";
import EventTimeline from "@/components/EventTimeline";
import { EVENT_ROLES } from "@/lib/roles";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "done" | "skipped";

interface User {
  id: string;
  name: string;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

interface Task {
  id: string;
  name: string;
  description: string | null;
  phase: string;
  status: TaskStatus;
  sortOrder: number;
  dueDate: string;
  startDate: string | null;
  assignedUserId: string | null;
  assignedUser: User | null;
  assignedRole: string | null;
  completedAt: string | null;
  isGenerated: boolean;
  comments?: Comment[];
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  isHomeVenue: boolean;
  transportRequired: boolean;
  coHosted: boolean;
  merchPresent: boolean;
  venue: { id: string; name: string } | null;
  eventTemplate: { id: string; name: string } | null;
  tasks: Task[];
  eventAssignments: Array<{
    id: string;
    eventRole: string;
    user: { id: string; name: string };
  }>;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
];

const EVENT_STATUS_OPTIONS = ["planning", "active", "completed", "cancelled"];

const eventStatusClasses: Record<string, string> = {
  planning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-500 border-zinc-500/30",
};

const PHASE_ORDER = [
  "Talent",
  "Promotion",
  "Production",
  "Transportation",
  "Crew",
  "Event Day",
  "Strike",
  "Post-Event",
];

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string) {
  try {
    return format(parseISO(dateStr), "h:mm a");
  } catch {
    return dateStr;
  }
}

function formatCommentDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d, h:mm a");
  } catch {
    return dateStr;
  }
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { data: session } = useSession();
  const [event, setEvent] = useState<EventData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [taskComments, setTaskComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskForm, setAddTaskForm] = useState({
    name: "",
    phase: "Production",
    dueDate: "",
    assignedUserId: "",
    description: "",
  });
  const [submittingTask, setSubmittingTask] = useState(false);
  const [editingRoles, setEditingRoles] = useState(false);
  const [roleEdits, setRoleEdits] = useState<Array<{ role: string; userId: string }>>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const isAdminOrManager =
    session?.user?.systemRole === "admin" ||
    session?.user?.systemRole === "manager";

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error("Failed to fetch event");
      const data = await res.json();
      setEvent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) setUsers(await res.json());
      } catch {
        // Non-critical
      }
    }
    fetchUsers();
  }, []);

  async function handleStatusChange(taskId: string, status: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchEvent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  async function handleAssigneeChange(taskId: string, assignedUserId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: assignedUserId || null }),
      });
      if (!res.ok) throw new Error("Failed to update assignee");
      await fetchEvent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update assignee");
    }
  }

  function startEditingRoles() {
    if (!event) return;
    // Build editable state from current assignments
    const edits: Array<{ role: string; userId: string }> = [];
    for (const roleDef of EVENT_ROLES) {
      const existing = event.eventAssignments.filter(
        (a) => a.eventRole === roleDef.value
      );
      edits.push({
        role: roleDef.value,
        userId: existing[0]?.user.id || "",
      });
    }
    setRoleEdits(edits);
    setEditingRoles(true);
  }

  async function saveRoles() {
    setSavingRoles(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleAssignments: roleEdits.filter((r) => r.userId),
        }),
      });
      if (!res.ok) throw new Error("Failed to update roles");
      setEditingRoles(false);
      await fetchEvent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save roles");
    } finally {
      setSavingRoles(false);
    }
  }

  async function handleDeleteEvent() {
    if (!confirm("Delete this event and all its tasks? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
      router.push("/events");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete event");
    }
  }

  async function handleEventStatusChange(status: string) {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update event status");
      await fetchEvent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update event");
    }
  }

  async function toggleTaskExpand(taskId: string) {
    const next = new Set(expandedTasks);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
      // Fetch comments if not already loaded
      if (!taskComments[taskId]) {
        try {
          const res = await fetch(`/api/tasks/${taskId}`);
          if (res.ok) {
            const taskData = await res.json();
            setTaskComments((prev) => ({
              ...prev,
              [taskId]: taskData.comments || [],
            }));
          }
        } catch {
          // Non-critical
        }
      }
    }
    setExpandedTasks(next);
  }

  function togglePhase(phase: string) {
    const next = new Set(collapsedPhases);
    if (next.has(phase)) {
      next.delete(phase);
    } else {
      next.add(phase);
    }
    setCollapsedPhases(next);
  }

  async function handleAddComment(taskId: string) {
    const body = commentInputs[taskId]?.trim();
    if (!body) return;

    setSubmittingComment(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      const comment = await res.json();
      setTaskComments((prev) => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), comment],
      }));
      setCommentInputs((prev) => ({ ...prev, [taskId]: "" }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmittingComment(null);
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingTask(true);
    try {
      // Create task via the tasks API — need to POST to event tasks
      // The tasks route doesn't support POST directly, so we use PATCH on event
      // Actually, let's create a task by posting to /api/tasks with eventId
      // Looking at the API, there's no POST /api/tasks. We'll need to create manually.
      // Instead, we can use a workaround: PATCH event won't help here.
      // Let's just call the tasks endpoint if it exists, or use a manual approach.
      // For now, we'll create a task via the Prisma-compatible approach through events.

      // Actually the simplest approach: we need a task creation endpoint.
      // Since only GET exists on /api/tasks, we'll simulate by calling a generic endpoint.
      // Let's just do a fetch to create it.
      const taskData = {
        eventId,
        name: addTaskForm.name,
        phase: addTaskForm.phase,
        dueDate: addTaskForm.dueDate,
        assignedUserId: addTaskForm.assignedUserId || null,
        description: addTaskForm.description || null,
        status: "not_started",
        isGenerated: false,
        sortOrder: 999,
      };

      // POST to a generic tasks creation - if this doesn't exist yet, we fall back
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create task");
      }

      setAddTaskForm({
        name: "",
        phase: "Production",
        dueDate: "",
        assignedUserId: "",
        description: "",
      });
      setShowAddTask(false);
      await fetchEvent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmittingTask(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-zinc-700 rounded w-1/3 mb-4" />
        <div className="h-4 bg-zinc-700 rounded w-1/4 mb-8" />
        <div className="h-4 bg-zinc-700 rounded w-full mb-3" />
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6">
          <div className="space-y-4">
            <div className="h-6 bg-zinc-700 rounded w-1/4" />
            <div className="h-4 bg-zinc-700 rounded w-full" />
            <div className="h-4 bg-zinc-700 rounded w-5/6" />
            <div className="h-4 bg-zinc-700 rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
        {error || "Event not found"}
      </div>
    );
  }

  // Group tasks by phase
  const tasksByPhase: Record<string, Task[]> = {};
  for (const task of event.tasks) {
    if (!tasksByPhase[task.phase]) tasksByPhase[task.phase] = [];
    tasksByPhase[task.phase].push(task);
  }

  // Sort phases
  const sortedPhases = Object.keys(tasksByPhase).sort(
    (a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b)
  );

  const totalTasks = event.tasks.length;
  const doneTasks = event.tasks.filter(
    (t) => t.status === "done" || t.status === "skipped"
  ).length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Flags
  const flags = [
    event.isHomeVenue && "Home Venue",
    event.transportRequired && "Transport Required",
    event.coHosted && "Co-hosted",
    event.merchPresent && "Merch Present",
  ].filter(Boolean);

  return (
    <div data-ui="event-detail-page">
      {/* Event Header */}
      <div data-ui="event-header" className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 data-ui="event-title" className="text-2xl font-bold text-zinc-100">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-sm text-zinc-400">
                {formatDate(event.eventDate)}
              </span>
              {event.startTime && (
                <span className="text-sm text-zinc-500">
                  {formatDateTime(event.startTime)}
                  {event.endTime && ` - ${formatDateTime(event.endTime)}`}
                </span>
              )}
              {event.venue && (
                <>
                  <span className="text-zinc-600">|</span>
                  <span className="text-sm text-zinc-400">
                    {event.venue.name}
                  </span>
                </>
              )}
              {event.eventTemplate && (
                <>
                  <span className="text-zinc-600">|</span>
                  <span className="text-sm text-zinc-500">
                    {event.eventTemplate.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminOrManager && (
              <select
                value={event.status}
                onChange={(e) => handleEventStatusChange(e.target.value)}
                data-ui="event-status-select"
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {EVENT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            )}
            {session?.user?.systemRole === "admin" && (
              <button
                onClick={handleDeleteEvent}
                data-ui="delete-event-btn"
                className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm rounded-md transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-3">
          <span
            className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${
              eventStatusClasses[event.status] ??
              "bg-zinc-600/20 text-zinc-400 border-zinc-600/30"
            }`}
          >
            {event.status}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div data-ui="task-progress" className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-300">
            Task Progress
          </span>
          <span className="text-sm text-zinc-400">
            {doneTasks} / {totalTasks} tasks ({progressPct}%)
          </span>
        </div>
        <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Event Timeline */}
      {event.tasks.length > 0 && (
        <EventTimeline
          eventDate={event.eventDate}
          tasks={event.tasks}
          onTaskClick={async (taskId) => {
            // Uncollapse the task's phase
            const task = event.tasks.find((t) => t.id === taskId);
            if (task) {
              setCollapsedPhases((prev) => {
                const next = new Set(prev);
                next.delete(task.phase);
                return next;
              });
            }

            // Always expand (not toggle)
            setExpandedTasks((prev) => {
              const next = new Set(prev);
              next.add(taskId);
              return next;
            });

            // Fetch comments if not already loaded
            if (!taskComments[taskId]) {
              try {
                const res = await fetch(`/api/tasks/${taskId}`);
                if (res.ok) {
                  const taskData = await res.json();
                  setTaskComments((prev) => ({
                    ...prev,
                    [taskId]: taskData.comments || [],
                  }));
                }
              } catch {
                // Non-critical
              }
            }

            // Scroll to the task row after rendering
            setTimeout(() => {
              const el = document.querySelector(`[data-ui="task-row"][data-task-id="${taskId}"]`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 150);
          }}
        />
      )}

      {/* Event Flags */}
      {flags.length > 0 && (
        <div data-ui="event-flags" className="flex flex-wrap gap-2 mb-6">
          {flags.map((flag) => (
            <span
              key={flag as string}
              className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Crew Roles */}
      <div
        data-ui="crew-section"
        className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
            Crew
          </h2>
          {isAdminOrManager && !editingRoles && (
            <button
              onClick={startEditingRoles}
              className="text-xs text-amber-500 hover:text-amber-400 font-medium transition-colors"
            >
              Edit Roles
            </button>
          )}
          {editingRoles && (
            <div className="flex items-center gap-2">
              <button
                onClick={saveRoles}
                disabled={savingRoles}
                className="px-3 py-1 text-xs font-medium bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 rounded transition-colors"
              >
                {savingRoles ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingRoles(false)}
                className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {!editingRoles ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {EVENT_ROLES.map((roleDef) => {
              const assignments = (event.eventAssignments || []).filter(
                (a) => a.eventRole === roleDef.value
              );

              return (
                <div key={roleDef.value} className="flex items-center gap-2 py-1">
                  <span className="text-xs font-medium text-amber-500 min-w-[130px] shrink-0">
                    {roleDef.label}
                  </span>
                  {assignments.length > 0 ? (
                    <span className="text-sm text-zinc-100">
                      {assignments.map((a) => a.user.name).join(", ")}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-600 italic">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {EVENT_ROLES.map((roleDef) => {
              const idx = roleEdits.findIndex((r) => r.role === roleDef.value);
              return (
                <div key={roleDef.value}>
                  <label className="block text-xs font-medium text-amber-500 mb-1">
                    {roleDef.label}
                  </label>
                  <select
                    value={idx >= 0 ? roleEdits[idx].userId : ""}
                    onChange={(e) => {
                      const next = [...roleEdits];
                      if (idx >= 0) {
                        next[idx] = { role: roleDef.value, userId: e.target.value };
                      } else {
                        next.push({ role: roleDef.value, userId: e.target.value });
                      }
                      setRoleEdits(next);
                    }}
                    className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  >
                    <option value="">Select...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
          <p className="text-sm text-zinc-400">{event.description}</p>
        </div>
      )}

      {/* Tasks by Phase */}
      <div data-ui="tasks-section" className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Tasks</h2>
          {isAdminOrManager && (
            <button
              onClick={() => setShowAddTask(!showAddTask)}
              data-ui="add-task-btn"
              className="px-3 py-1.5 text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-md transition-colors"
            >
              {showAddTask ? "Cancel" : "+ Add Task"}
            </button>
          )}
        </div>

        {/* Add Task Form */}
        {showAddTask && (
          <form
            onSubmit={handleAddTask}
            data-ui="add-task-form"
            className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  required
                  value={addTaskForm.name}
                  onChange={(e) =>
                    setAddTaskForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Task name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Phase *
                </label>
                <select
                  value={addTaskForm.phase}
                  onChange={(e) =>
                    setAddTaskForm((p) => ({ ...p, phase: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {PHASE_ORDER.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={addTaskForm.dueDate}
                  onChange={(e) =>
                    setAddTaskForm((p) => ({ ...p, dueDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Assignee
                </label>
                <select
                  value={addTaskForm.assignedUserId}
                  onChange={(e) =>
                    setAddTaskForm((p) => ({
                      ...p,
                      assignedUserId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Description
              </label>
              <textarea
                value={addTaskForm.description}
                onChange={(e) =>
                  setAddTaskForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-vertical"
                placeholder="Optional description..."
              />
            </div>
            <button
              type="submit"
              disabled={submittingTask}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 font-semibold text-sm rounded-md transition-colors"
            >
              {submittingTask ? "Adding..." : "Add Task"}
            </button>
          </form>
        )}

        {/* Phase Sections */}
        {sortedPhases.length === 0 ? (
          <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 text-center">
            <p className="text-zinc-500">No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPhases.map((phase) => {
              const tasks = tasksByPhase[phase];
              const phaseDone = tasks.filter(
                (t) => t.status === "done" || t.status === "skipped"
              ).length;
              const isCollapsed = collapsedPhases.has(phase);

              return (
                <div
                  key={phase}
                  data-ui="phase-section"
                  data-phase={phase}
                  className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
                >
                  {/* Phase Header */}
                  <button
                    onClick={() => togglePhase(phase)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className={`w-4 h-4 text-zinc-500 transition-transform ${
                          isCollapsed ? "" : "rotate-90"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <PhaseBadge phase={phase as "Talent" | "Promotion" | "Production" | "Transportation" | "Crew" | "Event Day" | "Strike" | "Post-Event"} />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {phaseDone}/{tasks.length} done
                    </span>
                  </button>

                  {/* Tasks List */}
                  {!isCollapsed && (
                    <div className="divide-y divide-zinc-700/50">
                      {tasks.map((task) => {
                        const isOverdue =
                          task.dueDate &&
                          isPast(parseISO(task.dueDate)) &&
                          task.status !== "done" &&
                          task.status !== "skipped";
                        const isExpanded = expandedTasks.has(task.id);
                        const comments = taskComments[task.id] || [];

                        return (
                          <div key={task.id} data-ui="task-row" data-task-id={task.id} className="px-4 py-3">
                            {/* Task Row */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleTaskExpand(task.id)}
                                className="flex-1 text-left min-w-0"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-sm font-medium ${
                                      task.status === "done"
                                        ? "text-zinc-500 line-through"
                                        : "text-zinc-100"
                                    }`}
                                  >
                                    {task.name}
                                  </span>
                                  <StatusBadge status={task.status} />
                                  {isOverdue && (
                                    <span className="text-xs font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                      OVERDUE
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`text-xs ${
                                      isOverdue
                                        ? "text-red-400"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    Due {formatDate(task.dueDate)}
                                  </span>
                                  {task.assignedUser && (
                                    <>
                                      <span className="text-zinc-700">|</span>
                                      <span className="text-xs text-zinc-500">
                                        {task.assignedUser.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </button>

                              {/* Quick Status Dropdown */}
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  handleStatusChange(task.id, e.target.value)
                                }
                                data-ui="task-status-select"
                                className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>

                              {/* Assignee label (derived from role) */}
                              {task.assignedUser && (
                                <span className="px-2 py-1 text-xs text-zinc-400">
                                  {task.assignedUser.name}
                                </span>
                              )}
                            </div>

                            {/* Expanded Section */}
                            {isExpanded && (
                              <div data-ui="task-detail" className="mt-3 ml-0 pl-3 border-l-2 border-amber-500/30">
                                {/* Task Info */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-xs">
                                  <div>
                                    <span className="text-zinc-500 block">Status</span>
                                    <StatusBadge status={task.status} />
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block">Due</span>
                                    <span className={`font-medium ${isOverdue ? "text-red-400" : "text-zinc-200"}`}>
                                      {formatDate(task.dueDate)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block">Assignee</span>
                                    <span className="text-zinc-200 font-medium">
                                      {task.assignedUser?.name || "Unassigned"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block">Role</span>
                                    <span className="text-zinc-200 font-medium">
                                      {task.assignedRole || "—"}
                                    </span>
                                  </div>
                                </div>

                                {/* Description */}
                                {task.description && (
                                  <p className="text-sm text-zinc-400 mb-3">
                                    {task.description}
                                  </p>
                                )}

                                {/* Comments */}
                                <div className="mb-3">
                                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                                    Comments
                                  </h4>
                                  {comments.length === 0 ? (
                                    <p className="text-xs text-zinc-600">
                                      No comments yet
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {comments.map((comment) => (
                                        <div
                                          key={comment.id}
                                          className="p-2 bg-zinc-900/50 rounded border border-zinc-700/50"
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-zinc-300">
                                              {comment.author.name}
                                            </span>
                                            <span className="text-xs text-zinc-600">
                                              {formatCommentDate(
                                                comment.createdAt
                                              )}
                                            </span>
                                          </div>
                                          <p className="text-sm text-zinc-400">
                                            {comment.body}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Add Comment Form */}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    data-ui="comment-input"
                                    value={commentInputs[task.id] || ""}
                                    onChange={(e) =>
                                      setCommentInputs((prev) => ({
                                        ...prev,
                                        [task.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddComment(task.id);
                                      }
                                    }}
                                    className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                                  />
                                  <button
                                    onClick={() => handleAddComment(task.id)}
                                    disabled={
                                      submittingComment === task.id ||
                                      !commentInputs[task.id]?.trim()
                                    }
                                    data-ui="comment-submit"
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-medium text-xs rounded transition-colors"
                                  >
                                    {submittingComment === task.id
                                      ? "..."
                                      : "Post"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
