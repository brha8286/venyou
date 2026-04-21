"use client";

import { useEffect, useState } from "react";

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  caption: string | null;
  sortOrder: number;
  isPublic: boolean;
}

export default function GalleryAdminPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add form
  const [addUrl, setAddUrl] = useState("");
  const [addCaption, setAddCaption] = useState("");
  const [adding, setAdding] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editAlt, setEditAlt] = useState("");

  async function fetchImages() {
    try {
      const res = await fetch("/api/gallery");
      if (!res.ok) throw new Error("Failed to load gallery");
      setImages(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchImages();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addUrl.trim()) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: addUrl.trim(), caption: addCaption.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to add image");
      }
      setAddUrl("");
      setAddCaption("");
      setSuccess("Image added");
      setTimeout(() => setSuccess(null), 3000);
      await fetchImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  async function handleTogglePublic(img: GalleryImage) {
    try {
      const res = await fetch(`/api/gallery/${img.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !img.isPublic }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/gallery/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSuccess("Image removed");
      setTimeout(() => setSuccess(null), 3000);
      await fetchImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleMove(id: string, direction: "up" | "down") {
    const idx = images.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= images.length) return;

    try {
      await Promise.all([
        fetch(`/api/gallery/${images[idx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: images[swapIdx].sortOrder }),
        }),
        fetch(`/api/gallery/${images[swapIdx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: images[idx].sortOrder }),
        }),
      ]);
      await fetchImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleSaveEdit(id: string) {
    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: editCaption || null, alt: editAlt || null }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      await fetchImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-6">Gallery</h1>
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-zinc-700 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-ui="gallery-admin-page">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Gallery</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-md px-4 py-3 mb-4">
          {success}
        </div>
      )}

      {/* Add image form */}
      <form
        onSubmit={handleAdd}
        className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6 max-w-2xl"
      >
        <h2 className="text-sm font-semibold text-zinc-100 mb-3">
          Add image
        </h2>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="addUrl"
              className="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Image URL *
            </label>
            <input
              type="url"
              id="addUrl"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              required
              placeholder="https://..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
          <div>
            <label
              htmlFor="addCaption"
              className="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Caption
            </label>
            <input
              type="text"
              id="addCaption"
              value={addCaption}
              onChange={(e) => setAddCaption(e.target.value)}
              placeholder="Optional caption"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
          {addUrl && (
            <img
              src={addUrl}
              alt="Preview"
              className="max-h-32 rounded-md border border-zinc-700"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-md transition-colors"
          >
            {adding ? "Adding..." : "Add to gallery"}
          </button>
        </div>
      </form>

      {/* Image grid */}
      {images.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          No images yet. Add one above.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={`bg-zinc-800 rounded-lg border overflow-hidden ${
                img.isPublic ? "border-zinc-700" : "border-zinc-700/50 opacity-60"
              }`}
            >
              <div className="aspect-square bg-zinc-900 overflow-hidden">
                <img
                  src={img.url}
                  alt={img.alt || img.caption || ""}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-3 space-y-2">
                {editingId === img.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Caption"
                      className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      placeholder="Alt text"
                      className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(img.id)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-xs rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {img.caption && (
                      <p className="text-sm text-zinc-300 truncate">
                        {img.caption}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleTogglePublic(img)}
                        className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                          img.isPublic
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                        }`}
                      >
                        {img.isPublic ? "Public" : "Hidden"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(img.id);
                          setEditCaption(img.caption || "");
                          setEditAlt(img.alt || "");
                        }}
                        className="px-2.5 py-1 text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 rounded-full transition-colors"
                      >
                        Edit
                      </button>
                      {idx > 0 && (
                        <button
                          onClick={() => handleMove(img.id, "up")}
                          className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 rounded-full transition-colors"
                        >
                          &uarr;
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          onClick={() => handleMove(img.id, "down")}
                          className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 rounded-full transition-colors"
                        >
                          &darr;
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(img.id)}
                        className="px-2.5 py-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
