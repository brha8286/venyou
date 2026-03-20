"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  systemRole: string;
  isActive: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

interface UserForm {
  name: string;
  email: string;
  phone: string;
  systemRole: string;
  password: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  isActive: boolean;
}

const emptyForm = (): UserForm => ({
  name: "",
  email: "",
  phone: "",
  systemRole: "crew",
  password: "",
  emailEnabled: true,
  smsEnabled: false,
  isActive: true,
});

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add user
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<UserForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Edit user
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserForm>(emptyForm());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const createUser = async () => {
    clearMessages();
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password) {
      setError("Name, email, and password are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim() || null,
          systemRole: addForm.systemRole,
          password: addForm.password,
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setAddForm(emptyForm());
        await fetchUsers();
        setSuccess("User created.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create user.");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      systemRole: user.systemRole,
      password: "",
      emailEnabled: user.emailEnabled,
      smsEnabled: user.smsEnabled,
      isActive: user.isActive,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    clearMessages();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        systemRole: editForm.systemRole,
        emailEnabled: editForm.emailEnabled,
        smsEnabled: editForm.smsEnabled,
        isActive: editForm.isActive,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const res = await fetch(`/api/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchUsers();
        setSuccess("User updated.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update user.");
      }
    } finally {
      setSaving(false);
    }
  };

  const renderForm = (
    form: UserForm,
    setForm: (f: UserForm) => void,
    isEdit: boolean
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
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="+15125551234"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Role
          </label>
          <select
            value={form.systemRole}
            onChange={(e) => setForm({ ...form, systemRole: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="crew">Crew</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Password{isEdit ? " (leave blank to keep)" : ""}
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.emailEnabled}
            onChange={(e) =>
              setForm({ ...form, emailEnabled: e.target.checked })
            }
            className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
          />
          Email Notifications
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.smsEnabled}
            onChange={(e) =>
              setForm({ ...form, smsEnabled: e.target.checked })
            }
            className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
          />
          SMS Notifications
        </label>
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
              className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
            />
            Active
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-ui="users-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Users</h1>
        <button
          data-ui="add-user-btn"
          onClick={() => {
            setShowAddForm(true);
            setAddForm(emptyForm());
          }}
          className="px-4 py-2 bg-amber-500 text-zinc-950 text-sm font-medium rounded-md hover:bg-amber-400 transition-colors"
        >
          Add User
        </button>
      </div>

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

      {/* Add user form */}
      {showAddForm && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4" data-ui="add-user-form">
          <h2 className="text-sm font-semibold text-zinc-100">New User</h2>
          {renderForm(addForm, setAddForm, false)}
          <div className="flex gap-2">
            <button
              onClick={createUser}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-zinc-950 text-sm font-medium rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create User"}
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

      {/* Users table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden" data-ui="users-list">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">
                    Role
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center hidden lg:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center hidden lg:table-cell">
                    SMS
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} data-ui="user-row">
                    {editingId === user.id ? (
                      <td colSpan={8} className="p-4 bg-zinc-850">
                        {renderForm(editForm, setEditForm, true)}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="px-3 py-1.5 bg-amber-500 text-zinc-950 text-xs font-medium rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded-md hover:bg-zinc-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-zinc-100">
                          {user.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400 hidden sm:table-cell">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400 hidden md:table-cell">
                          {user.phone || "--"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs capitalize bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">
                            {user.systemRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span
                            className={`text-xs ${
                              user.emailEnabled
                                ? "text-green-400"
                                : "text-zinc-600"
                            }`}
                          >
                            {user.emailEnabled ? "On" : "Off"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span
                            className={`text-xs ${
                              user.smsEnabled
                                ? "text-green-400"
                                : "text-zinc-600"
                            }`}
                          >
                            {user.smsEnabled ? "On" : "Off"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                              user.isActive
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-zinc-600/20 text-zinc-400 border-zinc-600/30"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => startEdit(user)}
                            className="text-xs text-amber-500 hover:text-amber-400"
                          >
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
