// Direct (private) report screen — a top-level route so it never nests inside
// the public report flow (Track A's src/app/report/) or the staff dashboard.
//
// The public-path "Send privately" redirect carries the student's text here via
// the `text` query param; the client flow routes it to one office, lets the
// student confirm or change it, states the privacy terms, and files privately.

import { PrivateReportFlow } from "./private-report-flow";

// This page reads request-time data (the carried `text` searchParam), so it is
// a blocking dynamic route rather than a prerendered one (cacheComponents/PPR).
export const instant = false;

export default async function PrivateReportPage({
  searchParams,
}: {
  searchParams: Promise<{ text?: string }>;
}) {
  const { text } = await searchParams;
  return <PrivateReportFlow initialText={text ?? ""} />;
}
