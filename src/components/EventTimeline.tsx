"use client";

import { useMemo, useState } from "react";
import { parseISO, differenceInDays, format, isToday } from "date-fns";

interface Task {
  id: string;
  name: string;
  phase: string;
  status: string;
  dueDate: string;
  assignedUser: { name: string } | null;
}

interface EventTimelineProps {
  eventDate: string;
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

const PHASE_COLORS: Record<string, string> = {
  Talent: "#a855f7",       // purple
  Promotion: "#ec4899",    // pink
  Production: "#06b6d4",   // cyan
  Transportation: "#f97316", // orange
  Crew: "#3b82f6",         // blue
  "Event Day": "#f59e0b",  // amber
  Strike: "#ef4444",       // red
  "Post-Event": "#22c55e", // green
};

const STATUS_FILL: Record<string, string> = {
  done: "full",
  skipped: "full",
  in_progress: "half",
  blocked: "blocked",
  not_started: "empty",
};

export default function EventTimeline({ eventDate, tasks, onTaskClick }: EventTimelineProps) {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);

  const timeline = useMemo(() => {
    const evDate = parseISO(eventDate);
    const today = new Date();
    const todayOffset = differenceInDays(today, evDate);

    // Group tasks by due date offset
    const tasksByOffset = new Map<number, Task[]>();
    let minOffset = 0;
    let maxOffset = 0;

    for (const task of tasks) {
      const dueDate = parseISO(task.dueDate);
      const offset = differenceInDays(dueDate, evDate);
      if (offset < minOffset) minOffset = offset;
      if (offset > maxOffset) maxOffset = offset;
      if (!tasksByOffset.has(offset)) tasksByOffset.set(offset, []);
      tasksByOffset.get(offset)!.push(task);
    }

    // Ensure today is visible
    if (todayOffset < minOffset) minOffset = todayOffset;
    if (todayOffset > maxOffset) maxOffset = todayOffset;

    // Add a little padding
    minOffset = Math.min(minOffset, -1);
    maxOffset = Math.max(maxOffset, 1);
    const range = maxOffset - minOffset || 1;

    // Build date markers for the axis
    const offsets = Array.from(tasksByOffset.keys()).sort((a, b) => a - b);

    return { evDate, today, todayOffset, tasksByOffset, minOffset, maxOffset, range, offsets };
  }, [eventDate, tasks]);

  const { todayOffset, tasksByOffset, minOffset, range, offsets } = timeline;

  function getX(offset: number): number {
    return ((offset - minOffset) / range) * 100;
  }

  return (
    <div data-ui="event-timeline" className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Event Timeline</h3>

      {/* Legend */}
      <div data-ui="timeline-legend" className="flex flex-wrap gap-3 mb-4">
        {Object.entries(PHASE_COLORS)
          .filter(([phase]) => tasks.some((t) => t.phase === phase))
          .map(([phase, color]) => (
            <div key={phase} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-zinc-500">{phase}</span>
            </div>
          ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 opacity-40" />
          <span className="text-xs text-zinc-600">Not started</span>
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 ml-2" style={{ background: "linear-gradient(90deg, #3b82f6 50%, transparent 50%)" }} />
          <span className="text-xs text-zinc-600">In progress</span>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 ml-2" />
          <span className="text-xs text-zinc-600">Done</span>
        </div>
      </div>

      {/* Timeline visualization */}
      <div data-ui="timeline-track" className="relative h-32 mt-2">
        {/* Horizontal axis */}
        <div className="absolute bottom-8 left-0 right-0 h-px bg-zinc-600" />

        {/* Today marker */}
        <div
          data-ui="timeline-today"
          className="absolute bottom-0 flex flex-col items-center z-10"
          style={{ left: `${getX(todayOffset)}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-px h-[calc(100%-8px)] bg-amber-500/60 absolute bottom-8" />
          <div className="absolute bottom-8 w-2 h-2 bg-amber-500 rotate-45 -translate-y-1/2" />
          <span className="absolute bottom-0 text-[10px] font-medium text-amber-500 whitespace-nowrap">
            TODAY
          </span>
        </div>

        {/* Event day marker */}
        <div
          data-ui="timeline-event-day"
          className="absolute bottom-0 flex flex-col items-center z-10"
          style={{ left: `${getX(0)}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-px h-[calc(100%-8px)] bg-zinc-400/40 absolute bottom-8 border-l border-dashed border-zinc-500" />
          <span className="absolute bottom-0 text-[10px] font-semibold text-zinc-400 whitespace-nowrap">
            EVENT
          </span>
        </div>

        {/* Task clusters */}
        {offsets.map((offset) => {
          const clusterTasks = tasksByOffset.get(offset)!;
          const x = getX(offset);
          const offsetLabel =
            offset === 0
              ? "Day of"
              : offset < 0
              ? `T${offset}`
              : `T+${offset}`;

          return (
            <div
              key={offset}
              data-ui="timeline-cluster"
              data-offset={offset}
              className="absolute bottom-0 top-0 flex flex-col items-center justify-end pb-10 cursor-pointer group/cluster"
              style={{ left: `${x}%`, transform: "translateX(-50%)", width: "2rem" }}
              onMouseEnter={() => setHoveredCluster(offset)}
              onMouseLeave={() => { setHoveredCluster(null); setHoveredTaskId(null); }}
            >
              {/* Stacked dots */}
              <div className="flex flex-col-reverse items-center gap-1 mb-0">
                {clusterTasks.map((task) => {
                  const color = PHASE_COLORS[task.phase] || "#71717a";
                  const fill = STATUS_FILL[task.status] || "empty";
                  const isDone = fill === "full";
                  const isHalf = fill === "half";
                  const isBlocked = fill === "blocked";

                  return (
                    <div
                      key={task.id}
                      data-ui="timeline-dot"
                      data-task-id={task.id}
                      onMouseEnter={() => setHoveredTaskId(task.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick?.(task.id);
                      }}
                      className={`relative w-3.5 h-3.5 rounded-full border-2 transition-all cursor-pointer ${
                        hoveredTaskId === task.id ? "scale-150 ring-2 ring-white/40" : "hover:scale-125"
                      }`}
                      style={{
                        borderColor: color,
                        backgroundColor: isDone
                          ? color
                          : isBlocked
                          ? "#ef4444"
                          : "transparent",
                        background: isHalf
                          ? `linear-gradient(90deg, ${color} 50%, transparent 50%)`
                          : isDone
                          ? color
                          : isBlocked
                          ? "#ef444480"
                          : "transparent",
                        opacity: fill === "empty" ? 0.5 : 1,
                      }}
                    />
                  );
                })}
              </div>

              {/* Offset label */}
              <span className="text-[9px] text-zinc-600 absolute bottom-2 whitespace-nowrap">
                {offsetLabel}
              </span>

              {/* Hover tooltip */}
              <div
                data-ui="timeline-tooltip"
                className={`absolute bottom-full mb-2 bg-zinc-900 border border-zinc-600 rounded-md px-3 py-2 text-xs text-zinc-300 whitespace-nowrap z-30 shadow-lg pointer-events-none transition-opacity duration-150 group-hover/cluster:visible group-hover/cluster:opacity-100 ${
                  hoveredCluster === offset ? "visible opacity-100" : "invisible opacity-0"
                }`}
                style={{
                  left: x < 15 ? 0 : x > 85 ? "auto" : "50%",
                  right: x > 85 ? 0 : "auto",
                  transform: x < 15 || x > 85 ? "none" : "translateX(-50%)",
                }}
              >
                <div className="font-semibold text-zinc-100 mb-1">
                  {offsetLabel} — {format(
                    new Date(
                      parseISO(clusterTasks[0].dueDate)
                    ),
                    "MMM d"
                  )}
                </div>
                {clusterTasks.map((t) => {
                  const isHighlighted = hoveredTaskId === t.id;
                  const phaseColor = PHASE_COLORS[t.phase] || "#71717a";
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-2 py-0.5 px-1.5 -mx-1.5 rounded transition-colors ${
                        isHighlighted ? "bg-white/10" : ""
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            isHighlighted || t.status === "done" || t.status === "skipped"
                              ? phaseColor
                              : "transparent",
                          borderWidth: 1,
                          borderColor: phaseColor,
                        }}
                      />
                      <span
                        className={`${
                          isHighlighted
                            ? "text-zinc-50 font-medium"
                            : t.status === "done"
                            ? "text-zinc-500 line-through"
                            : ""
                        }`}
                      >
                        {t.name}
                      </span>
                      <span className={`text-[10px] ${isHighlighted ? "text-amber-400" : "text-zinc-600"}`}>
                        {t.assignedUser ? t.assignedUser.name : "Unassigned"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
