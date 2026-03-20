"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import StatusBadge from "@/components/StatusBadge";
import PhaseBadge from "@/components/PhaseBadge";

interface Event {
  id: string;
  title: string;
  eventDate: string;
  status: string;
  venue: { name: string } | null;
}

interface Task {
  id: string;
  name: string;
  phase: string;
  status: string;
  dueDate: string;
  eventId: string;
  event: { title: string };
  assignedUser: { id: string; name: string } | null;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, tasksRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/tasks"),
      ]);
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.eventDate), day));

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => isSameDay(new Date(t.dueDate), day));

  const getTaskStatusCounts = (dayTasks: Task[]) => {
    const counts: Record<string, number> = {};
    for (const t of dayTasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  };

  const statusDotColor: Record<string, string> = {
    not_started: "bg-zinc-400",
    in_progress: "bg-blue-400",
    blocked: "bg-red-400",
    done: "bg-green-400",
    skipped: "bg-zinc-500",
  };

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const selectedTasks = selectedDate ? getTasksForDay(selectedDate) : [];

  return (
    <div className="space-y-6" data-ui="calendar-page">
      <h1 className="text-2xl font-bold text-zinc-100">Calendar</h1>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          data-ui="calendar-prev"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md hover:bg-zinc-700 transition-colors"
        >
          Prev
        </button>
        <h2 className="text-lg font-semibold text-zinc-100" data-ui="calendar-month-title">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          data-ui="calendar-next"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md hover:bg-zinc-700 transition-colors"
        >
          Next
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar grid */}
          <div className="flex-1">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-zinc-500 py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-zinc-700 rounded-lg overflow-hidden" data-ui="calendar-grid">
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const dayTasks = getTasksForDay(day);
                const statusCounts = getTaskStatusCounts(dayTasks);
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const selected =
                  selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    data-ui="calendar-day"
                    data-date={format(day, "yyyy-MM-dd")}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[80px] p-1.5 text-left transition-colors ${
                      selected
                        ? "bg-zinc-700"
                        : "bg-zinc-800 hover:bg-zinc-750"
                    } ${!inMonth ? "opacity-40" : ""}`}
                  >
                    <div
                      className={`text-xs font-medium mb-1 ${
                        today
                          ? "text-amber-500 font-bold"
                          : "text-zinc-300"
                      }`}
                    >
                      {format(day, "d")}
                    </div>

                    {/* Event labels */}
                    {dayEvents.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className="text-[10px] truncate bg-amber-500/20 text-amber-400 rounded px-1 py-0.5 mb-0.5"
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-zinc-500">
                        +{dayEvents.length - 2} more
                      </div>
                    )}

                    {/* Task status dots */}
                    {dayTasks.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {Object.entries(statusCounts).map(
                          ([status, count]) => (
                            <div
                              key={status}
                              className="flex items-center gap-0.5"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  statusDotColor[status] || "bg-zinc-400"
                                }`}
                              />
                              <span className="text-[10px] text-zinc-400">
                                {count}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side panel - selected day details */}
          <div className="lg:w-80 shrink-0" data-ui="calendar-day-detail">
            {selectedDate ? (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-zinc-100 mb-3">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </h3>

                {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    Nothing scheduled for this day.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Events */}
                    {selectedEvents.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Events
                        </h4>
                        <div className="space-y-2">
                          {selectedEvents.map((evt) => (
                            <Link
                              key={evt.id}
                              href={`/events/${evt.id}`}
                              className="block bg-zinc-900 rounded-md p-2.5 hover:bg-zinc-850 transition-colors"
                            >
                              <p className="text-sm font-medium text-amber-500">
                                {evt.title}
                              </p>
                              {evt.venue && (
                                <p className="text-xs text-zinc-500 mt-0.5">
                                  {evt.venue.name}
                                </p>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tasks */}
                    {selectedTasks.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Tasks Due
                        </h4>
                        <div className="space-y-2">
                          {selectedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="bg-zinc-900 rounded-md p-2.5"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-zinc-100 truncate">
                                  {task.name}
                                </p>
                                <StatusBadge status={task.status as any} />
                              </div>
                              <div className="flex items-center gap-2">
                                <PhaseBadge phase={task.phase as any} />
                                <Link
                                  href={`/events/${task.eventId}`}
                                  className="text-xs text-amber-500 hover:underline truncate"
                                >
                                  {task.event.title}
                                </Link>
                              </div>
                              {task.assignedUser && (
                                <p className="text-xs text-zinc-500 mt-1">
                                  {task.assignedUser.name}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <p className="text-xs text-zinc-500">
                  Select a day to see details.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
