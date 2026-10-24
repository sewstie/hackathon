// UniFix — abuse protection (rate limit + spam rejection).
//
// A deep module with a tiny public surface: keep the queue clean without
// punishing honest reporters. Two independent guards sit in front of filing a
// public report:
//
//   • A rolling-hour rate limit — at most 5 filed reports per user per hour.
//     Co-signs never count; emergencies are exempt (safety beats throttling).
//     The 6th within the hour is blocked with fixed friendly copy. The
//     threshold is a tunable constant.
//
//   • Spam / off-topic screening — trusts the AI classifier's `rejected` flag
//     and reason when present, and falls back to a pure keyword screen when the
//     AI is slow, down, or unconfigured. On rejection the student's text is
//     always preserved and nothing is persisted.
//
// Both guards are consumed through this entry point only; implementation lives
// in lib/ and is unreachable from outside the package.

import type { Store } from "@/lib/store";
import {
  RATE_LIMIT_MESSAGE,
  RATE_LIMIT_PER_HOUR,
  type RateLimitInput,
  type RateLimitResult,
  checkRateLimitImpl,
} from "./lib/rate-limit";
import {
  type ClassificationVerdict,
  type ScreenInput,
  type ScreenResult,
  screenReportImpl,
} from "./lib/screen";

export { RATE_LIMIT_PER_HOUR, RATE_LIMIT_MESSAGE };
export type {
  RateLimitInput,
  RateLimitResult,
  ClassificationVerdict,
  ScreenInput,
  ScreenResult,
};

/**
 * Decide whether a user may file another public report right now. Counts the
 * user's filed reports within the rolling hour ending at `now` (co-signs are
 * not reports, so they never count); emergencies short-circuit to allowed.
 * Reads the store; never writes. Returns the live recent count and, when
 * blocked, the exact friendly copy.
 */
export function checkRateLimit(
  store: Store,
  input: RateLimitInput,
): Promise<RateLimitResult> {
  return checkRateLimitImpl(store, input);
}

/**
 * Screen a submission for spam / off-topic content. When the AI classifier
 * supplied a verdict it is authoritative; otherwise a pure keyword fallback
 * decides. On rejection the student's text is preserved and `persist` is false,
 * so nothing is written and an honest mistake is one edit away from filing.
 * Pure: no I/O.
 */
export function screenReport(input: ScreenInput): ScreenResult {
  return screenReportImpl(input);
}
