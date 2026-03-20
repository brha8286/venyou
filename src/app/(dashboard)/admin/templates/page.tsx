"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { taskTemplates: number };
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch("/api/event-templates");
        if (res.ok) setTemplates(await res.json());
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  return (
    <div className="space-y-6" data-ui="templates-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Event Templates</h1>
        <Link
          href="/admin/templates/new"
          data-ui="new-template-btn"
          className="px-4 py-2 bg-amber-500 text-zinc-950 text-sm font-medium rounded-md hover:bg-amber-400 transition-colors"
        >
          New Template
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          No templates found. Create one to get started.
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden" data-ui="templates-list">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                  Description
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">
                  Tasks
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr
                  key={template.id}
                  data-ui="template-row"
                  onClick={() =>
                    router.push(`/admin/templates/${template.id}`)
                  }
                  className="border-b border-zinc-700/50 hover:bg-zinc-750 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-zinc-100">
                      {template.name}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-zinc-400 truncate max-w-xs">
                      {template.description || "--"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                        template.isActive
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-zinc-600/20 text-zinc-400 border-zinc-600/30"
                      }`}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-zinc-300">
                      {template._count.taskTemplates}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
