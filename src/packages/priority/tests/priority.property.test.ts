// Property-based tests (fast-check): instead of a handful of examples, these
// throw thousands of random inputs at the rules that must ALWAYS hold.
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { orderForFeed, priorityScore, type PrioritizableReport } from "@/packages/priority";
import { TIERS } from "@/types";

const report = fc.record({
  id: fc.uuid(),
  tier: fc.constantFrom(...TIERS),
  signers: fc.integer({ min: 1, max: 500 }),
  incomplete: fc.boolean(),
  createdAt: fc
    .integer({ min: Date.parse("2025-01-01"), max: Date.parse("2026-12-31") })
    .map((ms) => new Date(ms).toISOString()),
}) satisfies fc.Arbitrary<PrioritizableReport>;

describe("priority — properties", () => {
  it("ordering keeps every report exactly once (a permutation)", () => {
    fc.assert(
      fc.property(fc.array(report, { maxLength: 60 }), (reports) => {
        const out = orderForFeed(reports);
        expect(out).toHaveLength(reports.length);
        expect(new Set(out.map((r) => r.id))).toEqual(new Set(reports.map((r) => r.id)));
      }),
    );
  });

  it("an Urgent report is never ranked below a non-Urgent one", () => {
    fc.assert(
      fc.property(fc.array(report, { minLength: 1, maxLength: 60 }), (reports) => {
        const out = orderForFeed(reports);
        const firstNonUrgent = out.findIndex((r) => r.tier !== "Urgent");
        if (firstNonUrgent === -1) return;
        expect(out.slice(firstNonUrgent).some((r) => r.tier === "Urgent")).toBe(false);
      }),
    );
  });

  it("ordering is deterministic (same input, same order, whatever the input order)", () => {
    fc.assert(
      fc.property(fc.array(report, { maxLength: 40 }), (reports) => {
        const a = orderForFeed(reports).map((r) => r.id);
        const b = orderForFeed([...reports].reverse()).map((r) => r.id);
        expect(a).toEqual(b);
      }),
    );
  });

  it("more co-signers never lowers a report's score", () => {
    fc.assert(
      fc.property(report, fc.integer({ min: 0, max: 200 }), (r, extra) => {
        expect(priorityScore({ ...r, signers: r.signers + extra })).toBeGreaterThanOrEqual(priorityScore(r));
      }),
    );
  });
});
