"use client";

import * as React from "react";
import { getStore } from "@/lib/store";
import { unreadCount } from "@/packages/notifications";
import type { Notification } from "@/types";
import { useActiveUser } from "@/components/layout";
import { Dialog } from "@/components/ui";

/** How often the bell re-reads the unread count (no Realtime). */
const POLL_MS = 15_000;

/**
 * The header notification bell with its dropdown — the closed loop's reader.
 *
 * Shows the active user's unread count on a badge and, when opened, lists their
 * notifications newest-first and marks them all read (so the badge clears). It
 * re-reads on role-switch and on a short interval. The ticket's foundation shell
 * (components/layout) only provided the badge; this wires the actual dropdown.
 */
export function NotificationBell() {
  const { activeUser } = useActiveUser();
  const [unread, setUnread] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notification[]>([]);

  const refreshUnread = React.useCallback(() => {
    if (!activeUser) {
      setUnread(0);
      return;
    }
    unreadCount(getStore(), activeUser.id)
      .then(setUnread)
      .catch(() => {});
  }, [activeUser]);

  React.useEffect(() => {
    let cancelled = false;
    const read = () => {
      if (cancelled) return;
      refreshUnread();
    };
    // Defer the first read so no setState runs synchronously in the effect body.
    const t = setTimeout(read, 0);
    const interval = setInterval(read, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [refreshUnread]);

  async function handleOpen() {
    if (!activeUser) return;
    const store = getStore();
    const notes = await store.listNotifications(activeUser.id);
    // Newest-first.
    setItems(
      [...notes].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      ),
    );
    setOpen(true);
    // Opening the dropdown marks everything read, so the badge clears.
    await store.markAllRead(activeUser.id);
    refreshUnread();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
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

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        description={
          items.length === 0 ? "You're all caught up." : undefined
        }
      >
        {items.length > 0 ? (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto" aria-label="Notifications">
            {items.map((n) => (
              <li
                key={n.id}
                className="rounded-[--radius] border border-border bg-muted/40 p-3 text-sm"
              >
                {n.body}
              </li>
            ))}
          </ul>
        ) : null}
      </Dialog>
    </>
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
