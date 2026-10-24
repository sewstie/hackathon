// UniFix — status lifecycle + notifications (the closed loop).
//
// A deep module with a tiny public surface. Every public report moves through
// visible statuses (Received → Assigned → In progress → Fixed, or Won't fix
// with a required reason), and every change notifies the reporter and all
// co-signers via a notification row per recipient ("[title] is now [status]").
// The header bell reads the active user's unread count; the campus home reads
// "Fixed this week". All data flows through the single Store seam, so the same
// behavior holds for the in-memory (test) and Supabase (runtime) stores.

import type { Report, Status } from "@/types";
import type { Store } from "@/lib/store";
import {
  STATUS_FLOW,
  type StatusChangeResult,
  changeStatusImpl,
  fixedThisWeekImpl,
  notificationBodyImpl,
  unreadCountImpl,
} from "./lib/impl";

export type { StatusChangeResult };
export { STATUS_FLOW };

/** The notification body for a status change: "[title] is now [status]". Pure. */
export function notificationBody(title: string, status: Status): string {
  return notificationBodyImpl(title, status);
}

/**
 * Move a public report to `status` and notify the reporter + every co-signer
 * exactly once. "Won't fix" requires a reason; without one the change is
 * rejected and nothing is written. Returns the updated report and the number
 * of recipients notified.
 */
export function changeStatus(
  store: Store,
  reportId: string,
  status: Status,
  resolutionNote?: string,
): Promise<StatusChangeResult> {
  return changeStatusImpl(store, reportId, status, resolutionNote);
}

/**
 * Public reports that reached "Fixed" within the last 7 days, newest-first,
 * for the campus home "Fixed this week" list. `now` is injectable so tests are
 * deterministic.
 */
export function fixedThisWeek(
  store: Store,
  campusId: string,
  now?: Date,
): Promise<Report[]> {
  return fixedThisWeekImpl(store, campusId, now);
}

/** The active user's unread notification count, for the header bell. */
export function unreadCount(store: Store, recipientId: string): Promise<number> {
  return unreadCountImpl(store, recipientId);
}
