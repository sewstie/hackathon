import { describe, expect, it } from "vitest";
// Exercise the package through its ENTRY POINTS only — never lib/ internals.
import { buildMapData, TIER_PIN_CSS_VAR } from "../map";
import type { Building, Campus, Report, Tier } from "@/types";

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

const BUILDINGS: Building[] = [
  {
    id: "bldg-a",
    campusId: "mit",
    name: "Building A",
    latitude: 42.3592,
    longitude: -71.0954,
    floors: ["1"],
    diningHalls: [],
  },
  {
    id: "bldg-b",
    campusId: "mit",
    name: "Building B",
    latitude: 42.3607,
    longitude: -71.0907,
    floors: ["1"],
    diningHalls: [],
  },
];

// A fixed "now" so the 120-day window is deterministic in tests.
const NOW = Date.parse("2026-10-24T12:00:00.000Z");
const DAY = 86_400_000;
function daysAgo(days: number): string {
  return new Date(NOW - days * DAY).toISOString();
}

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
    createdAt: daysAgo(1),
    ...overrides,
  };
}

describe("campuses/map: buildMapData pins", () => {
  it("places one pin per report that has a known building, at the building coordinates", () => {
    const reports = [
      report({ id: "r1", buildingId: "bldg-a", tier: "High" }),
      report({ id: "r2", buildingId: "bldg-b", tier: "Low" }),
    ];
    const { pins } = buildMapData({
      campus: CAMPUS,
      buildings: BUILDINGS,
      reports,
      now: NOW,
    });
    expect(pins).toHaveLength(2);
    const a = pins.find((p) => p.reportId === "r1");
    expect(a).toBeDefined();
    expect(a?.lat).toBe(42.3592);
    expect(a?.lng).toBe(-71.0954);
    expect(a?.tier).toBe("High");
    expect(a?.title).toBe("A broken thing");
    expect(a?.status).toBe("Received");
  });

  it("colors each pin by its tier using the shared tier CSS variable (no hardcoded hex)", () => {
    const reports = [report({ id: "r1", buildingId: "bldg-a", tier: "Urgent" })];
    const { pins } = buildMapData({
      campus: CAMPUS,
      buildings: BUILDINGS,
      reports,
      now: NOW,
    });
    expect(pins[0]?.cssVar).toBe(TIER_PIN_CSS_VAR.Urgent);
    // The map uses CSS custom properties, never raw hex, for tier color.
    for (const tier of Object.keys(TIER_PIN_CSS_VAR) as Tier[]) {
      expect(TIER_PIN_CSS_VAR[tier]).toMatch(/^--tier-/);
    }
  });

  it("drops reports whose building is unknown or missing (nothing to place)", () => {
    const reports = [
      report({ id: "r1", buildingId: "bldg-a", tier: "High" }),
      report({ id: "r2", buildingId: "ghost-building", tier: "Low" }),
      report({ id: "r3", buildingId: undefined, tier: "Low" }),
    ];
    const { pins } = buildMapData({
      campus: CAMPUS,
      buildings: BUILDINGS,
      reports,
      now: NOW,
    });
    expect(pins.map((p) => p.reportId)).toEqual(["r1"]);
  });
});

describe("campuses/map: buildMapData heat layer (last 120 days)", () => {
  it("includes only reports from the last 120 days as heat points", () => {
    const reports = [
      report({ id: "recent", buildingId: "bldg-a", tier: "High", createdAt: daysAgo(10) }),
      report({ id: "edge", buildingId: "bldg-b", tier: "Low", createdAt: daysAgo(119) }),
      report({ id: "old", buildingId: "bldg-a", tier: "Low", createdAt: daysAgo(200) }),
    ];
    const { heatPoints } = buildMapData({
      campus: CAMPUS,
      buildings: BUILDINGS,
      reports,
      now: NOW,
    });
    // Two within window, one excluded.
    expect(heatPoints).toHaveLength(2);
    // Each heat point is [lat, lng, intensity].
    for (const pt of heatPoints) {
      expect(pt).toHaveLength(3);
      expect(Number.isFinite(pt[0])).toBe(true);
      expect(Number.isFinite(pt[1])).toBe(true);
      expect(pt[2]).toBeGreaterThan(0);
    }
  });

  it("drops heat points with no placeable building too", () => {
    const reports = [
      report({ id: "ok", buildingId: "bldg-a", tier: "High", createdAt: daysAgo(5) }),
      report({ id: "ghost", buildingId: "nope", tier: "Low", createdAt: daysAgo(5) }),
    ];
    const { heatPoints } = buildMapData({
      campus: CAMPUS,
      buildings: BUILDINGS,
      reports,
      now: NOW,
    });
    expect(heatPoints).toHaveLength(1);
  });
});

describe("campuses/map: buildMapData center", () => {
  it("centers the map on the campus coordinates", () => {
    const { center } = buildMapData({
      campus: CAMPUS,
      buildings: BUILDINGS,
      reports: [],
      now: NOW,
    });
    expect(center).toEqual([42.3601, -71.0942]);
  });
});
