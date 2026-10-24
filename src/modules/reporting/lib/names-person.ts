// Internal: the names-a-person guard for the PUBLIC report path (ticket 06).
//
// Public reports must never name a specific person (constraint 2). Detection
// leans on the AI classifier's `namesPerson` flag, but must still work with the
// AI OFF — so this pure keyword fallback (honorifics + relationship/accusation
// phrases) is OR-ed in. If EITHER the AI flag OR the keywords fire, the public
// submission is blocked and nothing is persisted; the student is offered
// Rephrase or Send privately (the private path is allowed to name people).
//
// This mirrors the ai module's own fallback patterns on purpose: the public
// block cannot depend on the AI being reachable.

/** Honorifics and relationship/accusation phrases → names-a-person. */
const PERSON_PATTERNS: readonly RegExp[] = [
  // Honorific immediately followed by a capitalized name, e.g. "Professor Smith".
  /\b(professor|prof\.?|dr\.?|dean|coach|ra|mr\.?|mrs\.?|ms\.?)\s+[A-Z][a-z]+/i,
  // Relationship references to a specific person.
  /\bmy (roommate|professor|ta|coach|advisor|neighbor|classmate|teacher|boss)\b/i,
  // Accusation / targeting phrasing aimed at an individual.
  /\bsomeone keeps\b/i,
  /\b(he|she|they) (keeps|said|did|threatened|harassed|followed)\b/i,
];

/** The exact copy shown when a public report is blocked (from the brief). */
export const NAMES_PERSON_BLOCK_MESSAGE =
  "Public reports can't name people. You can rephrase it, or send it privately to the right office.";

/** Pure keyword fallback: true when the text appears to name a specific person. */
export function keywordNamesPerson(text: string): boolean {
  return PERSON_PATTERNS.some((re) => re.test(text));
}

/**
 * Decide whether a PUBLIC submission is blocked for naming a person. The AI's
 * `namesPerson` flag (when available) is OR-ed with the pure keyword fallback
 * so the guard holds even with the AI off. Returns the exact block copy when
 * blocked so the caller never has to restate it.
 */
export function evaluateNamesPerson(
  text: string,
  aiNamesPerson: boolean,
): { blocked: boolean; message: string } {
  const blocked = aiNamesPerson || keywordNamesPerson(text);
  return { blocked, message: NAMES_PERSON_BLOCK_MESSAGE };
}
