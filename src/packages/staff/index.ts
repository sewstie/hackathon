// CampusFix — staff dashboard (team queue + private inbox).
//
// A deep module with a tiny public surface: the responder's workspace, built
// by composing the shared seams rather than reaching into tables. It reads
// reports through the Store, orders them with the priority rule (ticket 07),
// drives status changes through the notifications module (ticket 09) so each
// change fans out to the reporter and all co-signers, and surfaces only the
// private reports the active office is allowed to see (access control is
// enforced in the Store, not here). The queue carries live signer counts,
// age, accessible tier presentation, and flags; filters narrow by status and
// building. Reassignment and tier override let staff act on a report.

import type {
  Office,
  PrivateReport,
  PublicTeam,
  Report,
  Status,
  Tier,
  User,
} from "@/types";
import type { Store } from "@/lib/store";
import type { StatusChangeResult } from "@/packages/notifications";
import {
  type QueueFilters,
  type StaffQueueRow,
  type StaffTabs,
  changeReportStatusImpl,
  overrideTierImpl,
  privateInboxImpl,
  reassignToTeamImpl,
  teamQueueImpl,
  visibleTabsImpl,
} from "./lib/impl";

export type { QueueFilters, StaffQueueRow, StaffTabs };

/**
 * The tabs a responder sees: their own public team queue, plus a "Private
 * inbox" tab only if they hold an office. Non-responders (and null) see none.
 * Pure.
 */
export function visibleTabs(user: User | null): StaffTabs {
  return visibleTabsImpl(user);
}

/**
 * The priority-ordered queue for a public `team` on `campusId`: reports in the
 * team's category ordered by the shared priority rule then oldest-first, each
 * row with its live signer count, age in days, accessible tier, and flags.
 * Optional filters narrow by status and building. `now` is injectable so tests
 * stay deterministic.
 */
export function teamQueue(
  store: Store,
  campusId: string,
  team: PublicTeam,
  filters?: QueueFilters,
  now?: Date,
): Promise<StaffQueueRow[]> {
  return teamQueueImpl(store, campusId, team, filters, now);
}

/**
 * Move a report to `status`, notifying the reporter and every co-signer via
 * the notifications module. "Won't fix" requires a reason (rejected without
 * one). Returns the updated report and the number of recipients notified.
 */
export function changeReportStatus(
  store: Store,
  reportId: string,
  status: Status,
  resolutionNote?: string,
): Promise<StatusChangeResult> {
  return changeReportStatusImpl(store, reportId, status, resolutionNote);
}

/**
 * Reassign a report to another team's queue (misrouted reports still get
 * handled). Returns the report reflecting its new team/category.
 */
export function reassignToTeam(
  store: Store,
  reportId: string,
  toTeam: PublicTeam,
): Promise<Report> {
  return reassignToTeamImpl(store, reportId, toTeam);
}

/** Override the AI's tier for a report — staff judgment is final. */
export function overrideTier(
  store: Store,
  reportId: string,
  tier: Tier,
): Promise<Report> {
  return overrideTierImpl(store, reportId, tier);
}

/**
 * The private inbox for the active responder: only the private reports whose
 * current office matches the actor's office. Other-office staff get an empty
 * list — enforcement lives in the Store, this merely surfaces it.
 */
export function privateInbox(store: Store, actor: User): Promise<PrivateReport[]> {
  return privateInboxImpl(store, actor);
}

/** The office an actor's private inbox is scoped to, if any. */
export function inboxOffice(user: User | null): Office | null {
  return visibleTabsImpl(user).office;
}
