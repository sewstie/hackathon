import { describe, expect, it } from "vitest";
// Exercise the package through its ENTRY POINTS only — never lib/ internals.
import {
  MA_IMPACT,
  getCampusView,
  searchCampuses,
} from "../index";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";

describe("campuses: school search", () => {
  it("finds MIT by name fragment", () => {
    const results = searchCampuses("MIT");
    const mit = results.find((c) => c.id === MIT_CAMPUS_ID);
    expect(mit).toBeDefined();
    expect(mit?.name).toContain("Massachusetts Institute of Technology");
    expect(mit?.seeded).toBe(true);
  });

  it("matches MIT on its full name too", () => {
    const results = searchCampuses("massachusetts institute");
    expect(results.some((c) => c.id === MIT_CAMPUS_ID)).toBe(true);
  });

  it("finds at least one other MA school", () => {
    const results = searchCampuses("harvard");
    const harvard = results.find((c) =>
      c.name.toLowerCase().includes("harvard"),
    );
    expect(harvard).toBeDefined();
    expect(harvard?.id).not.toBe(MIT_CAMPUS_ID);
    expect(harvard?.seeded).toBe(false);
  });

  it("can match on city as well as name", () => {
    const results = searchCampuses("worcester");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((c) => c.state === "MA"),
    ).toBe(true);
  });

  it("ranks MIT first for an exact prefix and dedupes the seeded campus", () => {
    const results = searchCampuses("Massachusetts Institute of Technology");
    expect(results[0]?.id).toBe(MIT_CAMPUS_ID);
    // MIT must appear exactly once (seeded id, not also an ipeds-* id).
    const mitRows = results.filter((c) =>
      c.name.includes("Massachusetts Institute of Technology"),
    );
    expect(mitRows).toHaveLength(1);
  });

  it("returns a bounded, sensible list for an empty query", () => {
    const results = searchCampuses("");
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(50);
  });

  it("returns nothing for a query that matches no MA school", () => {
    expect(searchCampuses("zzzzzzz-not-a-school")).toHaveLength(0);
  });
});

describe("campuses: opening a campus home", () => {
  it("opens the seeded MIT campus from the store", async () => {
    const store = new InMemoryStore();
    const view = await getCampusView(MIT_CAMPUS_ID, store);
    expect(view).not.toBeNull();
    expect(view?.seeded).toBe(true);
    expect(view?.campus.id).toBe(MIT_CAMPUS_ID);
    expect(view?.campus.name).toBe("MIT");
    // Real demo campus carries the Cambridge SeeClickFix handoff.
    expect(view?.campus.cityServiceName).toBe("Cambridge SeeClickFix");
  });

  it("opens a non-seeded MA school as empty-but-usable (no Coming soon wall)", async () => {
    const store = new InMemoryStore();
    const harvard = searchCampuses("harvard").find((c) =>
      c.name.toLowerCase().includes("harvard"),
    );
    expect(harvard).toBeDefined();

    const view = await getCampusView(harvard!.id, store);
    expect(view).not.toBeNull();
    expect(view?.seeded).toBe(false);
    // Usable: has a real name, a city, MA state, and map coordinates.
    expect(view?.campus.name.toLowerCase()).toContain("harvard");
    expect(view?.campus.state).toBe("MA");
    expect(view?.campus.city.length).toBeGreaterThan(0);
    expect(Number.isFinite(view?.campus.latitude)).toBe(true);
    expect(Number.isFinite(view?.campus.longitude)).toBe(true);
    // A campus-agnostic fallback still has safety contacts so screens render.
    expect(view?.campus.campusPolicePhone.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown campus id", async () => {
    const store = new InMemoryStore();
    expect(await getCampusView("ipeds-000000", store)).toBeNull();
    expect(await getCampusView("not-a-campus", store)).toBeNull();
  });
});

describe("campuses: Massachusetts economic-impact numbers (AICUM 2025)", () => {
  it("exposes the headline statewide figures verbatim", () => {
    expect(MA_IMPACT.year).toBe(2025);
    expect(MA_IMPACT.economicImpact).toBe("$71.1 billion");
    expect(MA_IMPACT.taxRevenue).toBe("$2.4 billion");
    expect(MA_IMPACT.jobsSupported).toBe("320,800");
    expect(MA_IMPACT.memberInstitutions).toBe(59);
  });

  it("carries a source citation with a URL", () => {
    expect(MA_IMPACT.source).toMatch(/AICUM/i);
    expect(MA_IMPACT.sourceUrl).toMatch(/^https?:\/\/.*aicum\.org/);
  });

  it("includes the regional breakdown that sums to the statewide total", () => {
    const byName = Object.fromEntries(
      MA_IMPACT.regions.map((r) => [r.name, r.impact]),
    );
    expect(byName["Eastern MA"]).toBe("$64.0 billion");
    expect(byName["Central MA"]).toBe("$3.8 billion");
    expect(byName["Western MA"]).toBe("$3.3 billion");
  });
});
