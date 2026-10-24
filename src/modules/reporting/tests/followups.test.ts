// Ticket 04 — smart follow-ups, tested through the reporting module's PUBLIC
// INTERFACE only. No network and no cloud: chip data comes from the in-memory
// seed store and geolocation is passed in as plain coordinates.
//
// The invariants pinned here:
//   1. Only genuinely-missing details are asked, LOCATION FIRST, capped at 3.
//   2. Chips come from seeded campus data (buildings, floors, dining, items);
//      an unseeded campus falls back to free-text (no chips).
//   3. "Use my location" compares device coords to the chosen building and sets
//      the location-unverified flag past 500 m.
//   4. If details still remain after the 3-question cap the draft is incomplete.
import { describe, expect, it } from "vitest";

import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";

import {
  buildFollowUpPlan,
  verifyDeviceLocation,
  type ReportDraft,
} from "../index";

function draftFor(
  category: ReportDraft["category"],
  missingDetails: string[],
  location = "",
): ReportDraft {
  return {
    text: "something is broken",
    category,
    item: "ice cream machine",
    title: "Broken thing",
    tier: "Medium",
    location,
    missingDetails,
    namesPerson: false,
    fromFallback: false,
  };
}

describe("reporting — follow-up question selection", () => {
  it("asks location first and never more than 3 questions", async () => {
    const store = new InMemoryStore();
    // Classifier says four things are missing; location is buried in the list.
    const draft = draftFor("Dining", ["item", "floor", "location", "dining hall"]);

    const plan = await buildFollowUpPlan(draft, { store, campusId: MIT_CAMPUS_ID });

    expect(plan.questions.length).toBeLessThanOrEqual(3);
    // Location is always the first question when it's missing.
    expect(plan.questions[0].detail).toBe("location");
  });

  it("only asks for details that are actually missing", async () => {
    const store = new InMemoryStore();
    // Nothing missing -> no questions, and the draft is complete.
    const plan = await buildFollowUpPlan(draftFor("IT", []), {
      store,
      campusId: MIT_CAMPUS_ID,
    });
    expect(plan.questions).toHaveLength(0);
    expect(plan.incomplete).toBe(false);
  });

  it("flags the draft incomplete when details remain after the 3-question cap", async () => {
    const store = new InMemoryStore();
    const draft = draftFor("Dining", [
      "location",
      "floor",
      "dining hall",
      "item",
    ]);
    const plan = await buildFollowUpPlan(draft, { store, campusId: MIT_CAMPUS_ID });
    expect(plan.questions).toHaveLength(3);
    // A 4th missing detail could not be asked within the cap.
    expect(plan.incomplete).toBe(true);
  });
});

describe("reporting — follow-up chips come from seeded campus data", () => {
  it("offers building chips drawn from the seed for the location question", async () => {
    const store = new InMemoryStore();
    const plan = await buildFollowUpPlan(draftFor("Facilities", ["location"]), {
      store,
      campusId: MIT_CAMPUS_ID,
    });
    const locationQ = plan.questions.find((q) => q.detail === "location");
    expect(locationQ).toBeTruthy();
    // Real seeded buildings show up as chips.
    expect(locationQ!.chips).toContain("Stratton Student Center (W20)");
    expect(locationQ!.chips).toContain("Building 10 (Great Dome)");
    // "Use my location" + "Type instead" are always available on location.
    expect(locationQ!.useMyLocation).toBe(true);
    expect(locationQ!.allowTypeInstead).toBe(true);
  });

  it("offers dining-hall chips for a Dining report once a building is known", async () => {
    const store = new InMemoryStore();
    const draft = draftFor(
      "Dining",
      ["dining hall"],
      "Stratton Student Center (W20)",
    );
    const plan = await buildFollowUpPlan(draft, { store, campusId: MIT_CAMPUS_ID });
    const diningQ = plan.questions.find((q) => q.detail === "dining hall");
    expect(diningQ).toBeTruthy();
    expect(diningQ!.chips).toContain("Lobdell Dining");
  });

  it("falls back to free-text (no chips) on an unseeded campus", async () => {
    const store = new InMemoryStore();
    const plan = await buildFollowUpPlan(draftFor("Facilities", ["location"]), {
      store,
      campusId: "unseeded-campus",
    });
    const locationQ = plan.questions.find((q) => q.detail === "location");
    expect(locationQ).toBeTruthy();
    expect(locationQ!.chips).toHaveLength(0);
    // With no chips the student must be able to type.
    expect(locationQ!.allowTypeInstead).toBe(true);
  });
});

describe("reporting — Use my location verifies against the chosen building", () => {
  it("accepts a device within 500 m of the chosen building", async () => {
    const store = new InMemoryStore();
    const result = await verifyDeviceLocation(
      { store, campusId: MIT_CAMPUS_ID, buildingId: "bldg-w20" },
      // A few metres from W20's seeded coordinates.
      { latitude: 42.3592, longitude: -71.0954 },
    );
    expect(result.verified).toBe(true);
    expect(result.locationUnverified).toBe(false);
    expect(result.distanceMeters).toBeLessThan(500);
  });

  it("flags location-unverified when the device is more than 500 m away", async () => {
    const store = new InMemoryStore();
    const result = await verifyDeviceLocation(
      { store, campusId: MIT_CAMPUS_ID, buildingId: "bldg-w20" },
      // Downtown Boston — well over 500 m from campus.
      { latitude: 42.3555, longitude: -71.0600 },
    );
    expect(result.verified).toBe(false);
    expect(result.locationUnverified).toBe(true);
    expect(result.distanceMeters).toBeGreaterThan(500);
  });
});
