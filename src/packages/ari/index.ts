// ari — the assistant seam for CampusFix.
//
// Public interface (entry point): after classification, Ari offers a one-line
// message, a history line computed from seeded public reports, and up to two
// CURATED quick fixes — and stands down entirely for emergencies, safety
// hazards, or private person-naming reports. "That fixed it" logs a
// self-resolution and files nothing; "Still broken — file it" emits a continue
// signal. Implementation (the similarity rule, curated-fix matching, the
// typical fix-time table, suppression logic) is hidden in lib/.

import {
  computeHistoryLine,
  computeQuickFixes,
  continueSignal,
  introMessage,
  isSuppressed,
  logThatFixedIt,
  MAX_QUICK_FIXES,
  type AriContext,
  type AriContinueSignal,
  type AriSuppressInput,
} from "./lib/ari";
import type { Store } from "@/lib/store";
import type { Category, QuickFix, SelfResolution } from "@/types";

export { MAX_QUICK_FIXES } from "./lib/ari";
export type {
  AriContext,
  AriContinueSignal,
  AriSuppressInput,
} from "./lib/ari";

/**
 * Ari's history line for a classified report: "{n} similar reports this
 * semester · usually fixed in ~{d} days", or "First report like this here."
 * when there is no history. Reads public reports only, so private reports
 * never appear in Ari history.
 */
export function ariHistoryLine(
  store: Store,
  ctx: AriContext,
): Promise<string> {
  return computeHistoryLine(store, ctx);
}

/**
 * Up to two curated quick fixes for this report's category (+ item). Quick
 * fixes are seeded or staff-promoted rows — never AI-generated.
 */
export function ariQuickFixes(
  store: Store,
  ctx: AriContext,
): Promise<QuickFix[]> {
  return computeQuickFixes(store, ctx);
}

/**
 * Whether Ari must stand down: true for an active emergency, a safety hazard,
 * or a private report that names a person. When true, show no popup and no
 * quick fixes.
 */
export function ariSuppressed(input: AriSuppressInput): boolean {
  return isSuppressed(input);
}

/** Ari's short, one-line intro keyed by the report's category. */
export function ariIntro(category: Category): string {
  return introMessage(category);
}

/**
 * Log a self-resolution when the student taps "That fixed it". No report is
 * filed; the logged row is returned for a confirmation.
 */
export function thatFixedIt(
  store: Store,
  input: AriContext & { userId: string },
): Promise<SelfResolution> {
  return logThatFixedIt(store, input);
}

/** The continue signal emitted when the student taps "Still broken — file it". */
export function stillBrokenSignal(): AriContinueSignal {
  return continueSignal();
}
