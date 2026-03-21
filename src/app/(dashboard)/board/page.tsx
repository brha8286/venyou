"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import PhaseBadge from "@/components/PhaseBadge";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "done" | "skipped";

interface Event {
  id: string;
  title: string;
}

interface Task {
  id: string;
  name: string;
  phase: string;
  status: TaskStatus;
  dueDate: string;
  eventId: string;
  event: { title: string };
  assignedUser: { id: string; name: string } | null;
}

const columns: { status: TaskStatus; label: string; accent: string }[] = [
  { status: "not_started", label: "Not Started", accent: "border-t-zinc-500" },
  { status: "in_progress", label: "In Progress", accent: "border-t-blue-500" },
  { status: "blocked", label: "Blocked", accent: "border-t-red-500" },
  { status: "done", label: "Done", accent: "border-t-green-500" },
];

const allStatuses: TaskStatus[] = ["not_started", "in_progress", "blocked", "done", "skipped"];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (task.status === "done" || task.status === "skipped") return false;
  const [y, m, d] = task.dueDate.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d) < new Date(new Date().toDateString());
}

export default function BoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEventId, setFilterEventId] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [tasksRes, eventsRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/events"),
        ]);
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (eventsRes.ok) setEvents(await eventsRes.json());
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const updateStatus = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTasks = filterEventId
    ? tasks.filter((t) => t.eventId === filterEventId)
    : tasks;

  const grouped = columns.map((col) => ({
    ...col,
    tasks: filteredTasks.filter((t) => t.status === col.status),
  }));

  return (
    <div className="space-y-6" data-ui="board-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-zinc-100">Board</h1>

        {/* Event filter */}
        <select
          data-ui="board-event-filter"
          value={filterEventId}
          onChange={(e) => setFilterEventId(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">All Events</option>
          {events.map((evt) => (
            <option key={evt.id} value={evt.id}>
              {evt.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {grouped.map((col) => (
            <div key={col.status} className="flex flex-col" data-ui="board-column" data-status={col.status}>
              {/* Column header */}
              <div
                className={`bg-zinc-800 border border-zinc-700 border-t-2 ${col.accent} rounded-t-lg px-4 py-3`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-100">
                    {col.label}
                  </h2>
                  <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">
                    {col.tasks.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 bg-zinc-900/50 border-x border-b border-zinc-700 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                {col.tasks.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-8">
                    No tasks
                  </p>
                ) : (
                  col.tasks.map((task) => (
                    <div
                      key={task.id}
                      data-ui="board-card"
                      data-task-id={task.id}
                      className="bg-zinc-800 border border-zinc-700 rounded-md p-3 space-y-2"
                    >
                      <p className="text-sm font-medium text-zinc-100">
                        {task.name}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <PhaseBadge phase={task.phase as any} />
                        <span
                          className={`text-xs ${
                            isOverdue(task)
                              ? "text-red-400 font-medium"
                              : "text-zinc-400"
                          }`}
                        >
                          {formatDate(task.dueDate)}
                          {isOverdue(task) && " (overdue)"}
                        </span>
                      </div>

                      <Link
                        href={`/events/${task.eventId}`}
                        className="text-xs text-amber-500 hover:text-amber-400 hover:underline block truncate"
                      >
                        {task.event.title}
                      </Link>

                      {task.assignedUser && (
                        <p className="text-xs text-zinc-500">
                          {task.assignedUser.name}
                        </p>
                      )}

                      {/* Status change buttons */}
                      <div className="flex gap-1 pt-1 border-t border-zinc-700 flex-wrap">
                        {allStatuses
                          .filter((s) => s !== task.status)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() => updateStatus(task.id, s)}
                              disabled={updatingId === task.id}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-600 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-50"
                            >
                              {s.replace(/_/g, " ")}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
