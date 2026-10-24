import { describe, expect, it } from "vitest";
// Exercise the package through its ENTRY POINT only — never lib/ internals.
import { buildMapData, clusterPins, TIER_PIN_CSS_VAR } from "../map";
import type { MapPin } from "../map";
import type { Building, Campus, Report } from "@/types";

const CAMPUS: Campus = {
  id: "mit",
  name: "MIT",
  city: "Cambridge",
  state: "MA",
  latitude: 42.3601,
  longitude: -71.0942,
  cityServiceName: "Cambridge SeeClickFix",
  cityServiceUrl: "https://example.com",
  cityServicePhone: "617-349-4300",
  campusPoliceName: "MIT Police",
  campusPolicePhone: "617-253-1212",
  counselingName: "MIT Health",
  counselingUrl: "https://example.com",
};

const NOW = Date.parse("2026-10-24T12:00:00.000Z");

function pin(overrides: Partial<MapPin> & Pick<MapPin, "reportId" | "lat" | "lng" | "tier">): MapPin {
  return {
    title: "A broken thing",
    status: "Received",
    cssVar: TIER_PIN_CSS_VAR[overrides.tier],
    ...overrides,
  };
}

describe("campuses/map: clusterPins (pure, no Leaflet / no DOM)", () => {
  it("collapses pins at (nearly) the same coordinate into one numbered cluster", () => {
    const pins = [
      pin({ reportId: "r1", lat: 42.36001, lng: -71.09001, tier: "Low" }),
      pin({ reportId: "r2", lat: 42.36002, lng: -71.09002, tier: "Medium" }),
      pin({ reportId: "r3", lat: 42.36003, lng: -71.09001, tier: "High" }),
    ];
    const clusters = clusterPins(pins);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.count).toBe(3);
    // the cluster carries the ids of its members
    expect(clusters[0]?.reportIds.sort()).toEqual(["r1", "r2", "r3"]);
  });

  it("colors each cluster by the highest-severity member", () => {
    const pins = [
      pin({ reportId: "r1", lat: 42.36001, lng: -71.09001, tier: "Low" }),
      pin({ reportId: "r2", lat: 42.36002, lng: -71.09002, tier: "Urgent" }),
      pin({ reportId: "r3", lat: 42.36003, lng: -71.09001, tier: "Medium" }),
    ];
    const clusters = clusterPins(pins);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.tier).toBe("Urgent");
    expect(clusters[0]?.cssVar).toBe(TIER_PIN_CSS_VAR.Urgent);
  });

  it("keeps far-apart pins as separate single-member clusters", () => {
    const pins = [
      pin({ reportId: "near", lat: 42.3601, lng: -71.0942, tier: "High" }),
      pin({ reportId: "far", lat: 42.3800, lng: -71.0500, tier: "Low" }),
    ];
    const clusters = clusterPins(pins);
    expect(clusters).toHaveLength(2);
    for (const c of clusters) {
      expect(c.count).toBe(1);
    }
  });

  it("gives each cluster a representative center that lies within its members' bounds", () => {
    const pins = [
      pin({ reportId: "r1", lat: 42.36000, lng: -71.09000, tier: "Low" }),
      pin({ reportId: "r2", lat: 42.36004, lng: -71.09004, tier: "Low" }),
    ];
    const clusters = clusterPins(pins);
    expect(clusters).toHaveLength(1);
    const c = clusters[0]!;
    expect(c.lat).toBeGreaterThanOrEqual(42.36000);
    expect(c.lat).toBeLessThanOrEqual(42.36004);
    expect(c.lng).toBeGreaterThanOrEqual(-71.09004);
    expect(c.lng).toBeLessThanOrEqual(-71.09000);
  });

  it("yields no clusters for zero pins (usable centered empty view)", () => {
    expect(clusterPins([])).toEqual([]);
  });

  it("is deterministic: same input yields the same cluster ordering", () => {
    const pins = [
      pin({ reportId: "a", lat: 42.3601, lng: -71.0942, tier: "Low" }),
      pin({ reportId: "b", lat: 42.3700, lng: -71.0800, tier: "High" }),
    ];
    const first = clusterPins(pins);
    const second = clusterPins(pins);
    expect(first.map((c) => c.id)).toEqual(second.map((c) => c.id));
  });

  it("a coarser precision merges pins that a finer precision keeps apart", () => {
    const pins = [
      pin({ reportId: "r1", lat: 42.3601, lng: -71.0942, tier: "Low" }),
      pin({ reportId: "r2", lat: 42.3611, lng: -71.0952, tier: "Low" }),
    ];
    const fine = clusterPins(pins, { precision: 3 });
    const coarse = clusterPins(pins, { precision: 1 });
    expect(fine.length).toBeGreaterThan(coarse.length);
    expect(coarse).toHaveLength(1);
  });
});

describe("campuses/map: buildMapData exposes clusters", () => {
  const BUILDINGS: Building[] = [
    { id: "bldg-a", campusId: "mit", name: "A", latitude: 42.36001, longitude: -71.09001, floors: ["1"], diningHalls: [] },
    { id: "bldg-b", campusId: "mit", name: "B", latitude: 42.36002, longitude: -71.09002, floors: ["1"], diningHalls: [] },
  ];

  function report(
    overrides: Partial<Report> & Pick<Report, "id" | "buildingId" | "tier">,
  ): Report {
    return {
      campusId: "mit",
      reporterId: "user-x",
      category: "Facilities",
      item: "thing",
      title: "A broken thing",
      status: "Received",
      location: "somewhere",
      incomplete: false,
      locationUnverified: false,
      createdAt: new Date(NOW).toISOString(),
      ...overrides,
    };
  }

  it("includes a clusters array that groups the pins", () => {
    const data = buildMapData({
      campus: CAMPUS,
      buildings: BUILDINGS,
      reports: [
        report({ id: "r1", buildingId: "bldg-a", tier: "Low" }),
        report({ id: "r2", buildingId: "bldg-b", tier: "Urgent" }),
      ],
      now: NOW,
    });
    expect(data.clusters).toHaveLength(1);
    expect(data.clusters[0]?.count).toBe(2);
    expect(data.clusters[0]?.tier).toBe("Urgent");
  });

  it("yields empty clusters for a campus with no placeable reports", () => {
    const data = buildMapData({ campus: CAMPUS, buildings: BUILDINGS, reports: [], now: NOW });
    expect(data.clusters).toEqual([]);
    expect(data.center).toEqual([42.3601, -71.0942]);
  });
});
