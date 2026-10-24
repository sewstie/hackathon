// Student view of a single private report thread — a sub-route of the private
// area so it never nests inside Track A's src/app/report/ or Track B's
// src/app/staff/. The reporting student reads the office's replies, sees the
// current status, and posts new messages. Office-scoped access is enforced in
// the private module (see src/packages/private/thread + access), not here.

import { PrivateThreadView } from "./private-thread-view";

// Reads a request-time route param, so it's a blocking dynamic route rather
// than prerendered (cacheComponents/PPR).
export const instant = false;

export default async function PrivateThreadPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  return <PrivateThreadView reportId={reportId} />;
}
