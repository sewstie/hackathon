// Internal: the pure keyword fallback classifier.
//
// Runs with NO network and NO AI when the model is missing, errors, or times
// out. It produces a safe, never-blocking result: a best-effort category from
// keywords (defaulting to Facilities), a Medium tier, and the honorific/person
// detection the names-a-person block (ticket 06) leans on. The result is always
// marked source:"fallback" by the caller so downstream flows can flag it.
import type { Category, Office } from "@/types";

import type { ClassificationObject } from "./schema";

/** Keyword → category table, checked in order; first match wins. */
const CATEGORY_KEYWORDS: ReadonlyArray<readonly [Category, readonly string[]]> = [
  ["City", ["pothole", "public street", "sidewalk", "street light", "streetlight", "crosswalk"]],
  ["Dining", ["dining", "vending", "ice cream", "ice-cream", "cafeteria", "food", "servery", "meal"]],
  ["IT", ["wifi", "wi-fi", "internet", "network", "ethernet", "printer", "projector", "login", "password"]],
  ["Housing", ["dorm", "roommate", "residence hall", "heater", "heating", "radiator", "bathroom", "shower", "bed"]],
  ["Grounds", ["grass", "tree", "leaves", "snow", "landscap", "sidewalk ice", "path", "litter"]],
  ["Safety", ["fire", "smoke", "railing", "handrail", "wiring", "extinguisher", "detector", "lock", "exposed", "hazard"]],
  ["Facilities", ["door", "elevator", "light", "window", "wall", "ceiling", "leak", "faucet", "ac", "hvac", "broken"]],
];

/** Honorifics and relationship/accusation phrases → names-a-person. */
const PERSON_PATTERNS: readonly RegExp[] = [
  /\b(professor|prof\.?|dr\.?|dean|coach|ra|mr\.?|mrs\.?|ms\.?)\s+[A-Z][a-z]+/i,
  /\bmy (roommate|professor|ta|coach|advisor|neighbor|classmate|teacher|boss)\b/i,
  /\bsomeone keeps\b/i,
  /\b(he|she|they) (keeps|said|did|threatened|harassed|followed)\b/i,
];

function guessCategory(text: string): Category {
  const t = text.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => t.includes(kw))) return category;
  }
  return "Facilities";
}

function detectNamesPerson(text: string): boolean {
  return PERSON_PATTERNS.some((re) => re.test(text));
}

/** A short neutral title: first sentence/clause, trimmed and capped. */
function draftTitle(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  const firstClause = cleaned.split(/[.!?\n]/)[0] ?? cleaned;
  const capped = firstClause.slice(0, 60).trim();
  if (!capped) return "Reported issue";
  return capped.charAt(0).toUpperCase() + capped.slice(1);
}

/** A best-effort item keyword from the matched category, else the raw text. */
function draftItem(text: string, category: Category): string {
  const t = text.toLowerCase();
  const entry = CATEGORY_KEYWORDS.find(([c]) => c === category);
  const hit = entry?.[1].find((kw) => t.includes(kw));
  return hit ?? t.split(/\s+/).slice(0, 3).join(" ");
}

/**
 * Pure keyword classification. `mode` only affects `suggestedOffice`:
 * private mode defaults to Dean of Students (spec hard default), with a couple
 * of obvious keyword overrides; public mode never suggests an office.
 */
export function keywordClassify(
  text: string,
  mode: "public" | "private",
): ClassificationObject {
  const category = guessCategory(text);
  const namesPerson = detectNamesPerson(text);

  let suggestedOffice: Office | null = null;
  if (mode === "private") {
    const t = text.toLowerCase();
    if (/\b(harass|discriminat|racist|race|gender|sexual|assault|title ix)\b/.test(t)) {
      suggestedOffice = "Title IX";
    } else if (category === "Housing") {
      suggestedOffice = "Housing";
    } else if (category === "IT") {
      suggestedOffice = "IT Security";
    } else {
      suggestedOffice = "Dean of Students"; // spec: unclear / AI-off default
    }
  }

  return {
    category,
    item: draftItem(text, category),
    title: draftTitle(text),
    tier: "Medium", // safe default
    missingDetails: ["location"],
    namesPerson,
    rejected: false,
    rejectionReason: null,
    suggestedOffice,
  };
}
