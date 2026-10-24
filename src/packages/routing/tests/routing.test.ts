// Interface-level tests for the routing package.
//
// Exercised strictly through the package's entry point (../index) against the
// deterministic in-memory Store — no cloud, no mocking of internals. Covers:
//   • each public report routing to its team's queue (category → team),
//   • staff reassignment to another team (pure transform through the module),
//   • off-campus public-issue detection (pothole / streetlight / sidewalk),
//   • the campus-configured city hand-off card (nothing persisted), driven by
//     the active campus config so a different campus yields different copy.
//
// Covers ticket F6 / case 12.

import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";
import type { Store } from "@/lib/store";
import type { Campus, Report } from "@/types";
import {
  cityHandoff,
  detectCityIssue,
  reassignReport,
  routeReport,
  teamForCategory,
} from "../index";

function report(overrides: Partial<Report> & Pick<Report, "id">): Report {
  return {
    campusId: MIT_CAMPUS_ID,
    buildingId: "bldg-w20",
    reporterId: "user-ben",
    category: "Dining",
    item: "ice cream machine",
    title: "Ice cream machine is broken",
    tier: "Medium",
    status: "Received",
    location: "Stratton Student Center (W20)",
    incomplete: false,
    locationUnverified: false,
    createdAt: "2026-10-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("teamForCategory / routeReport", () => {
  it("routes each on-campus category to its team's queue", () => {
    expect(teamForCategory("Facilities")).toBe("Facilities");
    expect(teamForCategory("Dining")).toBe("Dining");
    expect(teamForCategory("Housing")).toBe("Housing");
    expect(teamForCategory("IT")).toBe("IT");
    expect(teamForCategory("Grounds")).toBe("Grounds");
    expect(teamForCategory("Safety")).toBe("Safety");
  });

  it("routes a report by its category", () => {
    expect(routeReport(report({ id: "r1", category: "IT" }))).toBe("IT");
    expect(routeReport(report({ id: "r2", category: "Facilities" }))).toBe(
      "Facilities",
    );
  });

  it("has no public team for the City (off-campus) category", () => {
    expect(teamForCategory("City")).toBeNull();
  });
});

describe("reassignReport (through the module)", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("reassigns a report so it lands in another team's queue", async () => {
    // Seeded ice-cream report routes to Dining; reassign it to Facilities.
    const before = await store.getReport("rep-icecream");
    expect(before && routeReport(before)).toBe("Dining");

    const updated = reassignReport(before as Report, "Facilities");
    expect(updated.category).toBe("Facilities");
    expect(routeReport(updated)).toBe("Facilities");
  });

  it("returns a new object and never mutates the input report", () => {
    const original = report({ id: "r1", category: "Dining" });
    const updated = reassignReport(original, "Grounds");
    expect(updated).not.toBe(original);
    expect(original.category).toBe("Dining"); // untouched
    expect(updated.category).toBe("Grounds");
  });
});

describe("detectCityIssue (pure, off-campus detection)", () => {
  it("flags potholes, public streetlights and sidewalks", () => {
    expect(detectCityIssue("huge pothole on Mass Ave").isCityIssue).toBe(true);
    expect(detectCityIssue("the streetlight on the corner is out").isCityIssue).toBe(
      true,
    );
    expect(detectCityIssue("cracked sidewalk outside the gate").isCityIssue).toBe(
      true,
    );
  });

  it("does not flag ordinary on-campus issues", () => {
    expect(detectCityIssue("ice cream machine is broken").isCityIssue).toBe(false);
    expect(detectCityIssue("wifi keeps dropping in the library").isCityIssue).toBe(
      false,
    );
  });
});

describe("cityHandoff (campus-configured card, nothing persisted)", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("builds the MIT card from campus config (Cambridge SeeClickFix)", async () => {
    const campus = await store.getCampus(MIT_CAMPUS_ID);
    const card = cityHandoff(campus as Campus);
    expect(card.serviceName).toBe("Cambridge SeeClickFix");
    expect(card.phone).toBe("617-349-4300");
    expect(card.url).toBe("https://www.cambridgema.gov/SeeClickFix");
    // Copy text references the configured service and is shareable.
    expect(card.message).toContain("Cambridge SeeClickFix");
    expect(card.copyText).toContain("Cambridge SeeClickFix");
  });

  it("is driven by config so a different campus yields different copy", () => {
    const other: Campus = {
      id: "bu",
      name: "Boston University",
      city: "Boston",
      state: "MA",
      latitude: 42.3505,
      longitude: -71.1054,
      cityServiceName: "Boston BOS:311",
      cityServiceUrl: "https://311.boston.gov",
      cityServicePhone: "311",
      campusPoliceName: "BU Police",
      campusPolicePhone: "617-353-2121",
      counselingName: "BU Counseling",
      counselingUrl: "https://bu.edu/shs",
    };
    const card = cityHandoff(other);
    expect(card.serviceName).toBe("Boston BOS:311");
    expect(card.phone).toBe("311");
    expect(card.message).toContain("Boston BOS:311");
    expect(card.message).not.toContain("Cambridge");
  });
});
