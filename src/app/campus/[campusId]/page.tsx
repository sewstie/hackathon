// Campus home — the student's hub for one campus.
//
// Shows a Report button, the campus report map (tier-colored pins + a 120-day
// density heat layer), and the open reports ordered by priority. Private reports
// are never read here, so they never reach the map or the list.
//
// The page is a Server Component: it resolves the campus and reads public data
// through the store, shapes the map data with the pure campuses/map transform,
// and hands it to the client-only <CampusMap/> (Leaflet, dynamic, ssr:false).

import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { getCampusView } from "@/packages/campuses";
import { buildMapData } from "@/packages/campuses/map";
import type { MapData } from "@/packages/campuses/map";
import type { Report, Tier } from "@/types";
import { CampusMap } from "@/components/map";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

// This page reads request-time data (the campusId param + the store), so it is
// a blocking dynamic route rather than a prerendered one (cacheComponents/PPR).
export const instant = false;

/** Statuses that keep a report "open" (still visible in the priority list). */
const OPEN_STATUSES: ReadonlySet<Report["status"]> = new Set([
  "Received",
  "Assigned",
  "In progress",
]);

const SEVERITY_WEIGHT: Record<Tier, number> = {
  Low: 0,
  Medium: 100,
  High: 200,
  Urgent: 0, // Urgent is handled as an absolute top bucket, not by weight.
};

/** The penalty applied to an unconfirmed/incomplete High so demand can correct it. */
const INCOMPLETE_HIGH_PENALTY = 30;

/**
 * Priority score for a non-Urgent report: severity weight plus capped reach,
 * with an incomplete High penalized so a popular Medium can overtake it. This
 * mirrors the product's documented rule; the shared priority module (Track B)
 * owns the canonical implementation, but the campus home orders its own list
 * here so it stays within this track's files.
 */
function priorityScore(report: Report, signers: number): number {
  let score = SEVERITY_WEIGHT[report.tier] + Math.min(signers, 90);
  if (report.tier === "High" && report.incomplete) score -= INCOMPLETE_HIGH_PENALTY;
  return score;
}

interface RankedReport {
  report: Report;
  signers: number;
}

function sortByPriority(items: RankedReport[]): RankedReport[] {
  return [...items].sort((a, b) => {
    const aUrgent = a.report.tier === "Urgent";
    const bUrgent = b.report.tier === "Urgent";
    if (aUrgent !== bUrgent) return aUrgent ? -1 : 1; // Urgent always leads
    const diff = priorityScore(b.report, b.signers) - priorityScore(a.report, a.signers);
    if (diff !== 0) return diff;
    // Ties broken oldest-first.
    return Date.parse(a.report.createdAt) - Date.parse(b.report.createdAt);
  });
}

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

  const mapData: MapData = buildMapData({ campus, buildings, reports });

  // Open reports, ranked by priority.
  const open = reports.filter((r) => OPEN_STATUSES.has(r.status));
  const ranked: RankedReport[] = await Promise.all(
    open.map(async (report) => ({
      report,
      signers: await store.countSigners(report.id),
    })),
  );
  const ordered = sortByPriority(ranked);

  return (
    <div className="flex flex-col gap-8">
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
        <Link
          href="/report"
          className="inline-flex h-10 items-center justify-center rounded-[--radius] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Report an issue
        </Link>
      </header>

      {/* Map: tier-colored pins + 120-day density heat layer over OSM tiles. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Where problems cluster</h2>
        <CampusMap data={mapData} ariaLabel={`Report map for ${campus.name}`} />
        <p className="text-xs text-muted-foreground">
          Pins are colored by severity; the heat layer shows the last 120 days of
          reports. Tiles &copy; OpenStreetMap contributors.
        </p>
      </section>

      {/* Open reports by priority. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Open reports by priority</h2>
        {ordered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No open reports on this campus yet. Be the first to{" "}
              <Link href="/report" className="text-primary underline underline-offset-2">
                report an issue
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {ordered.map(({ report, signers }) => (
              <li key={report.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <CardTitle className="text-base font-medium">
                      {report.title}
                    </CardTitle>
                    <Badge tier={report.tier} />
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>{report.location}</span>
                    <span aria-hidden>·</span>
                    <span>{report.status}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {signers} {signers === 1 ? "signer" : "signers"}
                    </span>
                    {report.incomplete && (
                      <>
                        <span aria-hidden>·</span>
                        <span>incomplete</span>
                      </>
                    )}
                    {report.locationUnverified && (
                      <>
                        <span aria-hidden>·</span>
                        <span>location unverified</span>
                      </>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
