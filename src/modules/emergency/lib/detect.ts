// Internal: the two PURE safety detectors.
//
// Both run client-side the instant the student submits, with NO network and NO
// AI, so safety is never on the critical path. They are deliberately keyword-
// driven and conservative:
//
//   - detectEmergency  → an ACTIVE, life-threatening situation. A match renders
//     the full-screen Call-911 takeover immediately (before any AI runs). The
//     AI may independently RAISE an emergency later, but can never close one.
//   - detectSafetyHazard → a NON-active hazard (broken railing, exposed wiring,
//     ice on stairs, broken lock, missing extinguisher, chirping detector).
//     Drives a softer red note (campus-police number, no quick fixes), never a
//     takeover.
//
// The two are kept distinct on purpose: a broken handrail is a hazard note, not
// a 911 takeover (ticket 05 / spec cases 1, 2, 15).

/** Result of the instant emergency check. */
export interface EmergencyDetection {
  /** True when the text describes an active, life-threatening situation. */
  isEmergency: boolean;
  /** A short, human one-line reason shown on the takeover. */
  reason: string;
}

/** Result of the softer, non-takeover hazard check. */
export interface SafetyHazardDetection {
  /** True when the text describes a non-active safety hazard. */
  isHazard: boolean;
  /** A short label naming the hazard kind, for the red note. */
  reason: string;
}

/**
 * Active-emergency keyword table, checked in order; first match wins and
 * supplies the one-line reason. Phrases describe something HAPPENING NOW
 * (fire/smoke, medical collapse, violence, hazardous release).
 */
const EMERGENCY_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(active shooter|gunman|shooting|someone (has|with) a gun)\b/i, "Possible active threat"],
  // "fire" / "smoke" as an active event — but NOT the hazard compounds
  // "fire extinguisher" or "smoke/CO detector", which are the softer note.
  [/\bfire\b(?!\s+extinguisher)|\bsmoke\b(?!\s+detector)|\bburning\b|\bflames?\b/i, "Possible fire"],
  [/\bgas leak\b|\bcarbon monoxide\b|\bchemical spill\b|\btoxic (fumes|gas)\b/i, "Possible hazardous leak"],
  [/\b(heart attack|stroke|seizure|overdose)\b/i, "Possible medical emergency"],
  [/\b(not breathing|can'?t breathe|unconscious|collapsed|passed out|unresponsive)\b/i, "Someone may be unresponsive"],
  [/\bbleeding (badly|out|heavily)\b|\bwon'?t stop bleeding\b/i, "Serious injury"],
  [/\b(being |getting )?(assault(ed|ing)?|attacked|stabbed|strangl)\b/i, "Possible violence in progress"],
  [/\bchoking\b|\bdrowning\b|\belectrocut/i, "Possible medical emergency"],
];

/**
 * Non-active hazard keyword table. These are real safety concerns that warrant
 * a warning + campus-police number, but are NOT an active 911 emergency.
 */
const HAZARD_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(hand ?rail|railing|banister)\b/i, "Broken railing"],
  [/\bexposed wir(e|ing)\b|\bbare wir(e|ing)\b|\bsparking\b/i, "Exposed wiring"],
  [/\bice\b.*\b(stairs?|steps?|walk|path|entrance)\b|\b(stairs?|steps?|walk|path)\b.*\bice\b/i, "Ice hazard"],
  [/\b(broken|busted|faulty) lock\b|\block is broken\b|\bdoor (won'?t|doesn'?t) lock\b/i, "Broken lock"],
  [/\b(missing|no) (fire )?extinguisher\b|\bextinguisher is (missing|gone)\b/i, "Missing extinguisher"],
  [/\b(smoke |carbon monoxide |co )?detector\b.*(chirp|beep|dead battery|low battery)|chirping (smoke )?detector\b/i, "Detector needs service"],
];

export function detectEmergency(text: string): EmergencyDetection {
  for (const [re, reason] of EMERGENCY_PATTERNS) {
    if (re.test(text)) return { isEmergency: true, reason };
  }
  return { isEmergency: false, reason: "" };
}

export function detectSafetyHazard(text: string): SafetyHazardDetection {
  // An active emergency is handled by the takeover, not the softer note.
  if (detectEmergency(text).isEmergency) {
    return { isHazard: false, reason: "" };
  }
  for (const [re, reason] of HAZARD_PATTERNS) {
    if (re.test(text)) return { isHazard: true, reason };
  }
  return { isHazard: false, reason: "" };
}
