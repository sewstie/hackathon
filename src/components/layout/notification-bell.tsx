"use client";

import * as React from "react";
import { getStore } from "@/lib/store";
import { useActiveUser } from "./active-user";

/**
 * Notification bell SHELL: shows the active user's unread count and re-reads it
 * on role-switch and a short interval (no Realtime). The dropdown contents are
 * wired by Track B (09); this foundation provides the placement + unread badge.
 */
export function NotificationBell() {
  const { activeUser } = useActiveUser();
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    if (!activeUser) {
      // Reset asynchronously so we don't setState synchronously in the effect.
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

  return (
    <button
      type="button"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
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
  );
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
