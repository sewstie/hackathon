"use client";

import * as React from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import type { Notification } from "@/types";
import { useActiveUser } from "./active-user";

/**
 * Notification bell: shows the active user's unread count and, on click, opens a
 * dropdown listing their notifications. Opening the dropdown marks everything
 * read (so the badge reflects reality), and an empty list shows a friendly
 * empty state. Unread count also re-reads on role-switch and a short interval
 * (no Realtime).
 */
export function NotificationBell() {
  const { activeUser } = useActiveUser();
  const [unread, setUnread] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Keep the unread badge honest: re-read on user change and on an interval.
  React.useEffect(() => {
    let cancelled = false;
    if (!activeUser) {
      const t = setTimeout(() => {
        if (!cancelled) setUnread(0);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    const read = () => {
      getStore()
        .countUnread(activeUser.id)
        .then((n) => {
          if (!cancelled) setUnread(n);
        })
        .catch(() => {});
    };
    read();
    const interval = setInterval(read, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeUser]);

  // Close on outside click / Escape while open.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openDropdown = React.useCallback(() => {
    setOpen(true);
    if (!activeUser) {
      setNotifications([]);
      return;
    }
    const store = getStore();
    const userId = activeUser.id;
    store
      .listNotifications(userId)
      .then((list) => {
        // Newest first for a familiar feed feel.
        setNotifications(
          [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
        );
      })
      .catch(() => setNotifications([]));
    // Opening the dropdown is "reading" them: clear the unread badge.
    store
      .markAllRead(userId)
      .then(() => setUnread(0))
      .catch(() => {});
  }, [activeUser]);

  const toggle = () => {
    if (open) {
      setOpen(false);
    } else {
      openDropdown();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <BellIcon />
        {unread > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground"
            aria-hidden="true"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-(--radius-lg) border border-border bg-card text-card-foreground shadow-[var(--shadow)]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-semibold">Notifications</span>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet — you&apos;re all caught up.
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} role="none">
                  {n.link ? (
                    // Click a notification to jump straight to that report / chat.
                    <Link
                      href={n.link}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="group flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-card-foreground">{n.body}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {formatWhen(n.createdAt)} · <span className="font-medium text-primary">Open</span>
                        </span>
                      </span>
                      <span aria-hidden className="mt-0.5 text-muted-foreground transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </Link>
                  ) : (
                    <div role="menuitem" className="px-4 py-3 text-sm">
                      <p className="text-card-foreground">{n.body}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatWhen(n.createdAt)}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
