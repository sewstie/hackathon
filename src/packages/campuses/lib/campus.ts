// Campus resolution, hidden implementation.
//
// A campus id opens one of two things:
//   - the seeded demo campus (MIT), read straight from the store, or
//   - any other MA institution, synthesized from its IPEDS directory row into a
//     real, usable Campus (name, city, map coordinates, safety contacts) so the
//     campus home renders empty-but-usable rather than a "Coming soon" wall.

import type { Store } from "@/lib/store";
import { MIT_CAMPUS_ID } from "@/lib/store";
import type { Campus } from "@/types";
import { institutionForCampusId } from "./search";

/** A resolved campus plus whether it carries seeded demo data. */
export interface CampusView {
  campus: Campus;
  /** True only for the richly-seeded demo campus (MIT). */
  seeded: boolean;
}

/**
 * Build a usable Campus for a non-seeded MA institution. Map centering and
 * identity come from IPEDS; the city hand-off and safety contacts fall back to
 * campus-agnostic placeholders (911 / local info line) so every screen renders.
 */
function fallbackCampus(campusId: string): Campus | null {
  const inst = institutionForCampusId(campusId);
  if (!inst) return null;
  return {
    id: campusId,
    name: inst.instnm,
    city: inst.city,
    state: inst.stabbr,
    latitude: inst.latitude,
    longitude: inst.longitude,
    // Campus-agnostic hand-off: point at the city's generic 311 / info line.
    cityServiceName: `${inst.city} city services`,
    cityServiceUrl: "https://www.mass.gov/orgs/massachusetts-311",
    cityServicePhone: "311",
    campusPoliceName: `${inst.instnm} Campus Safety`,
    campusPolicePhone: "911",
    counselingName: `${inst.instnm} Counseling`,
    counselingUrl: "https://988lifeline.org",
  };
}

/**
 * Resolve a campus id to a view, or null if the id is neither the seeded campus
 * nor a known MA institution.
 */
export async function resolveCampusView(
  campusId: string,
  store: Store,
): Promise<CampusView | null> {
  if (campusId === MIT_CAMPUS_ID) {
    const campus = await store.getCampus(campusId);
    return campus ? { campus, seeded: true } : null;
  }

  const campus = fallbackCampus(campusId);
  return campus ? { campus, seeded: false } : null;
}
