// UniFix — duplicate detection + co-signing.
//
// A deep module with a tiny public surface. Once a report's location is known,
// the app checks for an existing OPEN report of the same issue in the same
// building and category, surfaces the single best candidate with its live
// signer count, and lets the student co-sign instead of filing a duplicate —
// so staff see one prioritized ticket with real demand behind it.
//
// The matcher is deterministic and AI-free (lowercase/trim/hyphen-tolerant
// item match, same building AND category, same floor/room preferred not
// required). Co-signing is one per user; the reporter already counts as signed.

import type { Report } from "@/types";
import type { Store } from "@/lib/store";
import {
  type DuplicateQuery,
  findDuplicateCandidateImpl,
  normalizeItemImpl,
} from "./lib/matcher";
import {
  type CoSignResult,
  type DuplicateMatch,
  type FindDuplicateInput,
  coSignImpl,
  findDuplicateImpl,
} from "./lib/cosign";

export type { DuplicateQuery, FindDuplicateInput, DuplicateMatch, CoSignResult };

/**
 * Normalize an item string for matching: lowercase, trim, fold hyphens and
 * runs of whitespace to a single space, and collapse a few known synonyms
 * (so "Wi-Fi" and "wifi" match). Pure.
 */
export function normalizeItem(raw: string): string {
  return normalizeItemImpl(raw);
}

/**
 * The single best open duplicate of `query` among `candidates`, or null when
 * nothing matches. Best = highest priority (the shared priority rule), ties
 * broken newest-first. Pure: never mutates its input. Use this when you already
 * hold the candidate reports; otherwise prefer `findDuplicate`, which reads the
 * store and attaches the live signer count.
 */
export function findDuplicateCandidate(
  query: DuplicateQuery,
  candidates: Report[],
): Report | null {
  return findDuplicateCandidateImpl(query, candidates);
}

/**
 * Find the best open duplicate via the store and attach its live signer count
 * and status, so the UI can ask "Is this the same issue?". Returns null when
 * there is no open same-building/category/item report.
 */
export function findDuplicate(
  store: Store,
  input: FindDuplicateInput,
): Promise<DuplicateMatch | null> {
  return findDuplicateImpl(store, input);
}

/**
 * Co-sign an existing report as a backer. One co-sign per user; the reporter
 * already counts as signed, so a reporter (or repeat) co-sign is rejected.
 * Returns whether a backer was attached and the resulting signer count.
 */
export function coSign(
  store: Store,
  reportId: string,
  userId: string,
): Promise<CoSignResult> {
  return coSignImpl(store, reportId, userId);
}
