// Interface-level tests for the notifications package.
//
// Exercised strictly through the package's entry point (../index) against the
// deterministic in-memory Store — no cloud, no mocking of internals. Covers the
// closed loop: a status change writes one notification per recipient (reporter
// + all co-signers) with body "[title] is now [status]", the bell unread count
// reflects it for each recipient, "Won't fix" requires a reason, and the
// "Fixed this week" list surfaces recently-fixed public reports.

import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";
import type { Store } from "@/lib/store";
import {
  STATUS_FLOW,
  changeStatus,
  fixedThisWeek,
  notificationBody,
  unreadCount,
} from "../index";

describe("notificationBody", () => {
  it("formats '[title] is now [status]'", () => {
    expect(notificationBody("Ice cream machine is broken", "Fixed")).toBe(
      "Ice cream machine is broken is now Fixed",
    );
  });
});

describe("STATUS_FLOW", () => {
  it("is the public lifecycle in order", () => {
    expect(STATUS_FLOW).toEqual(["Received", "Assigned", "In progress", "Fixed"]);
  });
});

describe("changeStatus", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("marks the seeded ice-cream report Fixed and updates its status", async () => {
    const result = await changeStatus(store, "rep-icecream", "Fixed");
    expect(result.report.status).toBe("Fixed");
    const reloaded = await store.getReport("rep-icecream");
    expect(reloaded?.status).toBe("Fixed");
  });

  it("notifies the reporter and every co-signer exactly once (14 recipients)", async () => {
    // Seeded ice-cream report has 14 signers (reporter Ben + 13 co-signers).
    const result = await changeStatus(store, "rep-icecream", "Fixed");
    expect(result.notified).toBe(14);

    const coSigns = await store.listCoSigns("rep-icecream");
    const recipientIds = coSigns.map((c) => c.userId);
    expect(recipientIds).toHaveLength(14);

    // Each recipient gets exactly one notification with the right body.
    for (const id of recipientIds) {
      const notes = await store.listNotifications(id);
      expect(notes).toHaveLength(1);
      expect(notes[0].body).toBe("Ice cream machine is broken is now Fixed");
    }
  });

  it("the bell unread count reflects the notification for each recipient", async () => {
    await changeStatus(store, "rep-icecream", "Fixed");
    const reporterUnread = await unreadCount(store, "user-ben");
    const coSignerUnread = await unreadCount(store, "bg-student-1");
    expect(reporterUnread).toBe(1);
    expect(coSignerUnread).toBe(1);
    // A non-signer is untouched.
    const strangerUnread = await unreadCount(store, "user-cam");
    expect(strangerUnread).toBe(0);
  });

  it("stores the reason on a Won't fix and includes it in the result", async () => {
    const result = await changeStatus(
      store,
      "rep-icecream",
      "Won't fix",
      "Machine is being replaced next month.",
    );
    expect(result.report.status).toBe("Won't fix");
    expect(result.report.resolutionNote).toBe(
      "Machine is being replaced next month.",
    );
  });

  it("rejects a Won't fix with no reason and writes nothing", async () => {
    await expect(changeStatus(store, "rep-icecream", "Won't fix")).rejects.toThrow(
      /reason/i,
    );
    // No notifications were written.
    const notes = await store.listNotifications("user-ben");
    expect(notes).toHaveLength(0);
    // Status is unchanged.
    const reloaded = await store.getReport("rep-icecream");
    expect(reloaded?.status).toBe("Received");
  });
});

describe("fixedThisWeek", () => {
  let store: Store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("lists a report fixed within the last 7 days and omits older/unfixed ones", async () => {
    // The seeded ice-cream report is created 2 days ago; fixing it now puts a
    // recent Fixed report in the window.
    await changeStatus(store, "rep-icecream", "Fixed");
    const list = await fixedThisWeek(store, MIT_CAMPUS_ID);
    const ids = list.map((r) => r.id);
    expect(ids).toContain("rep-icecream");
    // Seeded historical Wi-Fi fixes are >10 days old → excluded.
    expect(ids).not.toContain("rep-wifi-hist-1");
    // A still-open report is excluded.
    expect(ids).not.toContain("rep-handrail");
    // Every entry is Fixed.
    for (const r of list) expect(r.status).toBe("Fixed");
  });
});
