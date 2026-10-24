// Internal implementation of the store-aware duplicate + co-sign flow.
// Hidden in a subfolder; reachable only from the package's root files.
//
// These compose the pure matcher with the shared Store seam: `findDuplicate`
// surfaces the best open match together with its live signer count and status
// so the UI can ask "Is this the same issue?"; `coSign` attaches a backer with
// the store's one-per-user rule (the reporter already counts as signed).

import type { Category, Status } from "@/types";
import type { Store } from "@/lib/store";
import { findDuplicateCandidateImpl } from "./matcher";

/** What a caller needs to search for an existing open report. */
export interface FindDuplicateInput {
  campusId: string;
  buildingId: string;
  category: Category;
  item: string;
}

/** The surfaced candidate plus the live demand/status behind it. */
export interface DuplicateMatch {
  report: import("@/types").Report;
  /** Live signer count (reporter + co-signers). */
  signers: number;
  status: Status;
}

/** Outcome of a co-sign attempt. */
export interface CoSignResult {
  /** True when this call attached a new backer; false if already signed. */
  signed: boolean;
  /** The signer count after the attempt. */
  signers: number;
}

export async function findDuplicateImpl(
  store: Store,
  input: FindDuplicateInput,
): Promise<DuplicateMatch | null> {
  const reports = await store.listReports(input.campusId);
  const best = findDuplicateCandidateImpl(
    {
      buildingId: input.buildingId,
      category: input.category,
      item: input.item,
    },
    reports,
  );
  if (!best) return null;
  const signers = await store.countSigners(best.id);
  return { report: best, signers, status: best.status };
}

export async function coSignImpl(
  store: Store,
  reportId: string,
  userId: string,
): Promise<CoSignResult> {
  const added = await store.addCoSign(reportId, userId);
  const signers = await store.countSigners(reportId);
  return { signed: added !== null, signers };
}
