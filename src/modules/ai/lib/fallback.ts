// Internal: the pure keyword fallback classifier.
//
// Runs with NO network and NO AI when the model is missing, errors, or times
// out. It produces a safe, never-blocking result:
//
//   - category: every team's keyword list is SCORED against the text (longer,
//     more specific phrases weigh more) and the best score wins. Safety wins
//     outright when the text reads as an emergency or a hazard. Facilities is
//     only the default when nothing matches at all.
//   - tier: Urgent for an active emergency, High for hazards and "nobody can
//     use it" problems (no heat, flooding, no power, a broken lock…), Low for
//     cosmetic / minor annoyances, Medium otherwise.
//
// The result is always marked source:"fallback" by the caller so downstream
// flows can flag it.
import type { Category, Office, Tier } from "@/types";
import { detectEmergency, detectSafetyHazard } from "@/modules/emergency";
import { isSpam } from "@/packages/abuse";

import type { ClassificationObject } from "./schema";

/** Team → keywords. Whole-word matches; a multi-word phrase scores higher. */
const CATEGORY_KEYWORDS: ReadonlyArray<readonly [Category, readonly string[]]> = [
  [
    "City",
    ["pothole", "public street", "street light", "streetlight", "crosswalk", "traffic light", "bus stop", "city street", "road", "mass ave", "public sidewalk"],
  ],
  [
    "Dining",
    [
      "dining", "dining hall", "vending", "vending machine", "ice cream", "ice-cream", "soft-serve", "soft serve",
      "cafeteria", "cafe", "food", "servery", "meal", "meal plan", "lunch", "dinner", "breakfast", "snack",
      "coffee", "coffee machine", "espresso", "soda", "drink", "juice", "menu", "cashier", "tray", "salad bar",
      "pizza", "grill", "toaster", "food poisoning", "undercooked", "raw chicken", "stale", "expired", "moldy food",
    ],
  ],
  [
    "IT",
    [
      "wifi", "wi-fi", "eduroam", "internet", "network", "ethernet", "router", "printer", "printing", "print",
      "scanner", "projector", "hdmi", "smartboard", "display", "monitor", "computer", "laptop", "lab computer",
      "login", "log in", "password", "account", "email", "canvas", "portal", "website", "app", "software", "vpn",
      "duo", "2fa", "zoom", "keyboard", "server", "tv", "screen", "charging station", "card reader",
    ],
  ],
  [
    "Housing",
    [
      "dorm", "dorm room", "residence hall", "res hall", "suite", "my room", "bedroom", "bed", "mattress", "closet",
      "roommate", "laundry", "washer", "washing machine", "dryer", "shower", "hot water", "radiator", "heater",
      "dorm bathroom", "dorm kitchen", "kitchen", "fridge", "refrigerator", "microwave", "stove", "oven",
      "mice", "rat", "rats", "roach", "roaches", "cockroach", "bed bugs", "bedbugs", "bugs", "ants", "pests",
      "mold", "mildew", "keycard", "room key", "locked out",
    ],
  ],
  [
    "Grounds",
    [
      "grass", "lawn", "tree", "branch", "fallen branch", "leaves", "snow", "unplowed", "plow", "salt", "landscap",
      "path", "walkway", "litter", "trash", "garbage", "overflowing trash", "bin", "recycling", "bench", "parking",
      "parking lot", "bike rack", "field", "court", "fence", "puddle", "mud", "sprinkler", "flowers", "courtyard",
      "quad", "outdoor", "outside",
    ],
  ],
  [
    "Safety",
    [
      "fire", "smoke", "railing", "handrail", "banister", "wiring", "exposed wire", "bare wire", "sparking", "sparks",
      "extinguisher", "smoke detector", "detector", "fire alarm", "alarm", "broken lock", "lock", "exposed", "hazard",
      "unsafe", "dangerous", "gas", "gas smell", "chemical", "spill", "broken glass", "shattered", "blue light",
      "emergency phone", "security camera", "suspicious", "stolen", "theft", "break-in", "trip hazard", "slippery",
      "ice on", "icy", "injury", "hurt", "carbon monoxide",
    ],
  ],
  [
    "Facilities",
    [
      "door", "automatic door", "elevator", "light", "lights", "lightbulb", "light bulb", "window", "wall",
      "ceiling", "ceiling tile", "roof", "leak", "leaking", "dripping", "water damage", "faucet", "sink", "toilet",
      "restroom", "bathroom", "urinal", "plumbing", "pipe", "clogged", "water fountain", "bottle filler", "ac",
      "air conditioning", "a/c", "hvac", "heat", "heating", "too hot", "too cold", "temperature", "vent",
      "outlet", "power", "electricity", "stairs", "stairwell", "floor", "carpet", "tile", "chair", "desk", "table",
      "whiteboard", "chalkboard", "classroom", "lecture hall", "lab", "library", "ramp", "wheelchair",
      "accessibility", "paint", "broken",
    ],
  ],
];

/** Signals that a problem stops people using something, or is risky. */
const HIGH_PATTERNS: readonly RegExp[] = [
  /\b(flood(ed|ing)?|water everywhere|sewage|overflowing toilet|burst pipe)\b/i,
  /\b(no (heat|heating|hot water|water|power|electricity|ac|air conditioning)|power (is )?out|power outage|blackout)\b/i,
  /\b(elevator (is )?(down|out|broken|stuck)|stuck in the elevator|wheelchair|ramp|accessib)/i,
  /\b(can'?t (get in|lock|close)|won'?t lock|locked out|door (is )?(broken|won'?t close))\b/i,
  /\b(mold|mildew|bed ?bugs|rats?|mice|roach(es)?|cockroach|pests?)\b/i,
  /\b(food poisoning|raw chicken|undercooked|made me sick|got sick)\b/i,
  /\b(whole (building|floor|dorm)|entire (building|floor|dorm)|everyone|nobody can|all (the )?(students|rooms))\b/i,
  /\b(ceiling (is )?(caving|falling|collapsing)|falling (apart|down))\b/i,
  /\b(freezing|below freezing|way too (hot|cold)|unbearable)\b/i,
];

/** Cosmetic or minor annoyances. */
const LOW_PATTERNS: readonly RegExp[] = [
  /\b(scratch(ed)?|scuff(ed)?|graffiti|stain(ed)?|chipped|peeling paint|paint)\b/i,
  /\b(squeak(y|s|ing)?|creak(y|s|ing)?|wobbl(y|es|ing)|loose (screw|handle|tile))\b/i,
  /\b(flicker(s|ing)?|dim|a bit|kind of|sometimes|slightly|minor|small|cosmetic|ugly|annoying)\b/i,
  /\b(out of (napkins|straws|forks|cups|paper towels)|empty (soap|paper towel))\b/i,
];

/** Words that say something is wrong — a real report almost always has one. */
const PROBLEM_WORDS =
  /\b(broken|broke|break(s|ing)?|not working|doesn'?t work|isn'?t working|won'?t|can'?t|cannot|stopped|stuck|jammed|leak(s|ing|y)?|drip(s|ping)?|flood|clog(ged)?|crack(ed|s)?|damaged?|missing|out of|empty|dirty|gross|smell(s|y)?|stinks?|mold|dead|down|off|out|loose|fell|fallen|falling|blocked|overflow(ing)?|spill(ed)?|no (heat|water|power|wifi|internet)|too (hot|cold|loud)|noisy|flicker(s|ing)?|dim|dark|unsafe|danger(ous)?|hazard|problem|issue|error|fix|repair|replace|need(s|ed)?|help|again|keeps|always|never|ate my|took my|bugs?|pests?|mice|rats?|ants?)\b/i;

const NOT_A_REPORT_REASON =
  "This doesn't look like something broken on campus. Say what's wrong and where, like “the printer in Hayden is jammed”.";

/** Honorifics and relationship/accusation phrases → names-a-person. */
const PERSON_PATTERNS: readonly RegExp[] = [
  /\b(professor|prof\.?|dr\.?|dean|coach|ra|mr\.?|mrs\.?|ms\.?)\s+[A-Z][a-z]+/i,
  /\bmy (roommate|professor|ta|coach|advisor|neighbor|classmate|teacher|boss)\b/i,
  /\bsomeone keeps\b/i,
  /\b(he|she|they) (keeps|said|did|threatened|harassed|followed)\b/i,
];

/** Words that say WHERE, not WHAT — they barely count toward a team. */
const WHERE_WORDS = new Set([
  "library", "classroom", "lecture hall", "lab", "outside", "outdoor", "quad", "floor", "courtyard", "my room",
  "kitchen", "bathroom", "restroom", "dining hall",
]);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const wordRe = (kw: string) => new RegExp(`(^|[^a-z0-9])${escape(kw)}([^a-z0-9]|$)`, "i");

/** Score every team; return the best plus the keyword that scored most. */
function scoreCategories(text: string): { category: Category; item: string | null } {
  let best: { category: Category; score: number; item: string | null } = {
    category: "Facilities",
    score: 0,
    item: null,
  };
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    let score = 0;
    let item: string | null = null;
    let itemWeight = 0;
    for (const kw of keywords) {
      if (!wordRe(kw).test(text)) continue;
      // Multi-word / longer phrases are more specific → weigh more.
      const weight = WHERE_WORDS.has(kw) ? 0.75 : 1 + kw.split(/\s+/).length + (kw.length > 6 ? 0.5 : 0);
      score += weight;
      if (weight > itemWeight) {
        itemWeight = weight;
        item = kw;
      }
    }
    // Strictly greater: earlier (more specific) teams win ties over Facilities.
    if (score > best.score) best = { category, score, item };
  }
  return { category: best.category, item: best.item };
}

function guessTier(text: string, emergency: boolean, hazard: boolean): Tier {
  if (emergency) return "Urgent";
  if (hazard || HIGH_PATTERNS.some((re) => re.test(text))) return "High";
  if (LOW_PATTERNS.some((re) => re.test(text))) return "Low";
  return "Medium";
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

/**
 * Pure keyword classification. `mode` only affects `suggestedOffice`:
 * private mode defaults to Dean of Students (spec hard default), with a couple
 * of obvious keyword overrides; public mode never suggests an office.
 */
export function keywordClassify(
  text: string,
  mode: "public" | "private",
): ClassificationObject {
  const emergency = detectEmergency(text).isEmergency;
  const hazard = detectSafetyHazard(text).isHazard;
  const scored = scoreCategories(text);
  // Anything dangerous goes to Safety, whatever else it mentions.
  const category: Category = emergency || hazard ? "Safety" : scored.category;
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

  // Not a report: spam / jokes / noise, or nothing about a campus problem at all.
  const offTopic = !emergency && !hazard && scored.item === null && !PROBLEM_WORDS.test(text);
  const rejected = isSpam(text) || offTopic;

  return {
    category,
    item: scored.item ?? text.toLowerCase().split(/\s+/).slice(0, 3).join(" "),
    title: draftTitle(text),
    tier: guessTier(text, emergency, hazard),
    missingDetails: ["location"],
    namesPerson,
    rejected,
    rejectionReason: rejected ? NOT_A_REPORT_REASON : null,
    suggestedOffice,
  };
}
