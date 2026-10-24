// Campus home — the student's scrollable feed for one campus.
//
// A thin Server Component shell: it resolves the campus, reads public data for
// the compact map, and hands the interactive feed off to <CampusFeed/> (a
// client component in this folder) which owns upvote (co-sign) toggling, the
// live signer count, confirm-gated delete, and the empty state. Private reports
// are never read here, so they never reach the map or the feed.
//
// MIT-demo fix: the crash that broke "Open the MIT demo" was the map transform
// evaluating the unstable `Date.now()` during prerender (Next 16 Cache
// Components rejects it). The root-cause fix lives in `buildMapData`, which now
// anchors its 120-day heat window to a deterministic, data-derived time when no
// `now` is passed — safe during prerender and at request time alike.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { getCampusView } from "@/packages/campuses";
import { buildMapData } from "@/packages/campuses/map";
import type { MapData } from "@/packages/campuses/map";
import { CampusMap } from "@/components/map";
import { Onboarding } from "@/components/onboarding";
import { CampusFeed } from "./campus-feed";

// Opt this route out of Cache Components' instant / static-shell validation.
// It legitimately blocks on request-time data (the campusId param + the store)
// and inherits a shared layout nav that reads `usePathname`, so it is not an
// "instant" segment. This is the documented opt-out (route-segment-config
// `instant`), NOT a no-op — removing it reintroduces a prerender error.
export const instant = false;

export default async function CampusHomePage({
  params,
}: {
  params: Promise<{ campusId: string }>;
}) {
  const { campusId } = await params;
  const store = getStore();

  const view = await getCampusView(campusId, store);
  if (!view) notFound();

  const { campus, seeded } = view;

  // Public reports only (private reports are read through a separate,
  // office-scoped path and never appear here).
  const reports = await store.listReports(campus.id);
  const buildings = await store.listBuildings(campus.id);
  // No `now` passed: the heat window anchors to the newest report's timestamp
  // (deterministic, prerender-safe) instead of the unstable Date.now().
  const mapData: MapData = buildMapData({ campus, buildings, reports });

  return (
    <div className="flex flex-col gap-8">
      {/* Demo onboarding: welcome pop-up + sequenced try-reporting nudge. Shown
          only on the seeded demo campus a judge lands on, once per session. */}
      {seeded ? <Onboarding /> : null}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-primary">Campus home</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {campus.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {campus.city}, {campus.state}
            {!seeded && " · open and ready to use"}
          </p>
        </div>
        {/* Persistent top-right action to start a report. */}
        <Link
          href="/report"
          className="inline-flex h-10 items-center justify-center rounded-[--radius] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Report an issue
        </Link>
      </header>

      {/* Compact map: severity clusters + legend + softened heat over OSM tiles. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Where problems cluster</h2>
        <CampusMap data={mapData} ariaLabel={`Report map for ${campus.name}`} />
        <p className="text-xs text-muted-foreground">
          Clusters are colored by their most severe report; the heat layer shows
          recent report density. Tiles &copy; OpenStreetMap contributors.
        </p>
      </section>

      {/* The scrollable, interactive student feed. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Campus reports</h2>
        <CampusFeed campusId={campus.id} />
      </section>
    </div>
  );
}
