"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type ContactType = "staff" | "vendor" | "client";

interface Contact {
  id: string;
  type: ContactType;
  name: string;
  phone: string | null;
  email: string | null;
  pocName: string | null;
  pocPhone: string | null;
  pocEmail: string | null;
  notes: string | null;
}

interface ContactForm {
  type: ContactType;
  name: string;
  phone: string;
  email: string;
  pocName: string;
  pocPhone: string;
  pocEmail: string;
  notes: string;
}

const emptyForm = (): ContactForm => ({
  type: "staff",
  name: "",
  phone: "",
  email: "",
  pocName: "",
  pocPhone: "",
  pocEmail: "",
  notes: "",
});

const TYPE_LABELS: Record<ContactType, string> = {
  staff: "Staff",
  vendor: "Vendor",
  client: "Client",
};

const TYPE_COLORS: Record<ContactType, string> = {
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  vendor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  client: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const TABS: { key: ContactType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "staff", label: "Staff" },
  { key: "vendor", label: "Vendors" },
  { key: "client", label: "Clients" },
];

export default function RolodexPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.systemRole === "admin" || session?.user?.systemRole === "manager";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContactType | "all">("all");
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
    if (activeTab !== "all" && c.type !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.pocName?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false)
      );
    }
    return true;
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
      type: contact.type,
      name: contact.name,
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      pocName: contact.pocName ?? "",
      pocPhone: contact.pocPhone ?? "",
      pocEmail: contact.pocEmail ?? "",
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

  function FormFields({ form, setForm }: { form: ContactForm; setForm: (f: ContactForm) => void }) {
    const isBusiness = form.type === "vendor" || form.type === "client";
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="staff">Staff</option>
              <option value="vendor">Vendor</option>
              <option value="client">Client</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              {isBusiness ? "Business Name *" : "Name *"}
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={isBusiness ? "Business name" : "Full name"}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              {isBusiness ? "Business Phone" : "Phone"}
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(512) 000-0000"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              {isBusiness ? "Business Email" : "Email"}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={isBusiness ? "info@company.com" : "name@email.com"}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>

        {isBusiness && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Point of Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.pocName}
                  onChange={(e) => setForm({ ...form, pocName: e.target.value })}
                  placeholder="Contact name"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.pocPhone}
                  onChange={(e) => setForm({ ...form, pocPhone: e.target.value })}
                  placeholder="(512) 000-0000"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.pocEmail}
                  onChange={(e) => setForm({ ...form, pocEmail: e.target.value })}
                  placeholder="poc@company.com"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>
        )}

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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg" data-ui="rolodex-type-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab.key ? "bg-zinc-800 text-amber-500" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          data-ui="rolodex-search"
          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>

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
            const isBusiness = contact.type === "vendor" || contact.type === "client";
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
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${TYPE_COLORS[contact.type]}`}>
                    {TYPE_LABELS[contact.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{contact.name}</p>
                    {isBusiness && contact.pocName && (
                      <p className="text-xs text-zinc-500 truncate">POC: {contact.pocName}</p>
                    )}
                    {!isBusiness && contact.email && (
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
                        {isBusiness && contact.pocName && <Detail label="POC Name" value={contact.pocName} />}
                        {isBusiness && contact.pocPhone && <Detail label="POC Phone" value={contact.pocPhone} />}
                        {isBusiness && contact.pocEmail && <Detail label="POC Email" value={contact.pocEmail} />}
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

function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      <p className="text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}
