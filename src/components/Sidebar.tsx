"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface SidebarProps {
  user: {
    name: string;
    role: string;
  };
}

interface NavItem {
  label: string;
  href: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Tasks", href: "/tasks" },
  { label: "Calendar", href: "/calendar" },
  { label: "Board", href: "/board" },
  { label: "Rolodex", href: "/rolodex", adminOnly: true },
  { label: "Templates", href: "/admin/templates", adminOnly: true },
  { label: "Users", href: "/admin/users", adminOnly: true },
  { label: "Venues", href: "/admin/venues", adminOnly: true },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user.role === "admin";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        data-ui="mobile-menu-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-zinc-800 text-zinc-100 lg:hidden"
        aria-label="Toggle navigation"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {mobileOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        data-ui="sidebar"
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div data-ui="sidebar-brand" className="px-6 py-5 border-b border-zinc-800">
          <h1 className="text-xl font-bold tracking-tight text-amber-500">
            venyou
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-ui={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-800 text-amber-500 border-l-2 border-amber-500"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + sign out */}
        <div data-ui="sidebar-user" className="px-4 py-4 border-t border-zinc-800">
          <div className="mb-3">
            <p className="text-sm font-medium text-zinc-100 truncate">
              {user.name}
            </p>
            <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
          </div>
          <button
            data-ui="sign-out"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
