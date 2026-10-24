// Internal implementation of the priority rule, hidden in a subfolder.
// Reachable from the package's own root files (index.ts) but NOT from outside.
//
// Constants and the input type live here so the dependency flows one way
// (index → lib), leaving no import cycle.

import type { Tier } from "@/types";

/** The slice of a report the ordering rule actually reads. Pure input shape. */
export interface PrioritizableReport {
  id: string;
  /** The AI/original tier. */
  tier: Tier;
  /** Number of signers (reporter + co-signers). */
  signers: number;
  /** Still missing details after the 3-question cap → an unconfirmed report. */
  incomplete: boolean;
  /** ISO-8601 creation time; used for oldest-first tie-breaks. */
  createdAt: string;
  /** Staff override; when present it replaces `tier` as the effective tier. */
  tierOverride?: Tier;
}

/** Severity weights. Severity dominates; popularity only nudges within a tier. */
export const SEVERITY_WEIGHT: Record<Tier, number> = {
  Low: 0,
  Medium: 100,
  High: 200,
  Urgent: 300,
};

/** How much an unconfirmed/incomplete High is docked. */
export const PENALTY_UNCONFIRMED_HIGH = 30;

/** The most signers that can count toward a report's score. */
export const SIGNER_CAP = 90;

/** The tier actually used for scoring/ordering: a staff override wins. */
export function effectiveTier(report: PrioritizableReport): Tier {
  return report.tierOverride ?? report.tier;
}

/** score = severityWeight + min(signers, cap), with the incomplete-High dock. */
export function scoreOf(report: PrioritizableReport): number {
  const tier = effectiveTier(report);
  const signers = Math.max(0, report.signers);
  const base = SEVERITY_WEIGHT[tier] + Math.min(signers, SIGNER_CAP);
  const penalty =
    tier === "High" && report.incomplete ? PENALTY_UNCONFIRMED_HIGH : 0;
  return base - penalty;
}

/** Oldest-first: an earlier createdAt sorts before a later one. */
function olderFirst(a: PrioritizableReport, b: PrioritizableReport): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return ta - tb;
}

export function orderByPriorityImpl<T extends PrioritizableReport>(
  reports: T[],
): T[] {
  // Copy so the caller's array is never mutated.
  return [...reports].sort((a, b) => {
    // Urgent (by effective tier) always leads any non-Urgent.
    const aUrgent = effectiveTier(a) === "Urgent";
    const bUrgent = effectiveTier(b) === "Urgent";
    if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;

    // Within the same urgency band, higher score first…
    const diff = scoreOf(b) - scoreOf(a);
    if (diff !== 0) return diff;

    // …then oldest-first.
    return olderFirst(a, b);
  });
}
