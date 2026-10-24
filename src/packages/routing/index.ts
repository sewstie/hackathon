// UniFix — routing + city hand-off.
//
// A deep module with a tiny public surface. On-campus reports route to their
// team's queue (category → team); staff can reassign a report to a different
// team. Off-campus public issues (pothole, public streetlight, sidewalk) are
// detected and NOT posted — instead the active campus's configured city
// hand-off card points the student at the right service (for MIT: Cambridge
// SeeClickFix), with a copy-text button, phone, and link. Nothing is persisted
// for a city issue; the whole point is the hand-off.
//
// Everything here is deterministic and AI-free. The reassignment transform is
// pure (returns a new report) so the caller owns persistence through the Store
// seam — this package never reaches into other tracks' files.

import type { Campus, Category, PublicTeam, Report } from "@/types";
import {
  type CityHandoffCard,
  type CityIssueDetection,
  cityHandoffImpl,
  detectCityIssueImpl,
  reassignReportImpl,
  routeReportImpl,
  teamForCategoryImpl,
} from "./lib/impl";

export type { CityHandoffCard, CityIssueDetection };

/**
 * The public team whose queue a report of `category` lands in, or null for the
 * off-campus "City" category (which is handed off, never queued). Pure.
 */
export function teamForCategory(category: Category): PublicTeam | null {
  return teamForCategoryImpl(category);
}

/** The team queue a specific report lands in, by its category. Pure. */
export function routeReport(report: Report): PublicTeam | null {
  return routeReportImpl(report);
}

/**
 * Reassign a report to another team's queue. Returns a NEW report (the input
 * is never mutated); the caller persists it through the Store. A public team
 * maps 1:1 to its category, so reassigning moves the report to that category.
 */
export function reassignReport(report: Report, toTeam: PublicTeam): Report {
  return reassignReportImpl(report, toTeam);
}

/**
 * Detect an off-campus public-infrastructure issue (pothole, public
 * streetlight, sidewalk, crosswalk, public road) from the report text. Pure;
 * a match means the report should be handed off to the city, not filed.
 */
export function detectCityIssue(text: string): CityIssueDetection {
  return detectCityIssueImpl(text);
}

/**
 * Build the city hand-off card from a campus's configured service. Pure:
 * nothing is persisted. The copy is driven entirely by campus config, so a
 * different campus yields a different service name, phone, and link.
 */
export function cityHandoff(campus: Campus): CityHandoffCard {
  return cityHandoffImpl(campus);
}
