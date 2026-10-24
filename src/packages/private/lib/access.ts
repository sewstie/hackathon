// Office-scoped access control for direct (private) reports — hidden impl.
//
// Least-exposure is enforced at the data seam (the Store), not in the UI: every
// read/write takes the acting user and is denied unless that user's office
// equals the report's current office. This lib is a thin, intent-revealing
// layer over that seam PLUS the one domain rule the store deliberately leaves
// to the module: a "Referred" status requires a note. Every view, reassign, and
// status change appends to the append-only access log inside the store.

import type { Store, PrivateAccess } from "@/lib/store";
import type { Office, PrivateReport, PrivateStatus, User } from "@/types";

/** Open a private report as a given actor. Denied (no data) for other offices;
 * a successful view appends a "view" row to the access log. */
export function openReport(
  store: Store,
  reportId: string,
  actor: User,
): Promise<PrivateAccess<PrivateReport>> {
  return store.getPrivateReport(reportId, actor);
}

/** The actor's office inbox: only reports whose current office is theirs. Staff
 * who hold no office get an empty list. */
export function officeInbox(store: Store, actor: User): Promise<PrivateReport[]> {
  return store.listPrivateReportsForActor(actor);
}

/** Reassign to a new office. Sets currentOffice, which removes the previous
 * office's access by construction, and logs a "reassign" row. Denied for a
 * non-owning actor. */
export function reassign(
  store: Store,
  reportId: string,
  toOffice: Office,
  actor: User,
): Promise<PrivateAccess<PrivateReport>> {
  return store.reassignPrivateReport(reportId, toOffice, actor);
}

/**
 * Change the private status (Received → Reviewing → Resolved/Referred). A
 * "Referred" transition REQUIRES a note — the module enforces this rule before
 * touching the store. Denied for a non-owning actor; on success the store logs
 * a "status-change" row and notifies the student.
 */
export function changeStatus(
  store: Store,
  reportId: string,
  status: PrivateStatus,
  actor: User,
  note?: string,
): Promise<PrivateAccess<PrivateReport>> {
  if (status === "Referred" && (note === undefined || note.trim().length === 0)) {
    return Promise.reject(
      new Error("A referred private report requires a note explaining the referral."),
    );
  }
  return store.updatePrivateStatus(reportId, status, actor, note);
}
