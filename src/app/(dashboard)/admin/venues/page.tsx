"use client";

import { useState, useEffect } from "react";

interface Venue {
  id: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  isHomeVenue: boolean;
  notes: string | null;
}

interface VenueForm {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isHomeVenue: boolean;
  notes: string;
}

const emptyForm = (): VenueForm => ({
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  isHomeVenue: false,
  notes: "",
});

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<VenueForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VenueForm>(emptyForm());

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const res = await fetch("/api/venues");
      if (res.ok) setVenues(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const formatAddress = (v: Venue): string => {
    const parts = [v.addressLine1, v.addressLine2, v.city, v.state, v.postalCode]
      .filter(Boolean);
    return parts.join(", ") || "--";
  };

  const createVenue = async () => {
    clearMessages();
    if (!addForm.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          addressLine1: addForm.addressLine1.trim() || null,
          addressLine2: addForm.addressLine2.trim() || null,
          city: addForm.city.trim() || null,
          state: addForm.state.trim() || null,
          postalCode: addForm.postalCode.trim() || null,
          country: addForm.country.trim() || "US",
          isHomeVenue: addForm.isHomeVenue,
          notes: addForm.notes.trim() || null,
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setAddForm(emptyForm());
        await fetchVenues();
        setSuccess("Venue created.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create venue.");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (venue: Venue) => {
    setEditingId(venue.id);
    setEditForm({
      name: venue.name,
      addressLine1: venue.addressLine1 || "",
      addressLine2: venue.addressLine2 || "",
      city: venue.city || "",
      state: venue.state || "",
      postalCode: venue.postalCode || "",
      country: venue.country || "US",
      isHomeVenue: venue.isHomeVenue,
      notes: venue.notes || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    clearMessages();
    setSaving(true);
    try {
      const res = await fetch(`/api/venues/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          addressLine1: editForm.addressLine1.trim() || null,
          addressLine2: editForm.addressLine2.trim() || null,
          city: editForm.city.trim() || null,
          state: editForm.state.trim() || null,
          postalCode: editForm.postalCode.trim() || null,
          country: editForm.country.trim() || "US",
          isHomeVenue: editForm.isHomeVenue,
          notes: editForm.notes.trim() || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchVenues();
        setSuccess("Venue updated.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update venue.");
      }
    } finally {
      setSaving(false);
    }
  };

  const renderForm = (
    form: VenueForm,
    setForm: (f: VenueForm) => void
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
            placeholder="Venue name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Address Line 1
          </label>
          <input
            type="text"
            value={form.addressLine1}
            onChange={(e) =>
              setForm({ ...form, addressLine1: e.target.value })
            }
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Address Line 2
          </label>
          <input
            type="text"
            value={form.addressLine2}
            onChange={(e) =>
              setForm({ ...form, addressLine2: e.target.value })
            }
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            City
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            State
          </label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="TX"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Postal Code
          </label>
          <input
            type="text"
            value={form.postalCode}
            onChange={(e) =>
              setForm({ ...form, postalCode: e.target.value })
            }
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Country
          </label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.isHomeVenue}
            onChange={(e) =>
              setForm({ ...form, isHomeVenue: e.target.checked })
            }
            className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
          />
          Home Venue
        </label>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-ui="venues-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Venues</h1>
        <button
          data-ui="add-venue-btn"
          onClick={() => {
            setShowAddForm(true);
            setAddForm(emptyForm());
          }}
          className="px-4 py-2 bg-amber-500 text-zinc-950 text-sm font-medium rounded-md hover:bg-amber-400 transition-colors"
        >
          Add Venue
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

      {/* Add venue form */}
      {showAddForm && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4" data-ui="add-venue-form">
          <h2 className="text-sm font-semibold text-zinc-100">New Venue</h2>
          {renderForm(addForm, setAddForm)}
          <div className="flex gap-2">
            <button
              onClick={createVenue}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-zinc-950 text-sm font-medium rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Venue"}
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

      {/* Venues table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          No venues found. Add one to get started.
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden" data-ui="venues-list">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    Address
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">
                    Home
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {venues.map((venue) => (
                  <tr key={venue.id} data-ui="venue-row">
                    {editingId === venue.id ? (
                      <td colSpan={5} className="p-4 bg-zinc-850">
                        {renderForm(editForm, setEditForm)}
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
                        <td className="px-4 py-3 text-sm font-medium text-zinc-100">
                          {venue.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400 hidden sm:table-cell">
                          <span className="truncate block max-w-xs">
                            {formatAddress(venue)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {venue.isHomeVenue ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-amber-500/20 text-amber-400 border-amber-500/30">
                              Home
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400 hidden md:table-cell">
                          <span className="truncate block max-w-xs">
                            {venue.notes || "--"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => startEdit(venue)}
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
