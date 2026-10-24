// private/thread — the two-way private message thread entry point.
//
// A THIRD entry point of the `private` package. The reporting student and the
// one office currently holding the report exchange messages through the same
// office-scoped seam; a reassign cuts the old office out of the conversation.
// Office replies and status changes notify the student. Implementation is
// hidden in lib/thread.ts.

import { officeReply, readThread, studentMessage } from "./lib/thread";
import type { Store, PrivateAccess } from "@/lib/store";
import type { PrivateMessage, User } from "@/types";

/** Load the full message thread for a report. Allowed for the reporting
 * student and the current office; denied (no data) for other-office staff. */
export function loadThread(
  store: Store,
  reportId: string,
  actor: User,
): Promise<PrivateAccess<PrivateMessage[]>> {
  return readThread(store, reportId, actor);
}

/** Post a message as the reporting student. */
export function postStudentMessage(
  store: Store,
  reportId: string,
  body: string,
  actor: User,
): Promise<PrivateAccess<PrivateMessage>> {
  return studentMessage(store, reportId, body, actor);
}

/** Post a reply as the owning office; notifies the student. Denied for staff
 * from another office. */
export function postOfficeReply(
  store: Store,
  reportId: string,
  body: string,
  actor: User,
): Promise<PrivateAccess<PrivateMessage>> {
  return officeReply(store, reportId, body, actor);
}
