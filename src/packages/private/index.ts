// private — the direct (private) report seam for UniFix.
//
// Public interface (entry point): route a sensitive report to exactly one
// office (deterministic hard rules override the AI; Dean of Students is the
// fallback), build the exact privacy notice, and file the report through the
// store's office-scoped path. Implementation — the hard-rule patterns, the AI
// precedence, and the store wiring — is hidden in lib/.

import {
  buildPrivacyNotice,
  routeOfficeFor,
  type RouteDecision,
  type RouteInput,
} from "./lib/routing";
import { createPrivate, type PrivateFiling } from "./lib/filing";
import type { Store } from "@/lib/store";
import type { Office, PrivateReport } from "@/types";

export type { RouteInput, RouteDecision } from "./lib/routing";
export type { PrivateFiling } from "./lib/filing";
export { OFFICE_OPTIONS } from "./lib/routing";

/**
 * Decide which office a private report goes to. Hard rules (immediate danger →
 * Campus Police with an emergency takeover; harassment/discrimination/protected
 * class → Title IX) run on every call and override any AI suggestion; a valid
 * `suggestedOffice` is honored only when no hard rule fires; otherwise it falls
 * back to Dean of Students. Works with the AI off.
 */
export function routeOffice(input: RouteInput): RouteDecision {
  return routeOfficeFor(input);
}

/** The exact "private, not confidential" notice naming the chosen office. */
export function privacyNotice(office: Office): string {
  return buildPrivacyNotice(office);
}

/**
 * File a direct (private) report to its office through the store. Private
 * reports never reach the public reports table, so they stay out of the feed,
 * map, Fixed-this-week, duplicates, co-signing, and Ari history.
 */
export function filePrivateReport(
  store: Store,
  filing: PrivateFiling,
): Promise<PrivateReport> {
  return createPrivate(store, filing);
}
