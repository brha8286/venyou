"use client";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "done" | "skipped";

const statusConfig: Record<TaskStatus, { label: string; classes: string }> = {
  not_started: {
    label: "Not Started",
    classes: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30",
  },
  in_progress: {
    label: "In Progress",
    classes: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  blocked: {
    label: "Blocked",
    classes: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  done: {
    label: "Done",
    classes: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  skipped: {
    label: "Skipped",
    classes: "bg-zinc-500/20 text-zinc-500 border-zinc-500/30",
  },
};

interface StatusBadgeProps {
  status: TaskStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      data-ui="status-badge"
      data-status={status}
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
