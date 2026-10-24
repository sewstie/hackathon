// Massachusetts economic-impact numbers, hidden implementation.
//
// These are the AICUM (Association of Independent Colleges and Universities in
// Massachusetts) 2025 Economic Impact Study headline figures, reproduced
// verbatim for the landing page, with the regional breakdown that sums to the
// statewide total. Kept in one place so the public interface can surface them
// without the landing page hard-coding strings.

/** One AICUM region line. */
export interface ImpactRegion {
  name: string;
  /** Verbatim dollar figure, e.g. "$64.0 billion". */
  impact: string;
  /** Short descriptor of what sits in the region (verbatim from the study). */
  note: string;
}

/** The Massachusetts impact figures surfaced on the landing page. */
export interface MassachusettsImpact {
  year: number;
  /** Statewide annual economic impact, verbatim. */
  economicImpact: string;
  /** Annual tax revenue to the Commonwealth, verbatim. */
  taxRevenue: string;
  /** Jobs supported, verbatim. */
  jobsSupported: string;
  /** AICUM member institutions counted in the study. */
  memberInstitutions: number;
  /** Per-region breakdown (Eastern + Central + Western = statewide total). */
  regions: ImpactRegion[];
  /** Human-readable citation. */
  source: string;
  /** Link to the source study. */
  sourceUrl: string;
}

export const MA_IMPACT_DATA: MassachusettsImpact = {
  year: 2025,
  economicImpact: "$71.1 billion",
  taxRevenue: "$2.4 billion",
  jobsSupported: "320,800",
  memberInstitutions: 59,
  regions: [
    {
      name: "Eastern MA",
      impact: "$64.0 billion",
      note: "The largest concentration of AICUM campuses.",
    },
    {
      name: "Central MA",
      impact: "$3.8 billion",
      note: "6 schools, 2 satellite campuses.",
    },
    {
      name: "Western MA",
      impact: "$3.3 billion",
      note: "11 schools.",
    },
  ],
  source:
    "AICUM 2025 Economic Impact Study (Econsult Solutions, Inc.), Association of Independent Colleges and Universities in Massachusetts",
  sourceUrl:
    "https://aicum.org/wp-content/uploads/2025/04/AICUM-Economic-Impact-Study-Final.pdf",
};
