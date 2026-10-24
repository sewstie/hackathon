// Internal implementation of spam / off-topic screening, hidden in a subfolder.
//
// The AI classifier (Track A, ticket 02) returns a `rejected` flag + reason on
// the shared classification result. When that verdict is present we trust it:
// the AI has judged the text, so its call is final either way. When no verdict
// is supplied (AI slow, down, or key missing) we fall back to a blunt but pure
// keyword screen so the app still rejects obvious spam with the AI off.
//
// On any rejection the student's text is ALWAYS preserved and NOTHING is
// persisted, so an honest mistake is one edit away from being filed.

/** The slice of the shared classification result this module consumes. */
export interface ClassificationVerdict {
  rejected: boolean;
  reason?: string;
}

/** What a caller supplies to screen a submission. */
export interface ScreenInput {
  /** The student's raw text — preserved verbatim in the result. */
  text: string;
  /** The classifier's verdict, when the AI produced one. Omit to force fallback. */
  classification?: ClassificationVerdict;
}

/** The screening outcome. `persist` is false whenever `rejected` is true. */
export interface ScreenResult {
  rejected: boolean;
  /** Friendly reason to show the student; present only when rejected. */
  reason?: string;
  /** The student's text, kept so they can fix and resubmit. */
  text: string;
  /** Whether the report may be persisted. Always false on rejection. */
  persist: boolean;
}

/** Default copy when the keyword fallback catches spam / off-topic text. */
const FALLBACK_REASON =
  "This doesn't look like a campus repair report. Edit it and try again.";

/**
 * Keyword cues for spam / off-topic text. Deliberately conservative so honest
 * reports are not caught; the AI classifier is the real judge when present.
 */
const SPAM_PATTERNS: readonly RegExp[] = [
  /\bfree\s+(crypto|money|gift\s*cards?|prize)\b/i,
  /\bbuy\s+(cheap\s+)?(followers|likes|views)\b/i,
  /\b(click|tap)\s+(this|the)\s+link\b/i,
  /\b(win|won)\s+(a\s+)?prize\b/i,
  /\bcasino|viagra|crypto\s*wallet\b/i,
  /\bhttps?:\/\/\S+/i, // bare links in a repair report are almost always spam
];

function looksLikeSpam(text: string): boolean {
  return SPAM_PATTERNS.some((re) => re.test(text));
}

/**
 * Screen a submission. When a classifier verdict is present it is authoritative;
 * otherwise a pure keyword fallback decides. Rejection always preserves the
 * text and forbids persistence. Pure: no I/O, no mutation.
 */
export function screenReportImpl(input: ScreenInput): ScreenResult {
  const { text, classification } = input;

  if (classification) {
    // The AI has spoken — trust it either way.
    if (classification.rejected) {
      return {
        rejected: true,
        reason: classification.reason ?? FALLBACK_REASON,
        text,
        persist: false,
      };
    }
    return { rejected: false, text, persist: true };
  }

  // No verdict: fall back to the keyword screen.
  if (looksLikeSpam(text)) {
    return { rejected: true, reason: FALLBACK_REASON, text, persist: false };
  }
  return { rejected: false, text, persist: true };
}
