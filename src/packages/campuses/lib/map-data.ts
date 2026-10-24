// Pin/heat data-shaping for the campus home map, hidden implementation.
//
// A pure transform: given a campus, its buildings, and its PUBLIC reports, it
// produces everything the Leaflet layer needs — tier-colored pins placed at
// their building's coordinates and a density heat layer of the last 120 days —
// with no dependency on Leaflet or the DOM, so it is fully unit-testable.
//
// Private reports never reach this function: callers pass public reports only,
// which keeps private reports off the map by construction.

import type { Building, Campus, Report, Tier } from "@/types";

/** How many days of history the density heat layer covers. */
export const HEAT_WINDOW_DAYS = 120;

/**
 * The CSS custom property each tier's pin is colored with. The shared tier
 * tokens live in globals.css and meet >= 4.5:1 contrast; using the variable
 * name (never a raw hex) keeps the map on the shared, themeable palette.
 */
export const TIER_PIN_CSS_VAR: Record<Tier, string> = {
  Low: "--tier-low-fg",
  Medium: "--tier-medium-fg",
  High: "--tier-high-fg",
  Urgent: "--tier-urgent-fg",
};

/** A single tier-colored report pin, ready for the Leaflet layer. */
export interface MapPin {
  reportId: string;
  lat: number;
  lng: number;
  tier: Tier;
  title: string;
  status: Report["status"];
  /** The CSS variable name holding this tier's color (resolved at render). */
  cssVar: string;
}

/** One heat-layer sample: [lat, lng, intensity]. */
export type HeatPoint = [number, number, number];

export interface MapData {
  /** Map center [lat, lng] — the campus coordinates. */
  center: [number, number];
  pins: MapPin[];
  heatPoints: HeatPoint[];
}

export interface MapDataInput {
  campus: Campus;
  buildings: Building[];
  /** PUBLIC reports only — private reports must never be passed in. */
  reports: Report[];
  /** Epoch ms for "now" (injectable so the 120-day window is deterministic). */
  now?: number;
}

/**
 * Shape pins + heat points for the campus map. Reports without a placeable
 * building (missing or unknown `buildingId`) are dropped, since there is no
 * coordinate to put them at.
 */
export function buildMapData(input: MapDataInput): MapData {
  const { campus, buildings, reports } = input;
  const now = input.now ?? Date.now();
  const cutoff = now - HEAT_WINDOW_DAYS * 86_400_000;

  const byId = new Map(buildings.map((b) => [b.id, b]));

  const pins: MapPin[] = [];
  const heatPoints: HeatPoint[] = [];

  for (const report of reports) {
    const building = report.buildingId ? byId.get(report.buildingId) : undefined;
    if (!building) continue; // nothing to place

    pins.push({
      reportId: report.id,
      lat: building.latitude,
      lng: building.longitude,
      tier: report.tier,
      title: report.title,
      status: report.status,
      cssVar: TIER_PIN_CSS_VAR[report.tier],
    });

    if (Date.parse(report.createdAt) >= cutoff) {
      heatPoints.push([building.latitude, building.longitude, 1]);
    }
  }

  return {
    center: [campus.latitude, campus.longitude],
    pins,
    heatPoints,
  };
}
