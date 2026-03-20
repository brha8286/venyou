"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

interface Event {
  id: string;
  title: string;
  eventDate: string;
  status: string;
  venue?: { id: string; name: string } | null;
  eventTemplate?: { id: string; name: string } | null;
  _count?: { tasks: number };
  tasks?: { id: string; status: string }[];
}

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Planning", value: "planning" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const statusBadgeClasses: Record<string, string> = {
  planning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-500 border-zinc-500/30",
};

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="h-4 bg-zinc-700 rounded w-1/4" />
      <div className="h-4 bg-zinc-700 rounded w-1/6" />
      <div className="h-4 bg-zinc-700 rounded w-1/6" />
      <div className="h-4 bg-zinc-700 rounded w-1/6" />
      <div className="h-4 bg-zinc-700 rounded w-1/8" />
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { done: number; total: number }>>({});
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error("Failed to fetch events");
        const data = await res.json();
        setEvents(data);

        // Fetch tasks to compute progress per event
        const tasksRes = await fetch("/api/tasks");
        if (tasksRes.ok) {
          const tasks: { eventId: string; status: string }[] = await tasksRes.json();
          const counts: Record<string, { done: number; total: number }> = {};
          for (const task of tasks) {
            if (!counts[task.eventId]) {
              counts[task.eventId] = { done: 0, total: 0 };
            }
            counts[task.eventId].total++;
            if (task.status === "done" || task.status === "skipped") {
              counts[task.eventId].done++;
            }
          }
          setTaskCounts(counts);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const filteredEvents =
    activeTab === "all"
      ? events
      : events.filter((e) => e.status === activeTab);

  return (
    <div data-ui="events-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Events</h1>
        <Link
          href="/events/new"
          data-ui="new-event-btn"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-sm rounded-md transition-colors"
        >
          New Event
        </Link>
      </div>

      {/* Tab Filters */}
      <div data-ui="events-filter-tabs" className="flex gap-1 mb-6 border-b border-zinc-800 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? events.length
              : events.filter((e) => e.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.value
                  ? "border-amber-500 text-amber-500"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-zinc-500">({count})</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">No events found</p>
        </div>
      ) : (
        <div data-ui="events-list" className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 bg-zinc-900/50 border-b border-zinc-700 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            <div className="col-span-3">Title</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Venue</div>
            <div className="col-span-2">Template</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Progress</div>
          </div>

          {/* Rows */}
          {filteredEvents.map((event) => {
            const progress = taskCounts[event.id];
            const progressPct =
              progress && progress.total > 0
                ? Math.round((progress.done / progress.total) * 100)
                : 0;
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                data-ui="event-row"
                className="block sm:grid sm:grid-cols-12 gap-4 px-4 py-3.5 border-b border-zinc-700/50 last:border-b-0 hover:bg-zinc-700/30 transition-colors"
              >
                <div className="col-span-3">
                  <p className="text-sm font-medium text-zinc-100">
                    {event.title}
                  </p>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-zinc-400">
                    {formatDate(event.eventDate)}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-zinc-400">
                    {event.venue?.name ?? "TBD"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-zinc-500">
                    {event.eventTemplate?.name ?? "-"}
                  </span>
                </div>
                <div className="col-span-1 flex items-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${
                      statusBadgeClasses[event.status] ??
                      "bg-zinc-600/20 text-zinc-400 border-zinc-600/30"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {progress ? (
                    <>
                      <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {progress.done}/{progress.total}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-600">-</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
