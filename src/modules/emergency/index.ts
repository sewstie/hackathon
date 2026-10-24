// CampusFix emergency & safety — the module's PUBLIC INTERFACE.
//
// Safety beats everything. This module owns three things:
//
//   1. detectEmergency(text)   — PURE. Runs client-side the instant the student
//      submits, BEFORE any network call. On a match the UI renders the
//      full-screen Call-911 takeover immediately. The AI classifier (ticket 02)
//      may independently RAISE an emergency (Urgent / life-safety), but can
//      NEVER close one — only the explicit "Not an emergency" action dismisses
//      it, which files the report to Safety as Urgent.
//
//   2. detectSafetyHazard(text) — PURE, lower-severity. Drives a softer,
//      non-takeover red note (campus-police number, no quick fixes).
//
//   3. logEmergencyCall(...)   — the audit trail: every Call 911 / Call Campus
//      Police tap is logged through the shared Store seam (never auto-dialed —
//      the user taps a tel: link themselves; this records that they did).
//
// The two detectors are the test surface and have no dependencies at all; the
// logger takes the Store seam so it stays testable with the in-memory store.
import type { Store } from "@/lib/store";

import {
  detectEmergency,
  detectSafetyHazard,
  type EmergencyDetection,
  type SafetyHazardDetection,
} from "./lib/detect";

export { detectEmergency, detectSafetyHazard };
export type { EmergencyDetection, SafetyHazardDetection };

/** Which safety button was tapped. */
export type EmergencyCallKind = "call-911" | "call-campus-police";

export interface LogEmergencyCallInput {
  /** The data seam to append the audit row through. */
  store: Store;
  /** The acting (demo) user who tapped the button. */
  actorId: string;
  /** Call 911 or Call Campus Police. */
  kind: EmergencyCallKind;
  /**
   * The report this tap relates to, if one exists yet. Emergency detection runs
   * BEFORE a report is filed, so this is usually absent; we bucket those taps
   * under the stable id "emergency" so the audit trail is still queryable.
   */
  reportId?: string;
}

/**
 * Record a Call 911 / Call Campus Police tap in the append-only access log.
 * The app NEVER auto-dials; the button is a `tel:` link the user taps, and this
 * records that it happened (spec story 30). Resolves to void — logging must
 * never block the user from reaching help, so callers fire-and-forget.
 */
export async function logEmergencyCall(input: LogEmergencyCallInput): Promise<void> {
  await input.store.logAccess({
    actorId: input.actorId,
    action: input.kind,
    reportId: input.reportId ?? "emergency",
  });
}
