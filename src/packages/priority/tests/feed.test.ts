import { describe, expect, it } from "vitest";
import { orderForFeed, priorityScore } from "../index";
import type { PrioritizableReport } from "../index";

// The student feed is a popularity-aware view of the same priority rule: it
// reuses the documented severity × reach score so the most-wanted, most-severe
// issues rise, but — unlike the staff list — it breaks ties newest-first so the
// feed reads like a fresh stream. The function is pure: a new array, input
// untouched, deterministic for a given set.
function report(
  overrides: Partial<PrioritizableReport> & Pick<PrioritizableReport, "id">,
): PrioritizableReport {
  return {
    tier: "Medium",
    signers: 0,
    incomplete: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("orderForFeed", () => {
  it("ranks a more-signed report of the same tier higher", () => {
    const popular = report({ id: "pop", tier: "Medium", signers: 20 });
    const quiet = report({ id: "quiet", tier: "Medium", signers: 1 });
    const ordered = orderForFeed([quiet, popular]);
    expect(ordered.map((r) => r.id)).toEqual(["pop", "quiet"]);
  });

  it("still weights severity above popularity (uses the priority score)", () => {
    // High(200)+4 = 204 beats Medium(100)+9 = 109.
    const high = report({ id: "high", tier: "High", signers: 4 });
    const medium = report({ id: "medium", tier: "Medium", signers: 9 });
    const ordered = orderForFeed([medium, high]);
    expect(ordered.map((r) => r.id)).toEqual(["high", "medium"]);
    expect(priorityScore(high)).toBeGreaterThan(priorityScore(medium));
  });

  it("keeps Urgent at the very top regardless of signers", () => {
    const urgent = report({ id: "u", tier: "Urgent", signers: 0 });
    const popularHigh = report({ id: "ph", tier: "High", signers: 90 });
    const ordered = orderForFeed([popularHigh, urgent]);
    expect(ordered[0].id).toBe("u");
  });

  it("breaks score ties newest-first (feed freshness)", () => {
    const older = report({
      id: "older",
      tier: "Medium",
      signers: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = report({
      id: "newer",
      tier: "Medium",
      signers: 5,
      createdAt: "2026-03-01T00:00:00.000Z",
    });
    const ordered = orderForFeed([older, newer]);
    expect(ordered.map((r) => r.id)).toEqual(["newer", "older"]);
  });

  it("is deterministic across equal reports (stable newest-first id tie-break)", () => {
    // Identical score AND identical createdAt → deterministic by id.
    const a = report({ id: "a", tier: "Medium", signers: 3 });
    const b = report({ id: "b", tier: "Medium", signers: 3 });
    const c = report({ id: "c", tier: "Medium", signers: 3 });
    const first = orderForFeed([c, a, b]).map((r) => r.id);
    const second = orderForFeed([a, b, c]).map((r) => r.id);
    expect(first).toEqual(second);
  });

  it("does not mutate the input array", () => {
    const input = [
      report({ id: "x", tier: "Low", signers: 1 }),
      report({ id: "y", tier: "Urgent", signers: 0 }),
    ];
    const snapshot = input.map((r) => r.id);
    orderForFeed(input);
    expect(input.map((r) => r.id)).toEqual(snapshot);
  });

  it("returns an empty array unchanged (empty campus)", () => {
    expect(orderForFeed([])).toEqual([]);
  });
});
