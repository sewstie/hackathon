// Internal implementation of the rolling-hour rate limit, hidden in a subfolder.
// Reachable from the package's own root files (index.ts) but NOT from outside.
//
// The rule (from the spec): at most 5 reports per user per rolling hour. Only
// *filed* reports count — co-signs never do (the store models a co-sign as a
// separate row, so counting `reports` by `reporterId` already excludes them).
// Emergencies are exempt (safety beats throttling). The threshold is a tunable
// constant so a demo operator can loosen it.

import type { Store } from "@/lib/store";

/** The tunable per-user hourly cap. */
export const RATE_LIMIT_PER_HOUR = 5;

/** One rolling hour, in milliseconds. */
const WINDOW_MS = 60 * 60 * 1000;

/** The exact copy shown on the first report over the limit. */
export const RATE_LIMIT_MESSAGE =
  "You've filed a lot in the last hour. Try again a bit later.";

/** What a caller supplies to check whether a new report is allowed. */
export interface RateLimitInput {
  userId: string;
  /** ISO-8601 "current" time; defaults to now. Injectable for deterministic tests. */
  now?: string;
  /** Emergencies bypass the limit entirely. */
  isEmergency?: boolean;
  /** Restrict the count to a single campus when provided. */
  campusId?: string;
}

/** The verdict: allowed plus the live recent count, or blocked with the copy. */
export interface RateLimitResult {
  allowed: boolean;
  /** Reports this user filed within the rolling hour. */
  recentCount: number;
  /** Friendly copy when blocked; undefined when allowed. */
  message?: string;
}

/**
 * Count the user's filed reports within the rolling hour ending at `now` and
 * decide whether one more is allowed. Co-signs are not reports, so they never
 * count. Emergencies short-circuit to allowed. Reads the store; never writes.
 */
export async function checkRateLimitImpl(
  store: Store,
  input: RateLimitInput,
): Promise<RateLimitResult> {
  if (input.isEmergency) {
    return { allowed: true, recentCount: 0 };
  }

  const nowMs = input.now ? Date.parse(input.now) : Date.now();
  const cutoff = nowMs - WINDOW_MS;

  // Gather this user's reports. Without a campus filter we scan every campus
  // the user has reported on; with one, we stay scoped.
  const campusIds = input.campusId
    ? [input.campusId]
    : await allCampusIds(store);

  let recentCount = 0;
  for (const campusId of campusIds) {
    const reports = await store.listReports(campusId);
    for (const r of reports) {
      if (r.reporterId !== input.userId) continue;
      const created = Date.parse(r.createdAt);
      if (created > cutoff && created <= nowMs) recentCount += 1;
    }
  }

  const allowed = recentCount < RATE_LIMIT_PER_HOUR;
  return allowed
    ? { allowed, recentCount }
    : { allowed, recentCount, message: RATE_LIMIT_MESSAGE };
}

async function allCampusIds(store: Store): Promise<string[]> {
  const campuses = await store.listCampuses();
  return campuses.map((c) => c.id);
}
