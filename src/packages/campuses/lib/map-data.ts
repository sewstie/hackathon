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
import { TIERS } from "@/types";

/** How many days of history the density heat layer covers. */
export const HEAT_WINDOW_DAYS = 120;

/**
 * Default grid precision (decimal places of lat/lng) for clustering. At ~42°N,
 * 3 decimals is roughly 80–110 m — tight enough that pins on the same building
 * footprint collapse while distinct buildings stay apart.
 */
export const CLUSTER_PRECISION = 3;

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

/**
 * A group of nearby pins collapsed into one numbered bubble. Its color reflects
 * the HIGHEST-severity member so the worst spots read at a glance; it expands
 * back into its member pins on zoom/click in the view.
 */
export interface MapCluster {
  /** Stable id derived from the cluster's grid cell. */
  id: string;
  /** Representative center [lat, lng] — the mean of the members' coordinates. */
  lat: number;
  lng: number;
  /** Number of reports in the cluster (the number shown in the bubble). */
  count: number;
  /** The highest tier among the members. */
  tier: Tier;
  /** CSS variable for the highest-tier color (resolved at render). */
  cssVar: string;
  /** The ids of the reports collapsed into this cluster. */
  reportIds: string[];
}

export interface MapData {
  /** Map center [lat, lng] — the campus coordinates. */
  center: [number, number];
  pins: MapPin[];
  heatPoints: HeatPoint[];
  /** The pins grouped into severity-aware clusters for a legible map. */
  clusters: MapCluster[];
}

export interface MapDataInput {
  campus: Campus;
  buildings: Building[];
  /** PUBLIC reports only — private reports must never be passed in. */
  reports: Report[];
  /**
   * Epoch ms for "now", anchoring the 120-day heat window. OPTIONAL and, when
   * omitted, derived deterministically from the newest report's timestamp —
   * never `Date.now()`. This matters because the campus route is partially
   * prerendered (Next 16 Cache Components): an unstable `Date.now()` evaluated
   * during prerender throws and blanks the MIT demo. A data-derived anchor is
   * stable across prerender and request, so the map renders either way. Callers
   * that want a true wall-clock window (a request-time render) may still pass
   * one explicitly.
   */
  now?: number;
}

/**
 * The 120-day heat window's reference time when no `now` is supplied: the most
 * recent report's `createdAt`. Deterministic and prerender-safe (no wall clock).
 * Falls back to 0 when there are no dated reports, which simply yields no heat
 * points — a usable, centered empty map.
 */
function deriveReferenceNow(reports: Report[]): number {
  let newest = 0;
  for (const report of reports) {
    const t = Date.parse(report.createdAt);
    if (Number.isFinite(t) && t > newest) newest = t;
  }
  return newest;
}

/**
 * Shape pins + heat points for the campus map. Reports without a placeable
 * building (missing or unknown `buildingId`) are dropped, since there is no
 * coordinate to put them at.
 */
export function buildMapData(input: MapDataInput): MapData {
  const { campus, buildings, reports } = input;
  // Default to a data-derived anchor (never Date.now()), so the transform is a
  // pure function of its inputs and safe to evaluate during prerender.
  const now = input.now ?? deriveReferenceNow(reports);
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
    clusters: clusterPins(pins),
  };
}

/** Rank of each tier, lowest to highest, for "highest severity wins". */
const TIER_RANK: Record<Tier, number> = Object.fromEntries(
  TIERS.map((tier, index) => [tier, index]),
) as Record<Tier, number>;

export interface ClusterOptions {
  /**
   * Decimal places of lat/lng used to grid pins into cells. Lower = coarser
   * (more merging); higher = finer (more separate clusters). Defaults to
   * CLUSTER_PRECISION.
   */
  precision?: number;
}

/**
 * Collapse pins into severity-aware clusters — a pure transform with no Leaflet
 * or DOM dependency, so the grouping is fully unit-testable.
 *
 * Pins are bucketed by a rounded lat/lng grid cell: pins in the same cell merge
 * into one cluster whose color reflects its HIGHEST-severity member and whose
 * center is the mean of its members' coordinates. Non-overlapping pins each
 * become a single-member cluster. Zero pins yields no clusters. The result is
 * deterministically ordered (by grid cell) so renders are stable.
 */
export function clusterPins(pins: MapPin[], options: ClusterOptions = {}): MapCluster[] {
  const precision = options.precision ?? CLUSTER_PRECISION;
  const factor = 10 ** precision;
  const cellKey = (value: number) => Math.round(value * factor);

  // Group pins by grid cell, preserving insertion order of first sight.
  const cells = new Map<string, MapPin[]>();
  const order: string[] = [];
  for (const pin of pins) {
    const key = `${cellKey(pin.lat)}:${cellKey(pin.lng)}`;
    const existing = cells.get(key);
    if (existing) {
      existing.push(pin);
    } else {
      cells.set(key, [pin]);
      order.push(key);
    }
  }

  // Deterministic ordering independent of input order.
  order.sort();

  return order.map((key) => {
    const members = cells.get(key)!;
    const count = members.length;
    const lat = members.reduce((sum, p) => sum + p.lat, 0) / count;
    const lng = members.reduce((sum, p) => sum + p.lng, 0) / count;
    const topTier = members.reduce<Tier>(
      (worst, p) => (TIER_RANK[p.tier] > TIER_RANK[worst] ? p.tier : worst),
      members[0]!.tier,
    );
    return {
      id: `cluster-${key}`,
      lat,
      lng,
      count,
      tier: topTier,
      cssVar: TIER_PIN_CSS_VAR[topTier],
      reportIds: members.map((p) => p.reportId),
    };
  });
}
