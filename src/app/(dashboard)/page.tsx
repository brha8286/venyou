"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format, isPast, parseISO } from "date-fns";
import StatusBadge from "@/components/StatusBadge";

interface Event {
  id: string;
  title: string;
  eventDate: string;
  status: string;
  venue?: { id: string; name: string } | null;
  _count?: { tasks: number };
}

interface Task {
  id: string;
  name: string;
  phase: string;
  status: string;
  dueDate: string;
  assignedUserId: string | null;
  assignedUser: { id: string; name: string } | null;
  event: { title: string };
  eventId: string;
}

function SkeletonCard() {
  return (
    <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-5 animate-pulse">
      <div className="h-5 bg-zinc-700 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-zinc-700 rounded w-full" />
        <div className="h-4 bg-zinc-700 rounded w-5/6" />
        <div className="h-4 bg-zinc-700 rounded w-4/6" />
      </div>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
      {count}
    </span>
  );
}

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [weekTasks, setWeekTasks] = useState<Task[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    async function fetchData() {
      try {
        const [eventsRes, overdueRes, weekRes, allTasksRes] = await Promise.all(
          [
            fetch("/api/events?status=planning"),
            fetch("/api/tasks?overdue=true"),
            fetch("/api/tasks?upcoming=7"),
            fetch("/api/tasks"),
          ]
        );

        if (!eventsRes.ok || !overdueRes.ok || !weekRes.ok || !allTasksRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [events, overdue, week, allTasks] = await Promise.all([
          eventsRes.json(),
          overdueRes.json(),
          weekRes.json(),
          allTasksRes.json(),
        ]);

        setUpcomingEvents(events.slice(0, 5));
        setOverdueTasks(overdue);
        setWeekTasks(week);
        setUnassignedTasks(
          allTasks.filter((t: Task) => !t.assignedUserId && t.status !== "done" && t.status !== "skipped")
        );
        setMyTasks(
          allTasks.filter(
            (t: Task) =>
              t.assignedUserId === session?.user?.id &&
              t.status !== "done" &&
              t.status !== "skipped"
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-6">Dashboard</h1>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div data-ui="dashboard-page">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div data-ui="widget-upcoming-events" className="bg-zinc-800 rounded-lg border border-zinc-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Upcoming Events
            </h2>
            <CountBadge count={upcomingEvents.length} />
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-zinc-500">No upcoming events</p>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="block p-3 rounded-md bg-zinc-900/50 hover:bg-zinc-900 transition-colors border border-zinc-700/50"
                  >
                    <p className="text-sm font-medium text-zinc-100">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-400">
                        {formatDate(event.eventDate)}
                      </span>
                      {event.venue && (
                        <>
                          <span className="text-zinc-600">|</span>
                          <span className="text-xs text-zinc-500">
                            {event.venue.name}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 capitalize">
                      {event.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/events"
            className="block mt-4 text-xs text-amber-500 hover:text-amber-400 font-medium"
          >
            View all events &rarr;
          </Link>
        </div>

        {/* Overdue Tasks */}
        <div data-ui="widget-overdue-tasks" className="bg-zinc-800 rounded-lg border border-red-500/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
              Overdue Tasks
            </h2>
            <CountBadge count={overdueTasks.length} />
          </div>
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No overdue tasks</p>
          ) : (
            <ul className="space-y-3">
              {overdueTasks.slice(0, 5).map((task) => (
                <li
                  key={task.id}
                  className="p-3 rounded-md bg-red-500/5 border border-red-500/20"
                >
                  <Link
                    href={`/events/${task.eventId}`}
                    className="block hover:opacity-80 transition-opacity"
                  >
                    <p className="text-sm font-medium text-zinc-100">
                      {task.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {task.event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-red-400 font-medium">
                        Due {formatDate(task.dueDate)}
                      </span>
                      {task.assignedUser && (
                        <>
                          <span className="text-zinc-600">|</span>
                          <span className="text-xs text-zinc-500">
                            {task.assignedUser.name}
                          </span>
                        </>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tasks Due This Week */}
        <div data-ui="widget-week-tasks" className="bg-zinc-800 rounded-lg border border-zinc-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Due This Week
            </h2>
            <CountBadge count={weekTasks.length} />
          </div>
          {weekTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No tasks due this week</p>
          ) : (
            <ul className="space-y-3">
              {weekTasks.slice(0, 5).map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/events/${task.eventId}`}
                    className="block p-3 rounded-md bg-zinc-900/50 hover:bg-zinc-900 transition-colors border border-zinc-700/50"
                  >
                    <p className="text-sm font-medium text-zinc-100">
                      {task.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {task.event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-zinc-400">
                        Due {formatDate(task.dueDate)}
                      </span>
                      <StatusBadge status={task.status as "not_started" | "in_progress" | "blocked" | "done" | "skipped"} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Unassigned Tasks */}
        <div data-ui="widget-unassigned-tasks" className="bg-zinc-800 rounded-lg border border-zinc-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Unassigned Tasks
            </h2>
            <CountBadge count={unassignedTasks.length} />
          </div>
          {unassignedTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">All tasks assigned</p>
          ) : (
            <ul className="space-y-3">
              {unassignedTasks.slice(0, 5).map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/events/${task.eventId}`}
                    className="block p-3 rounded-md bg-zinc-900/50 hover:bg-zinc-900 transition-colors border border-zinc-700/50"
                  >
                    <p className="text-sm font-medium text-zinc-100">
                      {task.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {task.event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-zinc-400">{task.phase}</span>
                      <StatusBadge status={task.status as "not_started" | "in_progress" | "blocked" | "done" | "skipped"} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* My Tasks */}
        <div data-ui="widget-my-tasks" className="bg-zinc-800 rounded-lg border border-amber-500/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
              My Tasks
            </h2>
            <CountBadge count={myTasks.length} />
          </div>
          {myTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No tasks assigned to you</p>
          ) : (
            <ul className="space-y-3">
              {myTasks.slice(0, 5).map((task) => {
                const isOverdue =
                  task.dueDate &&
                  isPast(parseISO(task.dueDate)) &&
                  task.status !== "done" &&
                  task.status !== "skipped";
                return (
                  <li key={task.id}>
                    <Link
                      href={`/events/${task.eventId}`}
                      className={`block p-3 rounded-md transition-colors border ${
                        isOverdue
                          ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                          : "bg-zinc-900/50 border-zinc-700/50 hover:bg-zinc-900"
                      }`}
                    >
                      <p className="text-sm font-medium text-zinc-100">
                        {task.name}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {task.event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-xs font-medium ${
                            isOverdue ? "text-red-400" : "text-zinc-400"
                          }`}
                        >
                          Due {formatDate(task.dueDate)}
                        </span>
                        <StatusBadge status={task.status as "not_started" | "in_progress" | "blocked" | "done" | "skipped"} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
