// Internal implementation of routing + city hand-off, hidden in a subfolder.
// Reachable from the package's own root files (index.ts) but NOT from outside.
//
// Three deterministic, AI-free behaviours:
//   • category → public-team queue (and null for the off-campus "City"),
//   • reassignment via the Store seam (change the report's category/team),
//   • off-campus public-issue detection + the campus-configured hand-off card.

import type { Campus, Category, PublicTeam, Report } from "@/types";

/**
 * Which public team's queue a report lands in, by category. On the demo
 * campuses the category names line up 1:1 with the public teams; "City" is an
 * off-campus hand-off and never lands in a campus queue (→ null).
 */
const CATEGORY_TO_TEAM: Record<Category, PublicTeam | null> = {
  Facilities: "Facilities",
  Dining: "Dining",
  Housing: "Housing",
  IT: "IT",
  Grounds: "Grounds",
  Safety: "Safety",
  City: null,
};

export function teamForCategoryImpl(category: Category): PublicTeam | null {
  return CATEGORY_TO_TEAM[category];
}

export function routeReportImpl(report: Report): PublicTeam | null {
  return teamForCategoryImpl(report.category);
}

/**
 * Reassign a report to another team's queue. A public team maps 1:1 to its
 * category, so reassigning is moving the report to that category. Pure:
 * returns a NEW report and never mutates the input; the caller persists the
 * result through the Store (e.g. the staff dashboard, ticket 12).
 */
export function reassignReportImpl(report: Report, toTeam: PublicTeam): Report {
  return { ...report, category: toTeam as Category };
}

/** A detected off-campus public issue and which keyword tripped it. */
export interface CityIssueDetection {
  isCityIssue: boolean;
  /** The matched phrase, when detected (for explainability/tests). */
  matched?: string;
}

/**
 * Off-campus public-infrastructure keywords: potholes, public streetlights,
 * and sidewalks belong to the city, not the campus. Word-boundary matched so
 * "sidewalk" matches but unrelated substrings do not.
 */
const CITY_KEYWORDS = [
  "pothole",
  "streetlight",
  "street light",
  "sidewalk",
  "crosswalk",
  "public road",
] as const;

export function detectCityIssueImpl(text: string): CityIssueDetection {
  const haystack = text.toLowerCase();
  for (const kw of CITY_KEYWORDS) {
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(haystack)) {
      return { isCityIssue: true, matched: kw };
    }
  }
  return { isCityIssue: false };
}

/** The data the city hand-off card renders — all from campus config. */
export interface CityHandoffCard {
  serviceName: string;
  url: string;
  phone: string;
  /** Headline message shown to the student. */
  message: string;
  /** One-tap copyable text pointing at the right service. */
  copyText: string;
}

/**
 * Build the city hand-off card from a campus's configured service. Pure: no
 * store, nothing persisted — the whole point is that off-campus issues bounce
 * to the city instead of being filed on UniFix.
 */
export function cityHandoffImpl(campus: Campus): CityHandoffCard {
  const serviceName = campus.cityServiceName;
  const message = `This looks like a City of ${campus.city} issue. Report it on ${serviceName}.`;
  const copyText = `${message} ${campus.cityServiceUrl} · ${campus.cityServicePhone}`;
  return {
    serviceName,
    url: campus.cityServiceUrl,
    phone: campus.cityServicePhone,
    message,
    copyText,
  };
}
