import { describe, expect, it } from "vitest";
// Exercise the package through its ENTRY POINT only — never lib/ internals.
import {
  OFFICE_OPTIONS,
  filePrivateReport,
  privacyNotice,
  routeOffice,
} from "../index";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";

describe("private: deterministic office routing (works with AI off)", () => {
  it("routes a roommate/door issue to Housing via the AI suggestion", () => {
    const result = routeOffice({
      text: "My roommate keeps leaving our door unlocked overnight.",
      suggestedOffice: "Housing",
    });
    expect(result.office).toBe("Housing");
    expect(result.emergency).toBe(false);
    // The AI suggestion stood because no hard rule overrode it.
    expect(result.hardRule).toBe(false);
  });

  it("hard-routes race/harassment to Title IX regardless of AI (AI off)", () => {
    const result = routeOffice({
      text: "Someone in my lab keeps making comments about my race.",
      // No suggestion at all — the AI is off.
    });
    expect(result.office).toBe("Title IX");
    expect(result.hardRule).toBe(true);
    expect(result.emergency).toBe(false);
  });

  it("hard-routes to Title IX even when the AI suggested a different office", () => {
    const result = routeOffice({
      text: "I was sexually harassed by a classmate.",
      suggestedOffice: "Dean of Students",
    });
    expect(result.office).toBe("Title IX");
    expect(result.hardRule).toBe(true);
  });

  it("raises an emergency and routes to Campus Police for immediate danger", () => {
    const result = routeOffice({
      text: "Someone is following me right now and I think they have a weapon.",
    });
    expect(result.emergency).toBe(true);
    expect(result.office).toBe("Campus Police");
    expect(result.hardRule).toBe(true);
  });

  it("defaults to Dean of Students when unclear and AI is off", () => {
    const result = routeOffice({
      text: "Something happened that I don't really know how to describe.",
    });
    expect(result.office).toBe("Dean of Students");
    expect(result.hardRule).toBe(false);
  });

  it("exposes all offices as override options for the review dropdown", () => {
    expect(OFFICE_OPTIONS).toContain("Dean of Students");
    expect(OFFICE_OPTIONS).toContain("Title IX");
    expect(OFFICE_OPTIONS).toContain("Housing");
    expect(OFFICE_OPTIONS.length).toBeGreaterThanOrEqual(7);
  });
});

describe("private: the privacy notice copy", () => {
  it("names the chosen office verbatim in the exact notice", () => {
    expect(privacyNotice("Title IX")).toBe(
      "Private, not confidential. Only Title IX will see this. Staff may be required to act on what you report.",
    );
    expect(privacyNotice("Dean of Students")).toContain("Only Dean of Students will see this");
  });
});

describe("private: filing a private report", () => {
  it("files to the routed office and the report is readable by that office only", async () => {
    const store = new InMemoryStore();
    const filed = await filePrivateReport(store, {
      campusId: MIT_CAMPUS_ID,
      reporterId: "user-ana",
      office: "Housing",
      title: "Roommate leaves the door unlocked",
      body: "My roommate keeps leaving our door unlocked overnight.",
      dontShareName: false,
    });
    expect(filed.id).toBeTruthy();
    expect(filed.office).toBe("Housing");
    expect(filed.currentOffice).toBe("Housing");
    expect(filed.status).toBe("Received");

    // The owning office can read it...
    const hana = await store.getUser("staff-housing");
    const owned = await store.getPrivateReport(filed.id, hana!);
    expect(owned.allowed).toBe(true);
    expect(owned.data?.title).toBe("Roommate leaves the door unlocked");

    // ...but another office cannot (least-exposure holds at the data seam).
    const titleix = await store.getUser("office-titleix");
    const denied = await store.getPrivateReport(filed.id, titleix!);
    expect(denied.allowed).toBe(false);
    expect(denied.data).toBeNull();
  });

  it("honors the 'don't share my name' flag on the filed report", async () => {
    const store = new InMemoryStore();
    const filed = await filePrivateReport(store, {
      campusId: MIT_CAMPUS_ID,
      reporterId: "user-cam",
      office: "Title IX",
      title: "Harassing comments",
      body: "Comments about my race in the lab.",
      dontShareName: true,
    });
    expect(filed.dontShareName).toBe(true);
  });

  it("never surfaces private reports in the public feed", async () => {
    const store = new InMemoryStore();
    const before = await store.listReports(MIT_CAMPUS_ID);
    await filePrivateReport(store, {
      campusId: MIT_CAMPUS_ID,
      reporterId: "user-ana",
      office: "Dean of Students",
      title: "Sensitive matter",
      body: "Something sensitive.",
      dontShareName: false,
    });
    const after = await store.listReports(MIT_CAMPUS_ID);
    // No public report row was created by filing privately.
    expect(after.length).toBe(before.length);
  });
});
