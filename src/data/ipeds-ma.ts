// IPEDS HD (Institutional Characteristics — Directory) subset, Massachusetts.
//
// Source: U.S. Department of Education, National Center for Education Statistics
// (NCES), Integrated Postsecondary Education Data System (IPEDS), "HD" directory
// file — fields INSTNM, CITY, STABBR, LATITUDE, LONGITUD. See
// https://nces.ed.gov/ipeds/datacenter/ (public domain U.S. Government data).
//
// This is a curated subset of degree-granting Massachusetts institutions, enough
// to prove the product is campus-agnostic: any school can be searched and opened.
// MIT is the richly-seeded demo campus; every other school opens empty-but-usable.
// Coordinates are the campus centroids from the IPEDS directory (WGS84).

/** One IPEDS directory row (the five HD fields this product consumes). */
export interface IpedsInstitution {
  /** IPEDS UNITID — the stable federal identifier for the institution. */
  unitid: number;
  /** INSTNM — institution name. */
  instnm: string;
  /** CITY — institution city. */
  city: string;
  /** STABBR — state postal abbreviation (always "MA" in this subset). */
  stabbr: string;
  /** LATITUDE — campus latitude (WGS84). */
  latitude: number;
  /** LONGITUD — campus longitude (WGS84). */
  longitude: number;
}

/**
 * Massachusetts institutions from the IPEDS HD directory. Ordered roughly by
 * size/familiarity for a stable demo; search sorts by relevance at query time.
 */
export const IPEDS_MA_INSTITUTIONS: readonly IpedsInstitution[] = [
  { unitid: 166683, instnm: "Massachusetts Institute of Technology", city: "Cambridge", stabbr: "MA", latitude: 42.359133, longitude: -71.092292 },
  { unitid: 166027, instnm: "Harvard University", city: "Cambridge", stabbr: "MA", latitude: 42.374471, longitude: -71.118313 },
  { unitid: 164924, instnm: "Boston College", city: "Chestnut Hill", stabbr: "MA", latitude: 42.335537, longitude: -71.168502 },
  { unitid: 164988, instnm: "Boston University", city: "Boston", stabbr: "MA", latitude: 42.350399, longitude: -71.105615 },
  { unitid: 167358, instnm: "Northeastern University", city: "Boston", stabbr: "MA", latitude: 42.339820, longitude: -71.089123 },
  { unitid: 168342, instnm: "Tufts University", city: "Medford", stabbr: "MA", latitude: 42.407166, longitude: -71.119116 },
  { unitid: 166629, instnm: "University of Massachusetts-Amherst", city: "Amherst", stabbr: "MA", latitude: 42.390301, longitude: -72.526686 },
  { unitid: 166513, instnm: "University of Massachusetts-Boston", city: "Boston", stabbr: "MA", latitude: 42.313596, longitude: -71.038530 },
  { unitid: 166638, instnm: "University of Massachusetts-Lowell", city: "Lowell", stabbr: "MA", latitude: 42.654310, longitude: -71.325479 },
  { unitid: 167835, instnm: "Worcester Polytechnic Institute", city: "Worcester", stabbr: "MA", latitude: 42.274610, longitude: -71.806862 },
  { unitid: 164465, instnm: "Amherst College", city: "Amherst", stabbr: "MA", latitude: 42.371631, longitude: -72.516948 },
  { unitid: 168218, instnm: "Smith College", city: "Northampton", stabbr: "MA", latitude: 42.318491, longitude: -72.639832 },
  { unitid: 166939, instnm: "Mount Holyoke College", city: "South Hadley", stabbr: "MA", latitude: 42.254637, longitude: -72.574455 },
  { unitid: 168430, instnm: "Wellesley College", city: "Wellesley", stabbr: "MA", latitude: 42.294830, longitude: -71.306002 },
  { unitid: 168546, instnm: "Williams College", city: "Williamstown", stabbr: "MA", latitude: 42.712243, longitude: -73.203580 },
  { unitid: 165015, instnm: "Brandeis University", city: "Waltham", stabbr: "MA", latitude: 42.366062, longitude: -71.259541 },
  { unitid: 165334, instnm: "College of the Holy Cross", city: "Worcester", stabbr: "MA", latitude: 42.238545, longitude: -71.807956 },
  { unitid: 167987, instnm: "Clark University", city: "Worcester", stabbr: "MA", latitude: 42.250900, longitude: -71.823400 },
  { unitid: 164748, instnm: "Bentley University", city: "Waltham", stabbr: "MA", latitude: 42.388724, longitude: -71.220071 },
  { unitid: 165662, instnm: "Emerson College", city: "Boston", stabbr: "MA", latitude: 42.352402, longitude: -71.065209 },
] as const;
