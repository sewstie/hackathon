// Internal: the "ask the fewest questions" logic for ticket 04.
//
// Everything here is hidden behind the reporting module's public interface
// (index.ts). The rules, straight from the brief:
//   - only MISSING details are asked, one at a time, LOCATION FIRST;
//   - a hard cap of THREE questions (anything left over flags the draft
//     incomplete so the report still files and never traps the student);
//   - answers are tap-chips drawn from the campus's SEEDED data (buildings,
//     floors, dining halls, items); "Use my location" and "Type instead" are
//     always available on the location question; an unseeded campus (no
//     buildings) falls back to free-text with no chips.
//   - "Use my location" compares the device to the chosen building's seeded
//     coordinates and flags the report location-unverified past 500 m.
import type { Building, Category } from "@/types";
import type { Store } from "@/lib/store";

/** The most a student is ever asked, per the brief. */
export const MAX_QUESTIONS = 3;

/** "Use my location" trust radius: past this the report is flagged. */
export const LOCATION_RADIUS_METERS = 500;

/**
 * Required details per category, in ask-order. "location" is listed first in
 * every category so it is always asked first when still missing. The labels
 * match what the classifier emits in `missingDetails`.
 */
const REQUIRED_DETAILS: Record<Category, string[]> = {
  Facilities: ["location", "floor", "item"],
  Dining: ["location", "dining hall", "item"],
  Housing: ["location", "floor", "item"],
  IT: ["location", "item"],
  Grounds: ["location", "item"],
  Safety: ["location", "item"],
  City: ["location"],
};

export function requiredDetailsFor(category: Category): string[] {
  return REQUIRED_DETAILS[category];
}

/** One follow-up question with its tap-chips. */
export interface FollowUpQuestion {
  /** The detail this question fills, e.g. "location", "floor", "dining hall". */
  detail: string;
  /** Human-readable prompt. */
  prompt: string;
  /** Tap-chips from seeded campus data; empty => free-text only. */
  chips: string[];
  /** "Use my location" is offered (location question only). */
  useMyLocation: boolean;
  /** "Type instead" is always available so chips never trap the student. */
  allowTypeInstead: boolean;
}

export interface FollowUpPlan {
  questions: FollowUpQuestion[];
  /** True when missing details remained after the 3-question cap. */
  incomplete: boolean;
}

const PROMPTS: Record<string, string> = {
  location: "Where is this? Pick a building.",
  floor: "Which floor?",
  "dining hall": "Which dining hall?",
  item: "What's the specific item?",
};

function promptFor(detail: string): string {
  return PROMPTS[detail] ?? `What's the ${detail}?`;
}

/** Find the building the student has already named in free-text, if any. */
function matchBuilding(location: string, buildings: Building[]): Building | undefined {
  const needle = location.trim().toLowerCase();
  if (!needle) return undefined;
  return buildings.find((b) => needle.includes(b.name.toLowerCase()));
}

/** Chips for a given detail, sourced from seeded data (empty => free-text). */
function chipsFor(
  detail: string,
  category: Category,
  buildings: Building[],
  chosen: Building | undefined,
): string[] {
  switch (detail) {
    case "location":
      return buildings.map((b) => b.name);
    case "floor":
      return chosen ? chosen.floors.map((f) => `Floor ${f}`) : [];
    case "dining hall":
      if (chosen) return chosen.diningHalls;
      // No building chosen yet: offer every seeded dining hall on campus.
      return buildings.flatMap((b) => b.diningHalls);
    case "item":
      return ITEM_CHIPS[category] ?? [];
    default:
      return [];
  }
}

/** A small curated set of common items per category (tap over typing). */
const ITEM_CHIPS: Record<Category, string[]> = {
  Facilities: ["heater", "door opener", "ceiling leak", "handrail", "light"],
  Dining: ["ice cream machine", "vending machine", "dishwasher", "coffee machine"],
  Housing: ["shower", "heater", "lock", "window"],
  IT: ["wifi", "printer", "projector", "outlet"],
  Grounds: ["pathway light", "bench", "sidewalk", "bike rack"],
  Safety: ["smoke detector", "fire extinguisher", "exit sign", "lock"],
  City: [],
};

export interface FollowUpContext {
  store: Store;
  campusId: string;
}

/**
 * Build the follow-up plan: only missing details, location first, capped at 3.
 * Chips are drawn from the seeded campus; an unseeded campus yields free-text.
 */
export async function planFollowUps(
  draft: {
    category: Category;
    missingDetails: string[];
    location: string;
  },
  ctx: FollowUpContext,
): Promise<FollowUpPlan> {
  const buildings = await ctx.store.listBuildings(ctx.campusId);
  const chosen = matchBuilding(draft.location, buildings);

  // Order the missing details: the category's known details first (location
  // first of all), then any extra details the classifier asked for that we
  // don't model, appended in the order the classifier gave them. This keeps
  // location-first while still counting every genuinely-missing detail toward
  // the cap (so a 4th missing detail correctly flags the draft incomplete).
  const required = requiredDetailsFor(draft.category);
  const missing = draft.missingDetails.map((d) => d.toLowerCase());
  const missingSet = new Set(missing);

  const known = required.filter((d) => missingSet.has(d));
  const knownSet = new Set(known);
  const extra = missing.filter((d) => !knownSet.has(d));
  const ordered = [...known, ...extra];

  const asked = ordered.slice(0, MAX_QUESTIONS);
  const incomplete = ordered.length > MAX_QUESTIONS;

  const questions: FollowUpQuestion[] = asked.map((detail) => ({
    detail,
    prompt: promptFor(detail),
    chips: chipsFor(detail, draft.category, buildings, chosen),
    useMyLocation: detail === "location",
    allowTypeInstead: true,
  }));

  return { questions, incomplete };
}

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

export interface LocationCheck {
  /** The device is within the trust radius of the chosen building. */
  verified: boolean;
  /** The report's location-unverified flag (the inverse of `verified`). */
  locationUnverified: boolean;
  /** Great-circle distance in metres (NaN if the building is unknown). */
  distanceMeters: number;
}

/** Haversine great-circle distance in metres between two coordinates. */
export function distanceMeters(a: GeoCoords, b: GeoCoords): number {
  const R = 6_371_000; // Earth radius, metres.
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface VerifyContext {
  store: Store;
  campusId: string;
  buildingId: string;
}

/**
 * Compare a device's coordinates to the chosen building's seeded location.
 * Past LOCATION_RADIUS_METERS the report is flagged location-unverified so
 * staff can weigh how much to trust it.
 */
export async function checkDeviceLocation(
  ctx: VerifyContext,
  coords: GeoCoords,
): Promise<LocationCheck> {
  const buildings = await ctx.store.listBuildings(ctx.campusId);
  const building = buildings.find((b) => b.id === ctx.buildingId);
  if (!building) {
    // Unknown building: we can't verify, so don't claim a false trust.
    return { verified: false, locationUnverified: true, distanceMeters: NaN };
  }
  const meters = distanceMeters(coords, {
    latitude: building.latitude,
    longitude: building.longitude,
  });
  const verified = meters <= LOCATION_RADIUS_METERS;
  return { verified, locationUnverified: !verified, distanceMeters: meters };
}
