// Deterministic office routing for direct (private) reports — hidden impl.
//
// Office selection is SAFE BY CONSTRUCTION: the hard rules below run on every
// call, with or without the AI, so a wrong or absent AI suggestion can never
// send a protected-class or immediate-danger report to the wrong place.
//
// Order of precedence (highest first):
//   1. Immediate danger        → emergency takeover first, then Campus Police.
//   2. Harassment / discrimination / protected-class → Title IX.
//   3. The AI's suggestedOffice, if provided and valid.
//   4. Fallback                → Dean of Students (unclear, or AI off).

import type { Office } from "@/types";
import { OFFICES } from "@/types";

/** Input to routing: the student's text plus an optional AI suggestion. */
export interface RouteInput {
  text: string;
  /** From the classifier's `suggestedOffice`; absent when the AI is off. */
  suggestedOffice?: Office;
}

/** The routing decision. `emergency` forces the takeover before any paperwork. */
export interface RouteDecision {
  office: Office;
  /** True when immediate danger was detected (takeover → Campus Police). */
  emergency: boolean;
  /** True when a deterministic hard rule selected the office (not the AI). */
  hardRule: boolean;
}

/** Offices offered in the review-screen override dropdown (all of them). */
export const OFFICE_OPTIONS: readonly Office[] = OFFICES;

const DEFAULT_OFFICE: Office = "Dean of Students";

// Immediate, in-progress danger. Kept narrow (present-tense, active) so a
// retrospective account doesn't trip the takeover — that is handled as a
// sensitive report, not an emergency.
const DANGER_PATTERNS: RegExp[] = [
  /\b(right now|happening now|in immediate danger|about to)\b/i,
  /\b(following me|chasing me|breaking in|has a (weapon|gun|knife)|threatening to)\b/i,
  /\b(being attacked|just attacked|being assaulted)\b/i,
];

// Harassment / discrimination / protected-class → Title IX, by hard rule.
const TITLE_IX_PATTERNS: RegExp[] = [
  /\b(sexual(ly)?\s+(harass|assault|misconduct)|sexual\s+violence)\b/i,
  /\bharass(ing|ment|ed)?\b/i,
  /\bdiscriminat(e|ed|ion|ory|ing)\b/i,
  // Protected classes / bias.
  /\b(about my|because of my|my)\s+(race|religion|gender|sex|sexual orientation|disability|ethnicity|national origin)\b/i,
  /\b(racist|sexist|homophobic|transphobic|slur)\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

function isValidOffice(office: Office | undefined): office is Office {
  return office !== undefined && (OFFICES as readonly string[]).includes(office);
}

/**
 * Choose the office for a private report. Hard rules override the AI; the AI
 * suggestion is used only when no hard rule fires; otherwise Dean of Students.
 */
export function routeOfficeFor(input: RouteInput): RouteDecision {
  const text = input.text ?? "";

  // 1. Immediate danger: emergency first, routed to Campus Police.
  if (matchesAny(text, DANGER_PATTERNS)) {
    return { office: "Campus Police", emergency: true, hardRule: true };
  }

  // 2. Protected-class / harassment / discrimination → Title IX.
  if (matchesAny(text, TITLE_IX_PATTERNS)) {
    return { office: "Title IX", emergency: false, hardRule: true };
  }

  // 3. Trust the AI suggestion when it is a valid office.
  if (isValidOffice(input.suggestedOffice)) {
    return { office: input.suggestedOffice, emergency: false, hardRule: false };
  }

  // 4. Fallback: Dean of Students handles anything unclear.
  return { office: DEFAULT_OFFICE, emergency: false, hardRule: false };
}

/** The exact, non-misleading privacy notice shown on the review screen. */
export function buildPrivacyNotice(office: Office): string {
  return `Private, not confidential. Only ${office} will see this. Staff may be required to act on what you report.`;
}
