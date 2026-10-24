// Interface-level tests for the duplicates package.
//
// Exercised strictly through the package's entry point (../index) against the
// deterministic in-memory Store — no cloud, no mocking of internals. Covers the
// deterministic matcher (normalize + same building/category/item), the "pick
// the single best candidate" rule (highest priority, else newest), and the
// co-sign flow (one per user; reporter counts as signed).

import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";
import type { Store } from "@/lib/store";
import type { Report } from "@/types";
import {
  coSign,
  findDuplicate,
  findDuplicateCandidate,
  normalizeItem,
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

describe("normalizeItem", () => {
  it("lowercases, trims, and collapses hyphens/whitespace", () => {
    expect(normalizeItem("  Ice-Cream   Machine ")).toBe("ice cream machine");
    expect(normalizeItem("HANDRAIL")).toBe("handrail");
    // Hyphens collapse to spaces before synonym folding.
    expect(normalizeItem("Coffee-Machine")).toBe("coffee machine");
  });

  it("treats a few known synonyms as the same item", () => {
    expect(normalizeItem("wifi")).toBe(normalizeItem("wi-fi"));
    expect(normalizeItem("A/C")).toBe(normalizeItem("ac"));
  });
});

describe("findDuplicateCandidate (pure matcher)", () => {
  const candidates: Report[] = [
    report({ id: "same-bldg-cat-item", buildingId: "bldg-w20", category: "Dining", item: "ice cream machine" }),
    report({ id: "diff-building", buildingId: "bldg-maseeh", category: "Dining", item: "ice cream machine" }),
    report({ id: "diff-category", buildingId: "bldg-w20", category: "Facilities", item: "ice cream machine" }),
    report({ id: "diff-item", buildingId: "bldg-w20", category: "Dining", item: "coffee machine" }),
    report({ id: "fixed", buildingId: "bldg-w20", category: "Dining", item: "ice cream machine", status: "Fixed" }),
  ];

  it("matches same building AND category AND normalized item only", () => {
    const match = findDuplicateCandidate(
      { buildingId: "bldg-w20", category: "Dining", item: "Ice-Cream Machine" },
      candidates,
    );
    expect(match?.id).toBe("same-bldg-cat-item");
  });

  it("ignores reports that are Fixed or Won't fix", () => {
    const match = findDuplicateCandidate(
      { buildingId: "bldg-w20", category: "Dining", item: "ice cream machine" },
      [report({ id: "fixed", status: "Fixed" }), report({ id: "wontfix", status: "Won't fix" })],
    );
    expect(match).toBeNull();
  });

  it("returns null when nothing matches", () => {
    const match = findDuplicateCandidate(
      { buildingId: "bldg-10", category: "IT", item: "projector" },
      candidates,
    );
    expect(match).toBeNull();
  });

  it("surfaces the single best candidate: highest priority first", () => {
    const low = report({ id: "low", tier: "Low", createdAt: "2026-10-23T00:00:00.000Z" });
    const high = report({ id: "high", tier: "High", createdAt: "2026-10-10T00:00:00.000Z" });
    const match = findDuplicateCandidate(
      { buildingId: "bldg-w20", category: "Dining", item: "ice cream machine" },
      [low, high],
    );
    expect(match?.id).toBe("high");
  });

  it("breaks a priority tie by newest", () => {
    const older = report({ id: "older", tier: "Medium", createdAt: "2026-10-01T00:00:00.000Z" });
    const newer = report({ id: "newer", tier: "Medium", createdAt: "2026-10-22T00:00:00.000Z" });
    const match = findDuplicateCandidate(
      { buildingId: "bldg-w20", category: "Dining", item: "ice cream machine" },
      [older, newer],
    );
    expect(match?.id).toBe("newer");
  });
});

describe("findDuplicate (store-aware) + coSign", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("finds the seeded ice-cream report with its live signer count", async () => {
    const match = await findDuplicate(store, {
      campusId: MIT_CAMPUS_ID,
      buildingId: "bldg-w20",
      category: "Dining",
      item: "Ice-Cream Machine",
    });
    expect(match).not.toBeNull();
    expect(match?.report.id).toBe("rep-icecream");
    expect(match?.report.title).toBe("Ice cream machine is broken");
    expect(match?.report.location).toContain("Stratton");
    expect(match?.signers).toBe(14);
    expect(match?.status).toBe("Received");
  });

  it("returns null when there is no open same-building/category/item report", async () => {
    const match = await findDuplicate(store, {
      campusId: MIT_CAMPUS_ID,
      buildingId: "bldg-10",
      category: "IT",
      item: "projector",
    });
    expect(match).toBeNull();
  });

  it("co-signing the ice-cream report takes 14 → 15", async () => {
    const result = await coSign(store, "rep-icecream", "user-ana");
    expect(result.signed).toBe(true);
    expect(result.signers).toBe(15);
  });

  it("rejects a second co-sign by the same user (stays 15)", async () => {
    await coSign(store, "rep-icecream", "user-ana");
    const second = await coSign(store, "rep-icecream", "user-ana");
    expect(second.signed).toBe(false);
    expect(second.signers).toBe(15);
  });

  it("the reporter already counts as signed, so a reporter co-sign is rejected", async () => {
    const result = await coSign(store, "rep-icecream", "user-ben");
    expect(result.signed).toBe(false);
    expect(result.signers).toBe(14);
  });
});
