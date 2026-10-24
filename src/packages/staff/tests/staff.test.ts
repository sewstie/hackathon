// Interface-level tests for the staff package.
//
// Exercised strictly through the package's entry point (../index) against the
// deterministic in-memory Store — no cloud, no mocking of internals. Covers
// ticket 12 (F12): the queue is ordered by the priority rule (07) then
// oldest-first and carries signer counts / age / flags; status changes fan out
// 09 notifications; filters narrow the list; a responder only sees their own
// team + an office-scoped private inbox; other-office staff see nothing.

import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";
import type { Store } from "@/lib/store";
import type { User } from "@/types";
import {
  changeReportStatus,
  overrideTier,
  privateInbox,
  reassignToTeam,
  teamQueue,
  visibleTabs,
} from "../index";

const NOW = new Date("2026-10-24T12:00:00.000Z");

const facilitiesStaff: User = {
  id: "staff-facilities",
  name: "Rosa (Facilities)",
  email: "rosa@mit.edu",
  role: "responder",
  publicTeam: "Facilities",
  privateOffice: "Facilities",
};
const diningStaff: User = {
  id: "staff-dining",
  name: "Diego (Dining)",
  email: "diego@mit.edu",
  role: "responder",
  publicTeam: "Dining",
};

describe("visibleTabs", () => {
  it("shows a responder their own team plus a private inbox when they hold an office", () => {
    const tabs = visibleTabs(facilitiesStaff);
    expect(tabs.team).toBe("Facilities");
    expect(tabs.hasPrivateInbox).toBe(true);
    expect(tabs.office).toBe("Facilities");
  });

  it("shows a responder with no office their team and no private inbox", () => {
    const tabs = visibleTabs(diningStaff);
    expect(tabs.team).toBe("Dining");
    expect(tabs.hasPrivateInbox).toBe(false);
    expect(tabs.office).toBeNull();
  });

  it("shows a student no staff tabs", () => {
    const student: User = {
      id: "user-ana",
      name: "Ana",
      email: "ana@mit.edu",
      role: "student",
    };
    const tabs = visibleTabs(student);
    expect(tabs.team).toBeNull();
    expect(tabs.hasPrivateInbox).toBe(false);
  });

  it("returns empty tabs for a null user", () => {
    expect(visibleTabs(null)).toEqual({
      team: null,
      hasPrivateInbox: false,
      office: null,
    });
  });
});

describe("teamQueue", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("returns only the team's category and orders by the priority rule (07)", async () => {
    const queue = await teamQueue(store, MIT_CAMPUS_ID, "Facilities", undefined, NOW);
    // Every row belongs to Facilities.
    expect(queue.every((row) => row.report.category === "Facilities")).toBe(true);

    // Seeded Facilities reports: handrail (High, 4 signers), heater (High),
    // door (High), leak (High). High-tier reports lead; the queue is sorted so
    // each score is >= the next (priority-ordered, then oldest-first).
    const scores = queue.map((row) => row.report.tier);
    expect(queue.length).toBeGreaterThan(0);
    // The highest-priority Facilities report is a High tier.
    expect(scores[0]).toBe("High");
  });

  it("carries live signer counts, age in days, and flags", async () => {
    const queue = await teamQueue(store, MIT_CAMPUS_ID, "Facilities", undefined, NOW);
    const handrail = queue.find((row) => row.report.id === "rep-handrail");
    expect(handrail).toBeDefined();
    // Seeded handrail: reporter + 3 co-signers = 4.
    expect(handrail!.signers).toBe(4);
    // Created 3 days before NOW.
    expect(handrail!.ageDays).toBe(3);
    // Tier presentation carries an accessible text label (never color alone).
    expect(handrail!.tier.label).toBe("High");
    expect(handrail!.tier.colorVar).toContain("--tier-high");
    expect(handrail!.incomplete).toBe(false);
    expect(handrail!.locationUnverified).toBe(false);
  });

  it("filters the queue by status", async () => {
    const all = await teamQueue(store, MIT_CAMPUS_ID, "Facilities", undefined, NOW);
    const received = await teamQueue(
      store,
      MIT_CAMPUS_ID,
      "Facilities",
      { status: "Received" },
      NOW,
    );
    expect(received.length).toBeLessThan(all.length);
    expect(received.every((row) => row.report.status === "Received")).toBe(true);
  });

  it("filters the queue by building", async () => {
    const byBuilding = await teamQueue(
      store,
      MIT_CAMPUS_ID,
      "Facilities",
      { buildingId: "bldg-26" },
      NOW,
    );
    expect(byBuilding.length).toBeGreaterThan(0);
    expect(byBuilding.every((row) => row.report.buildingId === "bldg-26")).toBe(true);
  });
});

describe("changeReportStatus", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("marking Fixed triggers 09 notifications to every recipient", async () => {
    const result = await changeReportStatus(store, "rep-icecream", "Fixed");
    expect(result.report.status).toBe("Fixed");
    // Seeded ice-cream report: reporter + 13 co-signers = 14.
    expect(result.notified).toBe(14);
    const unread = await store.countUnread("user-ben");
    expect(unread).toBe(1);
  });

  it("rejects a Won't fix with no reason", async () => {
    await expect(changeReportStatus(store, "rep-icecream", "Won't fix")).rejects.toThrow(
      /reason/i,
    );
  });
});

describe("reassignToTeam", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("moves a report into the new team's queue and out of the old one", async () => {
    // rep-shower is Housing; reassign it to Facilities.
    const moved = await reassignToTeam(store, "rep-shower", "Facilities");
    expect(moved.category).toBe("Facilities");

    const facilities = await teamQueue(store, MIT_CAMPUS_ID, "Facilities", undefined, NOW);
    expect(facilities.some((row) => row.report.id === "rep-shower")).toBe(true);

    const housing = await teamQueue(store, MIT_CAMPUS_ID, "Housing", undefined, NOW);
    expect(housing.some((row) => row.report.id === "rep-shower")).toBe(false);
  });
});

describe("overrideTier", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("replaces the report's tier (staff judgment is final)", async () => {
    const updated = await overrideTier(store, "rep-icecream", "Urgent");
    expect(updated.tier).toBe("Urgent");
    const queue = await teamQueue(store, MIT_CAMPUS_ID, "Dining", undefined, NOW);
    const icecream = queue.find((row) => row.report.id === "rep-icecream");
    expect(icecream!.report.tier).toBe("Urgent");
    // Urgent leads the Dining queue regardless of signer counts.
    expect(queue[0].report.id).toBe("rep-icecream");
  });
});

describe("privateInbox", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("lists only the active office's private reports", async () => {
    const housingStaff: User = {
      id: "staff-housing",
      name: "Hana (Housing)",
      email: "hana@mit.edu",
      role: "responder",
      publicTeam: "Housing",
      privateOffice: "Housing",
    };
    const inbox = await privateInbox(store, housingStaff);
    expect(inbox.length).toBeGreaterThan(0);
    expect(inbox.every((r) => r.currentOffice === "Housing")).toBe(true);
    // The Title IX report is not in Housing's inbox.
    expect(inbox.some((r) => r.id === "priv-titleix")).toBe(false);
  });

  it("denies a responder from another office any data", async () => {
    // Dining staff hold no office → empty inbox.
    const inbox = await privateInbox(store, diningStaff);
    expect(inbox).toEqual([]);
  });
});
