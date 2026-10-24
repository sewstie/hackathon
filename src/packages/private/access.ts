// private/access — the office-scoped access-control entry point.
//
// A SECOND entry point of the `private` package (alongside index.ts), exposing
// the least-exposure guarantees for a direct (private) report: open/inbox/
// reassign/status, each enforced at the data seam so the UI can never widen
// access. Implementation is hidden in lib/access.ts.

import {
  changeStatus,
  officeInbox,
  openReport,
  reassign,
} from "./lib/access";
import type { Store, PrivateAccess } from "@/lib/store";
import type { Office, PrivateReport, PrivateStatus, User } from "@/types";

/**
 * Open a private report as `actor`. Returns `{ allowed: true, data }` only when
 * the actor's office equals the report's current office; otherwise
 * `{ allowed: false, data: null }`. A successful view appends a "view" row to
 * the append-only access log.
 */
export function openPrivateReport(
  store: Store,
  reportId: string,
  actor: User,
): Promise<PrivateAccess<PrivateReport>> {
  return openReport(store, reportId, actor);
}

/** The actor's office inbox — only reports currently held by their office.
 * Staff with no office get an empty list. */
export function listOfficeInbox(store: Store, actor: User): Promise<PrivateReport[]> {
  return officeInbox(store, actor);
}

/**
 * Reassign a private report to another office. Setting the new current office
 * removes the previous office's access by construction and appends a "reassign"
 * row to the log. Denied for an actor who does not currently hold the report.
 */
export function reassignOffice(
  store: Store,
  reportId: string,
  toOffice: Office,
  actor: User,
): Promise<PrivateAccess<PrivateReport>> {
  return reassign(store, reportId, toOffice, actor);
}

/**
 * Change a private report's status. "Referred" requires a note. On success the
 * store appends a "status-change" row and notifies the student. Denied for a
 * non-owning actor.
 */
export function setPrivateStatus(
  store: Store,
  reportId: string,
  status: PrivateStatus,
  actor: User,
  note?: string,
): Promise<PrivateAccess<PrivateReport>> {
  return changeStatus(store, reportId, status, actor, note);
}
