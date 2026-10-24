// Interface-level test for the enriched MIT demo seed (ticket 08).
//
// Exercises the seed only through the public Store surface + buildSeed()'s
// returned snapshot shape. Proves the demo has varied, balanced content so
// every staff queue shows something, and that the in-memory seed stays
// deterministic (same snapshot every call).

import { describe, expect, it } from "vitest";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";
import { buildSeed } from "@/lib/store/seed";
import { OFFICES, PUBLIC_TEAMS, STATUSES, TIERS } from "@/types";
import type { Category, Report } from "@/types";

// A report's team is its category when that category is a public team.
function teamOf(r: Report): string {
  return r.category;
}

describe("enriched MIT seed", () => {
  it("gives every public team several reports", async () => {
    const store = new InMemoryStore();
    const reports = await store.listReports(MIT_CAMPUS_ID);
    for (const team of PUBLIC_TEAMS) {
      const forTeam = reports.filter((r) => teamOf(r) === team);
      expect(
        forTeam.length,
        `team ${team} should have >= 3 reports`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("spans every tier and every status", async () => {
    const store = new InMemoryStore();
    const reports = await store.listReports(MIT_CAMPUS_ID);
    for (const tier of TIERS) {
      expect(
        reports.some((r) => r.tier === tier),
        `tier ${tier} should appear`,
      ).toBe(true);
    }
    for (const status of STATUSES) {
      expect(
        reports.some((r) => r.status === status),
        `status ${status} should appear`,
      ).toBe(true);
    }
  });

  it("has varied co-sign counts so the ranking visibly differs", async () => {
    const store = new InMemoryStore();
    const reports = await store.listReports(MIT_CAMPUS_ID);
    const counts = await Promise.all(
      reports.map((r) => store.countSigners(r.id)),
    );
    const distinct = new Set(counts);
    expect(distinct.size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(10);
  });

  it("keeps the scripted hero signer counts (14 / 4 / 9)", async () => {
    const store = new InMemoryStore();
    expect(await store.countSigners("rep-icecream")).toBe(14);
    expect(await store.countSigners("rep-handrail")).toBe(4);
    expect(await store.countSigners("rep-wifi")).toBe(9);
  });

  it("includes some reports fixed within the last week", async () => {
    const store = new InMemoryStore();
    const reports = await store.listReports(MIT_CAMPUS_ID);
    const weekAgo = Date.now() - 7 * 86_400_000;
    const fixedThisWeek = reports.filter(
      (r) => r.status === "Fixed" && Date.parse(r.createdAt) >= weekAgo,
    );
    expect(fixedThisWeek.length).toBeGreaterThanOrEqual(1);
  });

  it("includes near-duplicate reports (same item + building) to demo co-sign/merge", async () => {
    const store = new InMemoryStore();
    const reports = await store.listReports(MIT_CAMPUS_ID);
    const seen = new Map<string, number>();
    for (const r of reports) {
      const key = `${r.category}:${r.item}:${r.buildingId ?? ""}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const hasDuplicateGroup = [...seen.values()].some((n) => n >= 2);
    expect(hasDuplicateGroup).toBe(true);
  });

  it("keeps the key private offices seeded (Housing + Title IX untouched)", async () => {
    const seed = buildSeed();
    const offices = seed.privateReports.map((p) => p.currentOffice);
    expect(offices).toContain("Housing");
    expect(offices).toContain("Title IX");
    expect(seed.privateReports.find((p) => p.id === "priv-housing")?.reporterId).toBe(
      "user-ana",
    );
  });

  it("gives every private office at least one direct report (no empty staff inbox)", () => {
    const seed = buildSeed();
    for (const office of OFFICES) {
      expect(
        seed.privateReports.filter((p) => p.currentOffice === office).length,
        `office ${office} should have a private report`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("gives every staff member something to open in the staff view", async () => {
    const store = new InMemoryStore();
    const seed = buildSeed();
    const reports = await store.listReports(MIT_CAMPUS_ID);
    for (const staff of seed.users.filter((u) => u.role === "responder")) {
      const queue = staff.publicTeam ? reports.filter((r) => r.category === staff.publicTeam).length : 0;
      const inbox = (await store.listPrivateReportsForActor(staff)).length;
      expect(queue + inbox, `${staff.name} should have reports`).toBeGreaterThan(0);
      if (staff.publicTeam) expect(queue, `${staff.publicTeam} queue`).toBeGreaterThanOrEqual(6);
    }
  });

  it("is deterministic: buildSeed() returns the same data every call", () => {
    const a = buildSeed();
    const b = buildSeed();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // ...but a fresh, independently-mutable snapshot (not the same reference).
    expect(a.reports).not.toBe(b.reports);
  });

  it("only uses valid category/tier/status enum values", async () => {
    const store = new InMemoryStore();
    const reports = await store.listReports(MIT_CAMPUS_ID);
    const cats = new Set<Category>([
      "Facilities",
      "Dining",
      "Housing",
      "IT",
      "Grounds",
      "Safety",
      "City",
    ]);
    for (const r of reports) {
      expect(cats.has(r.category)).toBe(true);
      expect(TIERS).toContain(r.tier);
      expect(STATUSES).toContain(r.status);
    }
  });
});
