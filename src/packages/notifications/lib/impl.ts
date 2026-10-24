// Internal implementation of the closed-loop status + notification rules,
// hidden in a subfolder. Reachable from the package's root files (index.ts)
// but NOT from outside.
//
// The one invariant that matters: changing a public report's status fans a
// single notification out to every recipient (the reporter and all
// co-signers), with the body "[title] is now [status]". Nothing is written
// until the change is valid, so a rejected "Won't fix" leaves no trace.

import type { Report, Status } from "@/types";
import type { Store } from "@/lib/store";

/** The public lifecycle, in order. "Won't fix" is a terminal branch. */
export const STATUS_FLOW: readonly Status[] = [
  "Received",
  "Assigned",
  "In progress",
  "Fixed",
] as const;

/** How recent a Fixed report must be to show in "Fixed this week". */
const WEEK_MS = 7 * 86_400_000;

/** The notification body for a status change: "[title] is now [status]". */
export function notificationBodyImpl(title: string, status: Status): string {
  return `${title} is now ${status}`;
}

/** The outcome of a status change: the updated report + how many were notified. */
export interface StatusChangeResult {
  report: Report;
  notified: number;
}

/**
 * Move a public report to `status`, then notify the reporter and every
 * co-signer exactly once. "Won't fix" requires a reason; without one the
 * change is rejected and nothing is written. Recipients come from the co-sign
 * list, which already includes the reporter (the reporter counts as signed),
 * so each recipient is notified exactly once.
 */
export async function changeStatusImpl(
  store: Store,
  reportId: string,
  status: Status,
  resolutionNote?: string,
): Promise<StatusChangeResult> {
  if (status === "Won't fix" && !resolutionNote?.trim()) {
    throw new Error(`A "Won't fix" status requires a reason.`);
  }

  const report = await store.updateReportStatus(reportId, status, resolutionNote);

  // Recipients = reporter + all co-signers. The co-sign list already contains
  // the reporter (reporter counts as signed), so dedupe defensively anyway.
  const coSigns = await store.listCoSigns(reportId);
  const recipientIds = new Set<string>([report.reporterId]);
  for (const c of coSigns) recipientIds.add(c.userId);

  const body = notificationBodyImpl(report.title, status);
  for (const recipientId of recipientIds) {
    await store.addNotification(recipientId, body, `/report-detail?id=${encodeURIComponent(reportId)}`);
  }

  return { report, notified: recipientIds.size };
}

/**
 * Public reports on `campusId` that reached "Fixed" within the last 7 days,
 * newest-first. `now` is injectable for deterministic tests. Private reports
 * never appear here (they are not in the public report list at all).
 */
export async function fixedThisWeekImpl(
  store: Store,
  campusId: string,
  now: Date = new Date(),
): Promise<Report[]> {
  const cutoff = now.getTime() - WEEK_MS;
  const reports = await store.listReports(campusId);
  return reports
    .filter((r) => r.status === "Fixed" && Date.parse(r.createdAt) >= cutoff)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** The active user's unread notification count (for the header bell). */
export function unreadCountImpl(store: Store, recipientId: string): Promise<number> {
  return store.countUnread(recipientId);
}
