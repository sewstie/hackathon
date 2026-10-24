// Ari history line + quick fixes — hidden implementation.
//
// Ari's helpful moment after classification: a one-line history read from
// seeded data ("{n} similar reports this semester · usually fixed in ~{d}
// days" or "First report like this here.") and up to two CURATED quick fixes.
// Quick fixes are curated rows (seeded or staff-promoted) — never AI-generated.
//
// Private reports are intentionally invisible here: Ari reads only the public
// reports table via the store, so private reports never contribute to history.

import type { Category, QuickFix, Report, SelfResolution } from "@/types";
import type { Store } from "@/lib/store";

/** What Ari needs to talk about: the classified report's campus, category, item. */
export interface AriContext {
  campusId: string;
  category: Category;
  item: string;
}

/** Signals that make Ari stand down — safety and privacy beat a quick fix. */
export interface AriSuppressInput {
  /** An emergency takeover is up. */
  emergency?: boolean;
  /** A (non-takeover) safety-hazard note is showing. */
  safetyHazard?: boolean;
  /** A private report that names a specific person. */
  privatePersonNaming?: boolean;
}

/** The report flow consumes this when the student taps "Still broken — file it". */
export interface AriContinueSignal {
  continue: true;
}

/** Cap on quick fixes Ari ever shows at once. */
export const MAX_QUICK_FIXES = 2;

/**
 * Typical time-to-fix (in days) used for the history line, keyed by category.
 * These are curated, campus-agnostic estimates — the store has no fix-time
 * timestamps to derive them from — and default to 3 days.
 */
const FIX_DAYS_BY_CATEGORY: Partial<Record<Category, number>> = {
  IT: 3,
  Dining: 4,
  Facilities: 5,
  Housing: 4,
  Grounds: 6,
  Safety: 1,
};
const DEFAULT_FIX_DAYS = 3;

function normalizeItem(item: string): string {
  return item.trim().toLowerCase();
}

/** True when a report is "similar": same campus, category, and normalized item. */
function isSimilar(report: Report, ctx: AriContext): boolean {
  return (
    report.campusId === ctx.campusId &&
    report.category === ctx.category &&
    normalizeItem(report.item) === normalizeItem(ctx.item)
  );
}

/**
 * Build Ari's history line from seeded public reports. Counts every similar
 * report this semester; when none exist it reads the first-report line.
 */
export async function computeHistoryLine(
  store: Store,
  ctx: AriContext,
): Promise<string> {
  const reports = await store.listReports(ctx.campusId);
  const similar = reports.filter((r) => isSimilar(r, ctx)).length;
  if (similar === 0) return "First report like this here.";
  const days = FIX_DAYS_BY_CATEGORY[ctx.category] ?? DEFAULT_FIX_DAYS;
  return `${similar} similar reports this semester · usually fixed in ~${days} days`;
}

/**
 * The curated quick fixes for this context, most specific first, capped at
 * MAX_QUICK_FIXES. Matches on category and (when the fix declares one) the
 * normalized item; category-only fixes apply to any item in that category.
 */
export async function computeQuickFixes(
  store: Store,
  ctx: AriContext,
): Promise<QuickFix[]> {
  const all = await store.listQuickFixes(ctx.campusId);
  const item = normalizeItem(ctx.item);
  const matches = all.filter((f) => {
    if (f.category !== ctx.category) return false;
    if (f.item === undefined) return true; // category-wide fix
    return normalizeItem(f.item) === item;
  });
  // Item-specific fixes before category-wide ones, otherwise seed order.
  matches.sort((a, b) => Number(b.item !== undefined) - Number(a.item !== undefined));
  return matches.slice(0, MAX_QUICK_FIXES);
}

/**
 * Ari stands down for anything serious: an active emergency, a safety hazard,
 * or a private report that names a person. In those cases no popup and no
 * quick fixes are offered.
 */
export function isSuppressed(input: AriSuppressInput): boolean {
  return Boolean(
    input.emergency || input.safetyHazard || input.privatePersonNaming,
  );
}

/** A short, human one-liner keyed by category — the "feels responsive" touch. */
export function introMessage(category: Category): string {
  const byCategory: Partial<Record<Category, string>> = {
    IT: "Hi, I'm Ari. Tech glitches are common here — let's see if we can sort it fast.",
    Dining: "Hi, I'm Ari. Let's get this dining issue to the right team.",
    Facilities: "Hi, I'm Ari. I pulled up what usually happens with issues like this.",
    Housing: "Hi, I'm Ari. Here's what I know about housing issues like this.",
    Grounds: "Hi, I'm Ari. Let me check the history on grounds issues like this.",
    Safety: "Hi, I'm Ari. Let's make sure this gets the attention it needs.",
  };
  return (
    byCategory[category] ??
    "Hi, I'm Ari. Here's what I found that might help."
  );
}

/**
 * "That fixed it" — log a self-resolution and file NOTHING. Returns the logged
 * row so the UI can confirm.
 */
export async function logThatFixedIt(
  store: Store,
  input: AriContext & { userId: string },
): Promise<SelfResolution> {
  return store.addSelfResolution({
    campusId: input.campusId,
    userId: input.userId,
    category: input.category,
    item: input.item,
  });
}

/** "Still broken — file it" — the continue signal the report flow consumes. */
export function continueSignal(): AriContinueSignal {
  return { continue: true };
}
