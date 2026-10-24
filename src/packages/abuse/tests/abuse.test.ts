// Interface-level tests for the abuse package.
//
// Exercised strictly through the package's entry point (../index) against the
// deterministic in-memory Store — no cloud, no mocking of internals. Covers the
// rolling-hour rate limit (5 allowed, 6th blocked; co-signs don't count;
// emergencies exempt) and spam/off-topic rejection (classifier `rejected` flag
// with a keyword fallback; the student's text is always preserved and nothing
// is persisted). Covers F9, case 11.

import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";
import type { Store } from "@/lib/store";
import type { NewReport } from "@/lib/store";
import {
  RATE_LIMIT_PER_HOUR,
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  screenReport,
} from "../index";

const USER = "user-ana";

function draft(overrides: Partial<NewReport> = {}): NewReport {
  return {
    campusId: MIT_CAMPUS_ID,
    buildingId: "bldg-w20",
    reporterId: USER,
    category: "Facilities",
    item: "heater",
    title: "Heater is broken",
    tier: "Medium",
    location: "Building W20",
    incomplete: false,
    locationUnverified: false,
    ...overrides,
  };
}

/** File N reports for USER spaced one minute apart ending at `endIso`. */
async function fileReports(store: Store, count: number, endIso: string): Promise<void> {
  const end = Date.parse(endIso);
  for (let i = count - 1; i >= 0; i--) {
    const created = await store.createReport(draft());
    // Rewrite createdAt to a controlled recent timestamp (i minutes before end).
    created.createdAt = new Date(end - i * 60_000).toISOString();
  }
}

describe("rate limit constants", () => {
  it("exposes a tunable threshold of 5 per hour and the exact 6th-report copy", () => {
    expect(RATE_LIMIT_PER_HOUR).toBe(5);
    expect(RATE_LIMIT_MESSAGE).toBe(
      "You've filed a lot in the last hour. Try again a bit later.",
    );
  });
});

describe("checkRateLimit", () => {
  let store: Store;
  const now = "2026-11-01T12:00:00.000Z";

  beforeEach(() => {
    store = new InMemoryStore();
  });

  it("allows a report while fewer than 5 have been filed this hour", async () => {
    // 4 already filed → the 5th is still allowed.
    await fileReports(store, 4, "2026-11-01T11:59:00.000Z");
    const result = await checkRateLimit(store, { userId: USER, now });
    expect(result.allowed).toBe(true);
    expect(result.recentCount).toBe(4);
  });

  it("blocks the 6th report within the hour with the exact copy", async () => {
    // 5 already filed → the next (the 6th) is blocked.
    await fileReports(store, 5, "2026-11-01T11:59:00.000Z");
    const result = await checkRateLimit(store, { userId: USER, now });
    expect(result.allowed).toBe(false);
    expect(result.recentCount).toBe(5);
    expect(result.message).toBe(RATE_LIMIT_MESSAGE);
  });

  it("does not count reports older than an hour", async () => {
    // 5 reports more than an hour before `now` should not block a new one.
    await fileReports(store, 5, "2026-11-01T10:30:00.000Z");
    const result = await checkRateLimit(store, { userId: USER, now });
    expect(result.allowed).toBe(true);
    expect(result.recentCount).toBe(0);
  });

  it("does not count co-signs toward the limit", async () => {
    // Ana co-signs the seeded ice-cream report many times over (idempotent),
    // and it must never count as a filed report.
    await store.addCoSign("rep-icecream", USER);
    const result = await checkRateLimit(store, { userId: USER, now });
    expect(result.allowed).toBe(true);
    expect(result.recentCount).toBe(0);
  });

  it("exempts emergencies from the limit", async () => {
    await fileReports(store, 6, "2026-11-01T11:59:00.000Z");
    const result = await checkRateLimit(store, {
      userId: USER,
      now,
      isEmergency: true,
    });
    expect(result.allowed).toBe(true);
  });
});

describe("screenReport (spam / off-topic rejection)", () => {
  it("rejects when the classifier marks the report rejected, keeping the text", () => {
    const text = "buy cheap followers now at spam-site dot com";
    const result = screenReport({
      text,
      classification: { rejected: true, reason: "This looks like spam." },
    });
    expect(result.rejected).toBe(true);
    expect(result.reason).toBe("This looks like spam.");
    expect(result.text).toBe(text); // text preserved
    expect(result.persist).toBe(false); // nothing persisted
  });

  it("falls back to a keyword screen when the AI is unavailable", () => {
    const text = "FREE CRYPTO!!! click this link to win a prize now";
    const result = screenReport({ text });
    expect(result.rejected).toBe(true);
    expect(result.text).toBe(text);
    expect(result.persist).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("accepts a genuine report (classifier not rejected, no spam keywords)", () => {
    const text = "The heater in my dorm room has been broken for three days.";
    const result = screenReport({
      text,
      classification: { rejected: false },
    });
    expect(result.rejected).toBe(false);
    expect(result.persist).toBe(true);
    expect(result.text).toBe(text);
  });

  it("accepts a genuine report with the keyword fallback (AI off)", () => {
    const text = "The elevator in Maseeh is stuck between floors.";
    const result = screenReport({ text });
    expect(result.rejected).toBe(false);
    expect(result.persist).toBe(true);
  });

  it("trusts the classifier's not-rejected verdict even if a keyword looks spammy", () => {
    // When the AI has spoken (rejected:false), its judgment wins over the
    // blunt keyword fallback, which is only used when no verdict is supplied.
    const text = "win the prize for best lab — the projector is broken";
    const result = screenReport({
      text,
      classification: { rejected: false },
    });
    expect(result.rejected).toBe(false);
    expect(result.persist).toBe(true);
  });
});
