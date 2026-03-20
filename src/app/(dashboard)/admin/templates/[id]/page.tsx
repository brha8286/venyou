"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import PhaseBadge from "@/components/PhaseBadge";

const PHASES = [
  "Talent",
  "Promotion",
  "Production",
  "Transportation",
  "Crew",
  "Event Day",
  "Strike",
  "Post-Event",
];

const CONDITION_FIELDS = [
  { value: "is_home_venue", label: "Is Home Venue" },
  { value: "transport_required", label: "Transport Required" },
  { value: "co_hosted", label: "Co-Hosted" },
  { value: "merch_present", label: "Merch Present" },
];

interface Condition {
  id?: string;
  fieldName: string;
  operator: string;
  valueText: string;
}

interface TaskTemplate {
  id: string;
  phase: string;
  name: string;
  description: string | null;
  sortOrder: number;
  dueOffsetDays: number;
  startOffsetDays: number | null;
  defaultRole: string | null;
  defaultAssigneeUserId: string | null;
  reminderEmail: boolean;
  reminderSms: boolean;
  reminderDaysBefore: number;
  reminderDayOf: boolean;
  conditions: Condition[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  taskTemplates: TaskTemplate[];
}

interface User {
  id: string;
  name: string;
}

const emptyTaskForm = (): TaskFormData => ({
  phase: "Production",
  name: "",
  description: "",
  sortOrder: 0,
  dueOffsetDays: 0,
  startOffsetDays: "",
  defaultRole: "",
  defaultAssigneeUserId: "",
  reminderEmail: true,
  reminderSms: false,
  reminderDaysBefore: 1,
  reminderDayOf: true,
  conditions: [],
});

interface TaskFormData {
  phase: string;
  name: string;
  description: string;
  sortOrder: number;
  dueOffsetDays: number;
  startOffsetDays: number | string;
  defaultRole: string;
  defaultAssigneeUserId: string;
  reminderEmail: boolean;
  reminderSms: boolean;
  reminderDaysBefore: number;
  reminderDayOf: boolean;
  conditions: Condition[];
}

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Template info form
  const [infoName, setInfoName] = useState("");
  const [infoDescription, setInfoDescription] = useState("");
  const [infoActive, setInfoActive] = useState(true);

  // Edit modal
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskFormData>(emptyTaskForm());

  // Add task form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<TaskFormData>(emptyTaskForm());
  const [addingTask, setAddingTask] = useState(false);

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch(`/api/event-templates/${templateId}`);
      if (!res.ok) {
        if (res.status === 404) router.push("/admin/templates");
        return;
      }
      const data = await res.json();
      setTemplate(data);
      setInfoName(data.name);
      setInfoDescription(data.description || "");
      setInfoActive(data.isActive);
    } finally {
      setLoading(false);
    }
  }, [templateId, router]);

  useEffect(() => {
    fetchTemplate();
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => {});
  }, [fetchTemplate]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const saveTemplateInfo = async () => {
    clearMessages();
    setSaving(true);
    try {
      const res = await fetch(`/api/event-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: infoName.trim(),
          description: infoDescription.trim() || null,
          isActive: infoActive,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
        setSuccess("Template info saved.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (tt: TaskTemplate) => {
    setEditingTask(tt.id);
    setEditForm({
      phase: tt.phase,
      name: tt.name,
      description: tt.description || "",
      sortOrder: tt.sortOrder,
      dueOffsetDays: tt.dueOffsetDays,
      startOffsetDays: tt.startOffsetDays ?? "",
      defaultRole: tt.defaultRole || "",
      defaultAssigneeUserId: tt.defaultAssigneeUserId || "",
      reminderEmail: tt.reminderEmail,
      reminderSms: tt.reminderSms,
      reminderDaysBefore: tt.reminderDaysBefore,
      reminderDayOf: tt.reminderDayOf,
      conditions: tt.conditions.map((c) => ({
        fieldName: c.fieldName,
        operator: c.operator,
        valueText: c.valueText,
      })),
    });
  };

  const saveEdit = async () => {
    if (!editingTask) return;
    clearMessages();
    setSaving(true);
    try {
      const payload = {
        phase: editForm.phase,
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        sortOrder: editForm.sortOrder,
        dueOffsetDays: editForm.dueOffsetDays,
        startOffsetDays:
          editForm.startOffsetDays === ""
            ? null
            : Number(editForm.startOffsetDays),
        defaultRole: editForm.defaultRole.trim() || null,
        defaultAssigneeUserId: editForm.defaultAssigneeUserId || null,
        reminderEmail: editForm.reminderEmail,
        reminderSms: editForm.reminderSms,
        reminderDaysBefore: editForm.reminderDaysBefore,
        reminderDayOf: editForm.reminderDayOf,
        conditions: editForm.conditions,
      };

      const res = await fetch(`/api/task-templates/${editingTask}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingTask(null);
        await fetchTemplate();
        setSuccess("Task template updated.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save task template.");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteTaskTemplate = async (ttId: string) => {
    if (!confirm("Delete this task template?")) return;
    clearMessages();
    const res = await fetch(`/api/task-templates/${ttId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchTemplate();
      setSuccess("Task template deleted.");
    } else {
      setError("Failed to delete task template.");
    }
  };

  const addTaskTemplate = async () => {
    clearMessages();
    setAddingTask(true);
    try {
      const payload = {
        phase: addForm.phase,
        name: addForm.name.trim(),
        description: addForm.description.trim() || null,
        sortOrder: addForm.sortOrder,
        dueOffsetDays: addForm.dueOffsetDays,
        startOffsetDays:
          addForm.startOffsetDays === ""
            ? null
            : Number(addForm.startOffsetDays),
        defaultRole: addForm.defaultRole.trim() || null,
        defaultAssigneeUserId: addForm.defaultAssigneeUserId || null,
        reminderEmail: addForm.reminderEmail,
        reminderSms: addForm.reminderSms,
        reminderDaysBefore: addForm.reminderDaysBefore,
        reminderDayOf: addForm.reminderDayOf,
        conditions: addForm.conditions,
      };

      const res = await fetch(
        `/api/event-templates/${templateId}/task-templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setShowAddForm(false);
        setAddForm(emptyTaskForm());
        await fetchTemplate();
        setSuccess("Task template added.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add task template.");
      }
    } finally {
      setAddingTask(false);
    }
  };

  // Group task templates by phase
  const groupedByPhase = template
    ? PHASES.map((phase) => ({
        phase,
        tasks: template.taskTemplates.filter((tt) => tt.phase === phase),
      })).filter((g) => g.tasks.length > 0)
    : [];

  // Render the task template form (shared between edit modal and add form)
  const renderTaskForm = (
    form: TaskFormData,
    setForm: (f: TaskFormData) => void
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Phase
          </label>
          <select
            value={form.phase}
            onChange={(e) => setForm({ ...form, phase: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Sort Order
          </label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
            }
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Due Offset (days)
          </label>
          <input
            type="number"
            value={form.dueOffsetDays}
            onChange={(e) =>
              setForm({
                ...form,
                dueOffsetDays: parseInt(e.target.value) || 0,
              })
            }
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Negative = before event
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Start Offset (days)
          </label>
          <input
            type="number"
            value={form.startOffsetDays}
            onChange={(e) =>
              setForm({
                ...form,
                startOffsetDays: e.target.value === "" ? "" : parseInt(e.target.value),
              })
            }
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Default Role
          </label>
          <input
            type="text"
            value={form.defaultRole}
            onChange={(e) =>
              setForm({ ...form, defaultRole: e.target.value })
            }
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="e.g. sound_tech"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">
          Default Assignee
        </label>
        <select
          value={form.defaultAssigneeUserId}
          onChange={(e) =>
            setForm({ ...form, defaultAssigneeUserId: e.target.value })
          }
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">None</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Reminder settings */}
      <div className="bg-zinc-900 rounded-md p-3 space-y-2">
        <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Reminders
        </h5>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.reminderEmail}
              onChange={(e) =>
                setForm({ ...form, reminderEmail: e.target.checked })
              }
              className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
            />
            Email
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.reminderSms}
              onChange={(e) =>
                setForm({ ...form, reminderSms: e.target.checked })
              }
              className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
            />
            SMS
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.reminderDayOf}
              onChange={(e) =>
                setForm({ ...form, reminderDayOf: e.target.checked })
              }
              className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
            />
            Day of
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-300">Days before:</label>
            <input
              type="number"
              value={form.reminderDaysBefore}
              onChange={(e) =>
                setForm({
                  ...form,
                  reminderDaysBefore: parseInt(e.target.value) || 0,
                })
              }
              min={0}
              className="w-16 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="bg-zinc-900 rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Conditions
          </h5>
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                conditions: [
                  ...form.conditions,
                  { fieldName: "is_home_venue", operator: "eq", valueText: "true" },
                ],
              })
            }
            className="text-xs text-amber-500 hover:text-amber-400"
          >
            + Add Condition
          </button>
        </div>
        {form.conditions.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No conditions (task always created).
          </p>
        ) : (
          <div className="space-y-2">
            {form.conditions.map((cond, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={cond.fieldName}
                  onChange={(e) => {
                    const updated = [...form.conditions];
                    updated[idx] = { ...updated[idx], fieldName: e.target.value };
                    setForm({ ...form, conditions: updated });
                  }}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {CONDITION_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-zinc-500">equals</span>
                <select
                  value={cond.valueText}
                  onChange={(e) => {
                    const updated = [...form.conditions];
                    updated[idx] = { ...updated[idx], valueText: e.target.value };
                    setForm({ ...form, conditions: updated });
                  }}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const updated = form.conditions.filter(
                      (_, i) => i !== idx
                    );
                    setForm({ ...form, conditions: updated });
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="space-y-6" data-ui="template-editor-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/templates")}
          className="text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-zinc-100">
          {template.name}
        </h1>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-md px-4 py-3">
          {success}
        </div>
      )}

      {/* Section 1: Template Info */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4" data-ui="template-info">
        <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">
          Template Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Name
            </label>
            <input
              type="text"
              data-ui="template-name-input"
              value={infoName}
              onChange={(e) => setInfoName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={infoActive}
                onChange={(e) => setInfoActive(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
              />
              Active
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Description
          </label>
          <textarea
            value={infoDescription}
            onChange={(e) => setInfoDescription(e.target.value)}
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
          />
        </div>
        <button
          data-ui="save-template-btn"
          onClick={saveTemplateInfo}
          disabled={saving}
          className="px-4 py-2 bg-amber-500 text-zinc-950 text-sm font-medium rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Info"}
        </button>
      </div>

      {/* Section 2: Task Templates by Phase */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">
            Task Templates
          </h2>
          <button
            onClick={() => {
              setShowAddForm(true);
              setAddForm(emptyTaskForm());
            }}
            className="px-3 py-1.5 bg-amber-500 text-zinc-950 text-xs font-medium rounded-md hover:bg-amber-400 transition-colors"
          >
            + Add Task Template
          </button>
        </div>

        {groupedByPhase.length === 0 && !showAddForm ? (
          <div className="text-center py-8 text-zinc-500 bg-zinc-800 border border-zinc-700 rounded-lg">
            No task templates yet. Add one to get started.
          </div>
        ) : (
          groupedByPhase.map((group) => (
            <div
              key={group.phase}
              data-ui="template-phase-group"
              data-phase={group.phase}
              className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden"
            >
              {/* Phase header */}
              <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhaseBadge phase={group.phase as any} />
                  <span className="text-xs text-zinc-500">
                    {group.tasks.length} task
                    {group.tasks.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Task rows */}
              <div className="divide-y divide-zinc-700/50">
                {group.tasks.map((tt) => (
                  <div key={tt.id} data-ui="task-template-row" data-task-template-id={tt.id}>
                    {editingTask === tt.id ? (
                      /* Inline edit form */
                      <div className="p-4 bg-zinc-850 space-y-4">
                        {renderTaskForm(editForm, setEditForm)}
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="px-3 py-1.5 bg-amber-500 text-zinc-950 text-xs font-medium rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingTask(null)}
                            className="px-3 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded-md hover:bg-zinc-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display row */
                      <div className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-zinc-100">
                              {tt.name}
                            </p>
                            {tt.conditions.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                conditional
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                            <span>T{tt.dueOffsetDays >= 0 ? "+" : ""}{tt.dueOffsetDays} days</span>
                            {tt.defaultRole && (
                              <span>Role: {tt.defaultRole}</span>
                            )}
                            <span>Order: {tt.sortOrder}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => startEdit(tt)}
                            className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTaskTemplate(tt.id)}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Add Task Template Form */}
        {showAddForm && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4" data-ui="add-task-template">
            <h3 className="text-sm font-semibold text-zinc-100">
              New Task Template
            </h3>
            {renderTaskForm(addForm, setAddForm)}
            <div className="flex gap-2">
              <button
                onClick={addTaskTemplate}
                disabled={addingTask || !addForm.name.trim()}
                className="px-4 py-2 bg-amber-500 text-zinc-950 text-sm font-medium rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {addingTask ? "Adding..." : "Add Task Template"}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-zinc-700 text-zinc-300 text-sm rounded-md hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
