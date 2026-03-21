"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import PhaseBadge from "@/components/PhaseBadge";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "done" | "skipped";

interface Task {
  id: string;
  name: string;
  description: string | null;
  phase: string;
  status: TaskStatus;
  dueDate: string;
  startDate: string | null;
  sortOrder: number;
  eventId: string;
  assignedUserId: string | null;
  completedAt: string | null;
  event: { title: string };
  assignedUser: { id: string; name: string } | null;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string };
}

type FilterTab = "overdue" | "today" | "week" | "all" | "completed";

const tabs: { key: FilterTab; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due Today" },
  { key: "week", label: "Next 7 Days" },
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
];

const allStatuses: TaskStatus[] = ["not_started", "in_progress", "blocked", "done", "skipped"];

function isOverdue(task: Task): boolean {
  if (task.status === "done" || task.status === "skipped") return false;
  const [y, m, d] = task.dueDate.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d) < new Date(new Date().toDateString());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === "overdue") params.set("overdue", "true");
      if (activeTab === "today") params.set("upcoming", "0");
      if (activeTab === "week") params.set("upcoming", "7");
      if (activeTab === "completed") params.set("status", "done");

      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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

  const toggleExpand = async (taskId: string) => {
    if (expandedId === taskId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(taskId);
    if (!comments[taskId]) {
      setCommentLoading(taskId);
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (res.ok) {
          const data = await res.json();
          setComments((prev) => ({ ...prev, [taskId]: data.comments || [] }));
        }
      } finally {
        setCommentLoading(null);
      }
    }
  };

  const addComment = async (taskId: string) => {
    if (!newComment.trim()) return;
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), comment],
      }));
      setNewComment("");
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "today") {
      const today = new Date().toDateString();
      const [y, m, d] = task.dueDate.split("T")[0].split("-").map(Number);
      return new Date(y, m - 1, d).toDateString() === today;
    }
    return true; // API already filters for other tabs
  });

  return (
    <div className="space-y-6" data-ui="my-tasks-page">
      <h1 className="text-2xl font-bold text-zinc-100">My Tasks</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg overflow-x-auto" data-ui="tasks-filter-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-zinc-800 text-amber-500"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          No tasks found for this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              data-ui="task-card"
              data-task-id={task.id}
              className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden"
            >
              {/* Task card header */}
              <div
                className="p-4 cursor-pointer hover:bg-zinc-750"
                onClick={() => toggleExpand(task.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-zinc-100">
                        {task.name}
                      </h3>
                      <PhaseBadge phase={task.phase as any} />
                      <StatusBadge status={task.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
                      <Link
                        href={`/events/${task.eventId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-amber-500 hover:text-amber-400 hover:underline"
                      >
                        {task.event.title}
                      </Link>
                      <span
                        className={
                          isOverdue(task) ? "text-red-400 font-medium" : ""
                        }
                      >
                        Due: {formatDate(task.dueDate)}
                        {isOverdue(task) && " (overdue)"}
                      </span>
                      {task.assignedUser && (
                        <span>Assigned: {task.assignedUser.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Status dropdown */}
                  <select
                    data-ui="task-status-select"
                    value={task.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateStatus(task.id, e.target.value as TaskStatus);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={updatingId === task.id}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expanded section */}
              {expandedId === task.id && (
                <div className="border-t border-zinc-700 p-4 bg-zinc-850">
                  {task.description && (
                    <p className="text-sm text-zinc-300 mb-4">
                      {task.description}
                    </p>
                  )}

                  {/* Comments */}
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Comments
                    </h4>
                    {commentLoading === task.id ? (
                      <p className="text-xs text-zinc-500">
                        Loading comments...
                      </p>
                    ) : (
                      <>
                        {(comments[task.id] || []).length === 0 ? (
                          <p className="text-xs text-zinc-500 mb-2">
                            No comments yet.
                          </p>
                        ) : (
                          <div className="space-y-2 mb-3">
                            {(comments[task.id] || []).map((c) => (
                              <div
                                key={c.id}
                                className="bg-zinc-900 rounded p-2 text-sm"
                              >
                                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                  <span className="font-medium text-zinc-300">
                                    {c.author.name}
                                  </span>
                                  <span>
                                    {new Date(c.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-zinc-200">{c.body}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addComment(task.id);
                            }}
                            placeholder="Add a comment..."
                            className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-1.5 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            onClick={() => addComment(task.id)}
                            className="px-3 py-1.5 bg-amber-500 text-zinc-950 text-sm font-medium rounded-md hover:bg-amber-400 transition-colors"
                          >
                            Post
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
