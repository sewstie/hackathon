// UniFix — priority ordering (severity × reach).
//
// A deep module with a tiny public surface: pure functions that order public
// reports by *real* priority, never by popularity. Staff always see the worst
// problems first, and genuine demand can correct an uncertain AI rating.
//
// The rule (from the spec):
//   • Urgent tier always sorts above every non-Urgent report.
//   • Otherwise  score = severityWeight + min(signers, 90)
//       Low 0 / Medium 100 / High 200
//     An unconfirmed/incomplete High is penalized ~30, so a popular Medium
//     (100 + 90 = 190) can overtake an incomplete High (200 − 30 = 170).
//   • Ties break oldest-first.
//   • A staff tier override replaces the effective tier used throughout.
//
// Tiers are always rendered as text + color (never color alone); the
// presentation helper exposes both so the UI can stay accessible.

import type { Tier } from "@/types";
import {
  PENALTY_UNCONFIRMED_HIGH,
  SEVERITY_WEIGHT,
  SIGNER_CAP,
  effectiveTier,
  orderByPriorityImpl,
  scoreOf,
  type PrioritizableReport,
} from "./lib/impl";

export type { PrioritizableReport };
export { PENALTY_UNCONFIRMED_HIGH, SEVERITY_WEIGHT, SIGNER_CAP };

/**
 * The numeric priority score for a single report (effective tier applied).
 * Urgent still participates here, but `orderByPriority` guarantees any Urgent
 * outranks any non-Urgent regardless of these numbers.
 */
export function priorityScore(report: PrioritizableReport): number {
  return scoreOf(report);
}

/**
 * Order reports highest-priority first. Pure: returns a new array and never
 * mutates its input. Urgent (by effective tier) always leads; within a group
 * sort by score, then oldest-first.
 */
export function orderByPriority<T extends PrioritizableReport>(reports: T[]): T[] {
  return orderByPriorityImpl(reports);
}

/** Accessible presentation for a tier: a text label plus CSS-variable colors. */
export interface TierPresentation {
  label: Tier;
  /** Foreground color token (text), e.g. `var(--tier-high-fg)`. */
  colorVar: string;
  /** Background color token, e.g. `var(--tier-high-bg)`. */
  backgroundVar: string;
}

/**
 * The accessible presentation for a tier. Accepts either a bare `Tier` or a
 * report (whose effective tier, honoring any staff override, is used), so the
 * UI never renders color without an accompanying text label.
 */
export function tierPresentation(
  input: Tier | PrioritizableReport,
): TierPresentation {
  const tier = typeof input === "string" ? input : effectiveTier(input);
  const key = tier.toLowerCase();
  return {
    label: tier,
    colorVar: `var(--tier-${key}-fg)`,
    backgroundVar: `var(--tier-${key}-bg)`,
  };
}
