// UniFix — report comments: a public thread on every report, plus "direct"
// staff ↔ reporter messages for clarifying questions.
//
// One small surface over the Store seam:
//   • postComment — screens the text (no spam/jokes/noise; PUBLIC comments may
//     not name a person), enforces that only the reporter and staff use direct
//     messages, saves it, and notifies the right people:
//       - staff → reporter (direct)          the reporter
//       - reporter → staff (direct)          that team's staff
//       - staff comment (public)             the reporter + every co-signer
//       - student comment (public)           the reporter + that team's staff
//     The author is never notified about their own comment.
//   • listComments — what this viewer may read (direct ones only for the
//     reporter and staff).
import type { Store } from "@/lib/store";
import type { ReportComment, User } from "@/types";
import { postCommentImpl, type PostCommentInput, type PostCommentResult } from "./lib/impl";

export type { PostCommentInput, PostCommentResult };

export function postComment(store: Store, input: PostCommentInput): Promise<PostCommentResult> {
  return postCommentImpl(store, input);
}

export function listComments(store: Store, reportId: string, viewer: User | null): Promise<ReportComment[]> {
  return store.listReportComments(reportId, viewer);
}
