"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  pocName: string | null;
  notes: string | null;
}

interface ContactForm {
  name: string;
  phone: string;
  email: string;
  pocName: string;
  notes: string;
}

const emptyForm = (): ContactForm => ({
  name: "",
  phone: "",
  email: "",
  pocName: "",
  notes: "",
});

export default function RolodexPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.systemRole === "admin" || session?.user?.systemRole === "manager";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<ContactForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ContactForm>(emptyForm());

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.pocName?.toLowerCase().includes(q) ?? false) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false)
    );
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to create contact");
      }
      const contact = await res.json();
      setContacts((prev) => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)));
      setAddForm(emptyForm());
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setEditForm({
      name: contact.name,
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      pocName: contact.pocName ?? "",
      notes: contact.notes ?? "",
    });
    setExpandedId(contact.id);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/contacts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to update contact");
      const updated = await res.json();
      setContacts((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  }

  return (
    <div className="space-y-6" data-ui="rolodex-page">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-100">Rolodex</h1>
        {isAdmin && (
          <button
            onClick={() => { setShowAdd(!showAdd); setError(""); }}
            data-ui="add-contact-btn"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-semibold rounded-md transition-colors"
          >
            {showAdd ? "Cancel" : "+ Add Contact"}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && isAdmin && (
        <form
          onSubmit={handleAdd}
          data-ui="add-contact-form"
          className="bg-zinc-800 border border-zinc-700 rounded-lg p-5"
        >
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">New Contact</h2>
          <FormFields form={addForm} setForm={setAddForm} />
          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-sm font-semibold rounded-md transition-colors">
              {saving ? "Saving..." : "Save Contact"}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or phone..."
        data-ui="rolodex-search"
        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      />

      {/* Contact list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">No contacts found.</div>
      ) : (
        <div className="space-y-2" data-ui="contact-list">
          {filtered.map((contact) => {
            const isExpanded = expandedId === contact.id;
            const isEditing = editingId === contact.id;

            return (
              <div
                key={contact.id}
                data-ui="contact-card"
                data-contact-id={contact.id}
                className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden"
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-750"
                  onClick={() => {
                    if (!isEditing) setExpandedId(isExpanded ? null : contact.id);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{contact.name}</p>
                    {contact.pocName && (
                      <p className="text-xs text-zinc-500 truncate">POC: {contact.pocName}</p>
                    )}
                    {!contact.pocName && contact.email && (
                      <p className="text-xs text-zinc-500 truncate">{contact.email}</p>
                    )}
                  </div>
                  {contact.phone && (
                    <span className="text-xs text-zinc-400 hidden sm:block shrink-0">{contact.phone}</span>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => isEditing ? setEditingId(null) : startEdit(contact)}
                        className="text-xs text-zinc-400 hover:text-amber-400 transition-colors px-2 py-1"
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="text-xs text-zinc-400 hover:text-red-400 transition-colors px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded / edit area */}
                {isExpanded && (
                  <div className="border-t border-zinc-700 p-4 bg-zinc-900/40">
                    {isEditing ? (
                      <form onSubmit={handleEdit}>
                        <FormFields form={editForm} setForm={setEditForm} />
                        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
                        <div className="flex justify-end gap-2 mt-4">
                          <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
                          <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-sm font-semibold rounded-md transition-colors">
                            {saving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        {contact.phone && <Detail label="Phone" value={contact.phone} />}
                        {contact.email && <Detail label="Email" value={contact.email} />}
                        {contact.pocName && <Detail label="POC Name" value={contact.pocName} />}
                        {contact.notes && <Detail label="Notes" value={contact.notes} className="sm:col-span-2" />}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FormFields({ form, setForm }: { form: ContactForm; setForm: (f: ContactForm) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-400 mb-1">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name or business name"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(512) 000-0000"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@email.com"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Point of Contact Name</label>
        <input
          type="text"
          value={form.pocName}
          onChange={(e) => setForm({ ...form, pocName: e.target.value })}
          placeholder="Contact person's name"
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Optional notes..."
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
        />
      </div>
    </div>
  );
}

function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      <p className="text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}
