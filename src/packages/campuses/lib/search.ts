// School search over the IPEDS Massachusetts subset, hidden implementation.
//
// Search is a deterministic, dependency-free ranking over the IPEDS directory
// rows (name + city). It maps the one seeded institution (MIT) onto the store's
// campus id so the landing page links to the richly-seeded demo, and every other
// school onto a stable `ipeds-<unitid>` id that opens empty-but-usable.

import { IPEDS_MA_INSTITUTIONS, type IpedsInstitution } from "@/data/ipeds-ma";
import { MIT_CAMPUS_ID } from "@/lib/store";

/** IPEDS UNITID of the seeded demo campus (MIT). */
export const SEEDED_UNITID = 166683;

/**
 * Short aliases/acronyms a searcher is likely to type, keyed by UNITID. The
 * IPEDS directory stores only the full legal name, so "MIT" or "UMass" would
 * otherwise miss. Values are lowercased.
 */
const ALIASES: Record<number, string[]> = {
  166683: ["mit"],
  166629: ["umass amherst", "umass"],
  166513: ["umass boston"],
  166638: ["umass lowell"],
  167835: ["wpi"],
  164988: ["bu"],
  164924: ["bc"],
};

/** A search hit the landing page can render and link to. */
export interface CampusSummary {
  /** The id to open: the seeded store id for MIT, else `ipeds-<unitid>`. */
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  /** True only for the richly-seeded demo campus (MIT). */
  seeded: boolean;
}

const MAX_RESULTS = 50;

/** The id the rest of the app uses for an IPEDS institution. */
export function campusIdForUnitid(unitid: number): string {
  return unitid === SEEDED_UNITID ? MIT_CAMPUS_ID : `ipeds-${unitid}`;
}

/** Parse an `ipeds-<unitid>` id back to its UNITID, or null if it isn't one. */
export function unitidForCampusId(campusId: string): number | null {
  if (campusId === MIT_CAMPUS_ID) return SEEDED_UNITID;
  const match = /^ipeds-(\d+)$/.exec(campusId);
  return match ? Number(match[1]) : null;
}

/** Find the IPEDS row behind a campus id, or null. */
export function institutionForCampusId(
  campusId: string,
): IpedsInstitution | null {
  const unitid = unitidForCampusId(campusId);
  if (unitid === null) return null;
  return IPEDS_MA_INSTITUTIONS.find((i) => i.unitid === unitid) ?? null;
}

function toSummary(inst: IpedsInstitution): CampusSummary {
  return {
    id: campusIdForUnitid(inst.unitid),
    name: inst.instnm,
    city: inst.city,
    state: inst.stabbr,
    latitude: inst.latitude,
    longitude: inst.longitude,
    seeded: inst.unitid === SEEDED_UNITID,
  };
}

/**
 * Score a row against a lowercased query. Higher is better; 0 means no match.
 * Name matches outrank city matches; a prefix/word-start outranks a mid-string
 * hit, and the seeded demo campus gets a small nudge so it leads on ties.
 */
function score(inst: IpedsInstitution, q: string): number {
  const name = inst.instnm.toLowerCase();
  const city = inst.city.toLowerCase();
  let s = 0;
  if (name === q) s = 1000;
  else if (name.startsWith(q)) s = 800;
  else if (name.includes(` ${q}`)) s = 600;
  else if (name.includes(q)) s = 400;
  else if (city.startsWith(q)) s = 200;
  else if (city.includes(q)) s = 100;

  // Acronym/alias hit (e.g. "MIT", "UMass") ranks like a strong name match.
  if (s < 700) {
    const aliases = ALIASES[inst.unitid];
    if (aliases) {
      if (aliases.some((a) => a === q)) s = Math.max(s, 900);
      else if (aliases.some((a) => a.startsWith(q) || a.includes(q)))
        s = Math.max(s, 500);
    }
  }

  if (s > 0 && inst.unitid === SEEDED_UNITID) s += 1;
  return s;
}

/**
 * Search MA institutions by name or city. An empty query lists the subset
 * (bounded). Results are ranked by relevance, then alphabetically, and the
 * seeded demo campus is never duplicated (its row already maps to the seed id).
 */
export function runSearch(query: string): CampusSummary[] {
  const q = query.trim().toLowerCase();

  if (q.length === 0) {
    return IPEDS_MA_INSTITUTIONS.slice(0, MAX_RESULTS).map(toSummary);
  }

  return IPEDS_MA_INSTITUTIONS.map((inst) => ({ inst, s: score(inst, q) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.inst.instnm.localeCompare(b.inst.instnm))
    .slice(0, MAX_RESULTS)
    .map((r) => toSummary(r.inst));
}
