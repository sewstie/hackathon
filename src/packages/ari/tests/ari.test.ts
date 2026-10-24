import { describe, expect, it } from "vitest";
// Exercise the package through its ENTRY POINT only — never lib/ internals.
import {
  ariHistoryLine,
  ariQuickFixes,
  ariIntro,
  ariSuppressed,
  stillBrokenSignal,
  thatFixedIt,
  type AriContext,
} from "../index";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";

const wifi: AriContext = {
  campusId: MIT_CAMPUS_ID,
  category: "IT",
  item: "wifi",
};

describe("ari: history line (computed from seeded data)", () => {
  it("reads the Wi-Fi fixture as ~9 similar · ~3 days", async () => {
    const store = new InMemoryStore();
    const line = await ariHistoryLine(store, wifi);
    // 1 open Wi-Fi report + 8 fixed Wi-Fi history rows = 9 similar.
    expect(line).toBe(
      "9 similar reports this semester · usually fixed in ~3 days",
    );
  });

  it("falls back to the first-report line when there is no history", async () => {
    const store = new InMemoryStore();
    const line = await ariHistoryLine(store, {
      campusId: MIT_CAMPUS_ID,
      category: "Grounds",
      item: "sprinkler head",
    });
    expect(line).toBe("First report like this here.");
  });

  it("counts similar reports case-insensitively by item", async () => {
    const store = new InMemoryStore();
    const upper = await ariHistoryLine(store, {
      campusId: MIT_CAMPUS_ID,
      category: "IT",
      item: "WIFI",
    });
    expect(upper).toContain("9 similar reports this semester");
  });
});

describe("ari: curated quick fixes", () => {
  it("returns up to two curated Wi-Fi fixes (reconnect first)", async () => {
    const store = new InMemoryStore();
    const fixes = await ariQuickFixes(store, wifi);
    expect(fixes.length).toBeGreaterThan(0);
    expect(fixes.length).toBeLessThanOrEqual(2);
    expect(fixes[0].text.toLowerCase()).toContain("reconnect");
  });

  it("matches category + item and never leaks other categories", async () => {
    const store = new InMemoryStore();
    const fixes = await ariQuickFixes(store, wifi);
    expect(fixes.every((f) => f.category === "IT")).toBe(true);
    expect(fixes.every((f) => (f.item ?? "").toLowerCase() === "wifi")).toBe(
      true,
    );
  });

  it("returns no quick fixes for a category/item with none curated", async () => {
    const store = new InMemoryStore();
    const fixes = await ariQuickFixes(store, {
      campusId: MIT_CAMPUS_ID,
      category: "Grounds",
      item: "sprinkler head",
    });
    expect(fixes).toHaveLength(0);
  });
});

describe("ari: suppression (safety beats help)", () => {
  it("is shown for an ordinary classified report", () => {
    expect(ariSuppressed({})).toBe(false);
  });

  it("is suppressed in an emergency", () => {
    expect(ariSuppressed({ emergency: true })).toBe(true);
  });

  it("is suppressed for a safety hazard", () => {
    expect(ariSuppressed({ safetyHazard: true })).toBe(true);
  });

  it("is suppressed for a private report that names a person", () => {
    expect(ariSuppressed({ privatePersonNaming: true })).toBe(true);
  });
});

describe("ari: intro message", () => {
  it("produces a one-line, non-empty message for a category", () => {
    const msg = ariIntro("IT");
    expect(msg.length).toBeGreaterThan(0);
    expect(msg).not.toContain("\n");
  });
});

describe('ari: "That fixed it" and "Still broken"', () => {
  it("logs a self-resolution and files NO report", async () => {
    const store = new InMemoryStore();
    const before = (await store.listReports(MIT_CAMPUS_ID)).length;

    const resolution = await thatFixedIt(store, {
      ...wifi,
      userId: "user-ana",
    });

    expect(resolution.category).toBe("IT");
    expect(resolution.item).toBe("wifi");
    expect(resolution.userId).toBe("user-ana");
    // Nothing was filed.
    const after = (await store.listReports(MIT_CAMPUS_ID)).length;
    expect(after).toBe(before);
  });

  it("emits a continue signal the report flow can act on", () => {
    const signal = stillBrokenSignal();
    expect(signal.continue).toBe(true);
  });
});
