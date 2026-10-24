// The two-way private message thread — hidden impl.
//
// A private report carries a message thread between the reporting student and
// the one office that currently holds it. Both sides go through the same
// office-scoped seam: the reporter always reaches their own thread; staff reach
// it only when their office matches the report's current office (so a reassign
// cuts the old office out of the conversation too). Every office reply and
// every status change notifies the student (handled in the store). The
// "don't share my name" flag lives on the report and hides the student's
// identity from staff while the thread itself keeps working.

import type { Store, PrivateAccess } from "@/lib/store";
import type { PrivateMessage, User } from "@/types";

/** Load the full thread for a report. Denied (no data) for staff from another
 * office; always allowed for the reporting student. */
export function readThread(
  store: Store,
  reportId: string,
  actor: User,
): Promise<PrivateAccess<PrivateMessage[]>> {
  return store.listPrivateMessages(reportId, actor);
}

/** Post a message as the reporting student. Surfaces to the office via the
 * shared thread. Denied if the actor is not the reporter and not the office. */
export function studentMessage(
  store: Store,
  reportId: string,
  body: string,
  actor: User,
): Promise<PrivateAccess<PrivateMessage>> {
  return store.addPrivateMessage(reportId, body, actor);
}

/** Post a reply as the owning office. Notifies the student. Denied for staff
 * from another office. */
export function officeReply(
  store: Store,
  reportId: string,
  body: string,
  actor: User,
): Promise<PrivateAccess<PrivateMessage>> {
  return store.addPrivateMessage(reportId, body, actor);
}
