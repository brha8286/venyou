"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_ROLES } from "@/lib/roles";

interface EventTemplate {
  id: string;
  name: string;
  description: string | null;
  _count?: { taskTemplates: number };
}

interface Venue {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  isHomeVenue: boolean;
}

interface User {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
  pocName: string | null;
}

export default function NewEventPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleAssignments, setRoleAssignments] = useState<
    Array<{ role: string; userId: string }>
  >(() => EVENT_ROLES.map((r) => ({ role: r.value, userId: "" })));

  const [form, setForm] = useState({
    title: "",
    eventTemplateId: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    venueId: "",
    clientId: "",
    isHomeVenue: false,
    transportRequired: false,
    coHosted: false,
    merchPresent: false,
    description: "",
  });

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [tplRes, venueRes, usersRes, contactsRes] = await Promise.all([
          fetch("/api/event-templates"),
          fetch("/api/venues"),
          fetch("/api/users"),
          fetch("/api/contacts"),
        ]);
        if (!tplRes.ok || !venueRes.ok || !usersRes.ok)
          throw new Error("Failed to load form data");
        setTemplates(await tplRes.json());
        setVenues(await venueRes.json());
        setUsers(await usersRes.json());
        if (contactsRes.ok) {
          const all = await contactsRes.json();
          setClients(all.filter((c: { type: string }) => c.type === "client"));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const target = e.target;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        title: form.title,
        eventTemplateId: form.eventTemplateId,
        eventDate: form.eventDate,
        isHomeVenue: form.isHomeVenue,
        transportRequired: form.transportRequired,
        coHosted: form.coHosted,
        merchPresent: form.merchPresent,
        roleAssignments: roleAssignments.filter((ra) => ra.userId),
      };

      if (form.venueId) body.venueId = form.venueId;
      if (form.clientId) body.clientId = form.clientId;
      if (form.description) body.description = form.description;
      if (form.startTime) {
        body.startTime = `${form.eventDate}T${form.startTime}:00`;
      }
      if (form.endTime) {
        body.endTime = `${form.eventDate}T${form.endTime}:00`;
      }

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create event");
      }

      router.push(`/events/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-6">
          Create New Event
        </h1>
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 animate-pulse">
          <div className="space-y-6">
            <div className="h-10 bg-zinc-700 rounded w-full" />
            <div className="h-10 bg-zinc-700 rounded w-full" />
            <div className="h-10 bg-zinc-700 rounded w-1/2" />
            <div className="h-10 bg-zinc-700 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-ui="create-event-page">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Create New Event
      </h1>

      <form
        onSubmit={handleSubmit}
        data-ui="create-event-form"
        className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 max-w-2xl"
      >
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Event Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={form.title}
              onChange={handleChange}
              data-ui="event-title-input"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              placeholder="e.g. Full Moon Rave - March"
            />
          </div>

          {/* Event Template */}
          <div>
            <label
              htmlFor="eventTemplateId"
              className="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Event Template *
            </label>
            <select
              id="eventTemplateId"
              name="eventTemplateId"
              required
              value={form.eventTemplateId}
              onChange={handleChange}
              data-ui="event-template-select"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            >
              <option value="">Select a template...</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                  {tpl._count
                    ? ` (${tpl._count.taskTemplates} tasks)`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="eventDate"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Event Date *
              </label>
              <input
                type="date"
                id="eventDate"
                name="eventDate"
                required
                value={form.eventDate}
                onChange={handleChange}
                data-ui="event-date-input"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
            <div>
              <label
                htmlFor="startTime"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                data-ui="event-start-time"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
            <div>
              <label
                htmlFor="endTime"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                End Time
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                data-ui="event-end-time"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label
              htmlFor="venueId"
              className="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Venue
            </label>
            <select
              id="venueId"
              name="venueId"
              value={form.venueId}
              onChange={handleChange}
              data-ui="event-venue-select"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            >
              <option value="">Select a venue...</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.city ? `, ${v.city}` : ""}
                  {v.isHomeVenue ? " (Home)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Client
            </label>
            <select
              id="clientId"
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              data-ui="event-client-select"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.pocName ? ` — ${c.pocName}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "isHomeVenue", label: "Home venue", ui: "flag-home-venue" },
              { name: "transportRequired", label: "Transport required", ui: "flag-transport" },
              { name: "coHosted", label: "Co-hosted", ui: "flag-co-hosted" },
              { name: "merchPresent", label: "Merch present", ui: "flag-merch" },
            ].map((cb) => (
              <label
                key={cb.name}
                className="flex items-center gap-2.5 p-3 bg-zinc-900/50 rounded-md border border-zinc-700/50 cursor-pointer hover:bg-zinc-900 transition-colors"
              >
                <input
                  type="checkbox"
                  name={cb.name}
                  checked={form[cb.name as keyof typeof form] as boolean}
                  onChange={handleChange}
                  data-ui={cb.ui}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-amber-500 focus:ring-amber-500/50 focus:ring-offset-0"
                />
                <span className="text-sm text-zinc-300">{cb.label}</span>
              </label>
            ))}
          </div>

          {/* Crew Roles */}
          <div data-ui="crew-roles-section">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">
              Crew Roles
            </h3>
            <div className="space-y-3">
              {EVENT_ROLES.map((roleDef) => {
                const idx = roleAssignments.findIndex(
                  (ra) => ra.role === roleDef.value
                );
                return (
                  <div key={roleDef.value}>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      {roleDef.label}{" "}
                      {roleDef.required && (
                        <span className="text-amber-500">*</span>
                      )}
                      {"hint" in roleDef && roleDef.hint && (
                        <span className="text-xs text-zinc-500 ml-1">({roleDef.hint})</span>
                      )}
                    </label>
                    <select
                      value={idx >= 0 ? roleAssignments[idx].userId : ""}
                      onChange={(e) => {
                        const next = [...roleAssignments];
                        if (idx >= 0) {
                          next[idx] = {
                            role: roleDef.value,
                            userId: e.target.value,
                          };
                        } else {
                          next.push({
                            role: roleDef.value,
                            userId: e.target.value,
                          });
                        }
                        setRoleAssignments(next);
                      }}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    >
                      <option value="">Select person...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Notes
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              data-ui="event-notes"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-vertical"
              placeholder="Any additional notes for this event..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-zinc-700">
          <button
            type="submit"
            disabled={submitting}
            data-ui="create-event-submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-md transition-colors"
          >
            {submitting ? "Creating..." : "Create Event"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium text-sm rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
