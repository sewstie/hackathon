// Internal implementation of duplicate detection, hidden in a subfolder.
// Reachable from the package's own root files (index.ts) but NOT from outside.
//
// The matcher is deterministic and AI-free: a candidate is an OPEN report (not
// Fixed / Won't fix) in the SAME building AND SAME category whose item matches
// after normalization. Among candidates the single best one is surfaced:
// highest priority first (reusing the priority rule), ties broken newest-first.

import type { Category, Report, Status } from "@/types";
import { orderByPriority } from "@/packages/priority";

/** Statuses that take a report out of the candidate pool. */
const CLOSED_STATUSES: readonly Status[] = ["Fixed", "Won't fix"];

/** A few item synonyms normalized to one canonical token. */
const SYNONYMS: Record<string, string> = {
  "wi fi": "wifi",
  "ac": "air conditioner",
  "a c": "air conditioner",
};

/**
 * Normalize an item string for matching: lowercase, trim, replace hyphens and
 * runs of whitespace with a single space, then fold a few known synonyms.
 * Hyphen-tolerant so "Ice-Cream Machine" and "ice cream machine" are equal.
 */
export function normalizeItemImpl(raw: string): string {
  const base = raw
    .toLowerCase()
    .replace(/[-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return SYNONYMS[base] ?? base;
}

/** The query a caller supplies once a report's location is known. */
export interface DuplicateQuery {
  buildingId: string;
  category: Category;
  item: string;
}

function isOpen(report: Report): boolean {
  return !CLOSED_STATUSES.includes(report.status);
}

/** True when a report is in the same building, category, and normalized item. */
function matches(report: Report, query: DuplicateQuery): boolean {
  return (
    isOpen(report) &&
    report.buildingId === query.buildingId &&
    report.category === query.category &&
    normalizeItemImpl(report.item) === normalizeItemImpl(query.item)
  );
}

/**
 * The single best open duplicate of `query` among `candidates`, or null.
 * Best = highest priority (the shared priority rule), ties broken newest-first.
 * Pure: never mutates its input.
 */
export function findDuplicateCandidateImpl(
  query: DuplicateQuery,
  candidates: Report[],
): Report | null {
  const pool = candidates.filter((r) => matches(r, query));
  if (pool.length === 0) return null;

  // Rank by the shared priority rule (severity × reach). Signer counts aren't
  // known from a bare Report, so priority here uses tier/incomplete; the
  // tie-break is overridden to newest-first per the matcher's "else newest".
  const byPriority = orderByPriority(
    pool.map((r) => ({
      id: r.id,
      tier: r.tier,
      signers: 0,
      incomplete: r.incomplete,
      createdAt: r.createdAt,
    })),
  );

  // Group the top priority band and pick the newest within it.
  const topId = byPriority[0].id;
  const top = pool.find((r) => r.id === topId);
  if (!top) return null;

  // Any candidate the priority rule ranked equal to the top (same effective
  // ordering position before the oldest-first tie-break) should prefer newest.
  const topTier = top.tier;
  const topIncomplete = top.incomplete;
  const sameBand = pool.filter(
    (r) => r.tier === topTier && r.incomplete === topIncomplete,
  );
  return sameBand.reduce((newest, r) =>
    Date.parse(r.createdAt) > Date.parse(newest.createdAt) ? r : newest,
  );
}
