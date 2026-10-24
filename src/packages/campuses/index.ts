// campuses — the discovery seam for CampusFix.
//
// Public interface (entry point): search Massachusetts institutions, resolve a
// campus id to a usable campus home, and read the Massachusetts economic-impact
// numbers for the landing page. Implementation lives in lib/ and is private:
// the IPEDS directory, the seeded/fallback split, and the AICUM figures are all
// hidden behind these few functions and constants.

import { MA_IMPACT_DATA, type MassachusettsImpact } from "./lib/impact";
import { resolveCampusView, type CampusView } from "./lib/campus";
import { runSearch, type CampusSummary } from "./lib/search";
import type { Store } from "@/lib/store";

export type { CampusSummary } from "./lib/search";
export type { CampusView } from "./lib/campus";
export type { MassachusettsImpact, ImpactRegion } from "./lib/impact";

/**
 * Search Massachusetts institutions by name or city. Returns a ranked, bounded
 * list of campus summaries; an empty query lists the available schools. The
 * seeded demo campus (MIT) is returned with its seed id and `seeded: true`.
 */
export function searchCampuses(query: string): CampusSummary[] {
  return runSearch(query);
}

/**
 * Open a campus home by id. Returns the seeded demo campus (MIT) read from the
 * store, any other MA institution synthesized empty-but-usable from IPEDS, or
 * null when the id matches no campus.
 */
export function getCampusView(
  campusId: string,
  store: Store,
): Promise<CampusView | null> {
  return resolveCampusView(campusId, store);
}

/** The Massachusetts economic-impact numbers (AICUM 2025) for the landing page. */
export const MA_IMPACT: MassachusettsImpact = MA_IMPACT_DATA;
