// Campus home — the student's scrollable feed for one campus.
//
// A thin Server Component shell: it resolves the campus, reads public data for
// the compact map, and hands the interactive feed off to <CampusFeed/> (a
// client component in this folder) which owns upvote (co-sign) toggling, the
// live signer count, confirm-gated delete, and the empty state. Private reports
// are never read here, so they never reach the map or the feed.
//
// Presentation follows Roveia Health's language (clinical white, one glow, a
// faint grid, pill actions, big soft cards, scroll-led reveals and
// a gradient-wave footer) with Ari's motion kit. Ari is parked bottom-right on
// this page (<AriHelper/>): it reacts live to urgent text with the Call 911 /
// campus-police takeover and keeps help contacts one tap away.
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
import { AriHelper } from "@/components/ari";
import { CampusFeed } from "./campus-feed";
import { Badge, Reveal } from "@/components/ui";

// Opt this route out of Cache Components' instant / static-shell validation.
// It legitimately blocks on request-time data (the campusId param + the store)
// and inherits a shared layout nav that reads `usePathname`, so it is not an
// "instant" segment. This is the documented opt-out (route-segment-config
// `instant`), NOT a no-op — removing it reintroduces a prerender error.
export const instant = false;

const OPEN = new Set(["Received", "Assigned", "In progress"]);

function SectionLabel({ index, title, kicker }: { index: string; title: string; kicker?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="text-primary">{index}</span> — {kicker}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-[2rem] sm:leading-tight">{title}</h2>
      </div>
    </div>
  );
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
  // No `now` passed: the heat window anchors to the newest report's timestamp
  // (deterministic, prerender-safe) instead of the unstable Date.now().
  const mapData: MapData = buildMapData({ campus, buildings, reports });

  const open = reports.filter((r) => OPEN.has(r.status));
  const urgentOpen = open.filter((r) => r.tier === "Urgent" || r.tier === "High").length;
  const fixed = reports
    .filter((r) => r.status === "Fixed")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recentlyFixed = fixed.slice(0, 4);

  const stats = [
    { label: "Open reports", value: open.length },
    { label: "High or urgent", value: urgentOpen },
    { label: "Fixed", value: fixed.length },
    { label: "Buildings mapped", value: buildings.length },
  ];

  return (
    <div className={`cx-theme flex flex-col gap-16 pb-28 sm:gap-24`}>
      {/* Demo onboarding (welcome pop-up + try-reporting nudge) is mounted
          once in the root layout so it covers every student-view page. */}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="cx-hero cx-rise rounded-[2rem] px-6 py-10 sm:rounded-[2.5rem] sm:px-12 sm:py-16">
        <div className="max-w-3xl">
          <div className="flex flex-col items-start gap-6">
            <span className="cx-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
              <span className="relative flex size-2">
                <span aria-hidden className="cx-ring absolute inset-0 rounded-full bg-primary" />
                <span className="relative size-2 rounded-full bg-primary" />
              </span>
              Campus home · {campus.city}, {campus.state}
              {!seeded && " · open and ready to use"}
            </span>

            <div className="flex flex-col gap-3">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
                {campus.name}
              </h1>
              <p className="cx-gradient-text text-2xl font-semibold tracking-[-0.02em] sm:text-4xl">
                What&apos;s broken, fixed together.
              </p>
            </div>

            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              Say what&apos;s wrong in plain words. Ari sorts it, merges duplicates, and
              sends it to the right team — and you hear back when it&apos;s fixed.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {/* Persistent top-right action to start a report. */}
              <Link
                href="/report"
                data-tour="report-cta"
                data-spot="report-cta"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary pl-6 pr-2 text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-16px_var(--cx-glow)] transition-transform hover:-translate-y-0.5"
              >
                Report an issue
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
              <a
                href="#map"
                className="cx-glass inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary/30"
              >
                See the map
              </a>
            </div>
          </div>
        </div>

        {/* Live numbers. */}
        <dl data-spot="stats" className="cx-stagger mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="cx-glass rounded-3xl px-5 py-4">
              <dt className="text-xs font-medium text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ── Map ───────────────────────────────────────────────────────── */}
      {/* Compact map: severity clusters + legend + softened heat over OSM tiles. */}
      <Reveal id="map" data-spot="map" className="flex scroll-mt-24 flex-col gap-6">
        <SectionLabel index="01" kicker="Map" title="Where problems cluster" />
        <div className="rounded-[2rem] border border-border bg-card p-2 shadow-[0_30px_80px_-50px_var(--cx-glow)] sm:p-3 [&>div]:rounded-[1.5rem]">
          <CampusMap data={mapData} ariaLabel={`Report map for ${campus.name}`} />
        </div>
        <p className="text-xs text-muted-foreground">
          Clusters are colored by their most severe report; the heat layer shows
          recent report density. Tiles &copy; OpenStreetMap contributors.
        </p>
      </Reveal>

      {/* ── Feed ──────────────────────────────────────────────────────── */}
      {/* The scrollable, interactive student feed. */}
      <Reveal data-spot="feed" className="flex flex-col gap-6">
        <SectionLabel index="02" kicker="Ranked by severity × reach" title="Campus reports" />
        <CampusFeed campusId={campus.id} />
      </Reveal>

      {/* ── Recently fixed (closed loop, prototype R7.4) ──────────────── */}
      {recentlyFixed.length > 0 && (
        <Reveal className="flex flex-col gap-6">
          <SectionLabel index="03" kicker="Closed loop" title="Recently fixed" />
          <ul className="cx-stagger grid gap-3 sm:grid-cols-2">
            {recentlyFixed.map((r) => (
              <li key={r.id}>
                <Link
                  href={{ pathname: "/report-detail", query: { id: r.id } }}
                  className="cx-lift flex h-full items-start gap-4 rounded-3xl border border-border bg-card p-5"
                >
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--staff-muted)] text-lg font-bold text-staff"
                  >
                    ✓
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold leading-snug">{r.title}</span>
                    <span className="text-sm text-muted-foreground">{r.location}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge tier={r.tier} /> Fixed
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {/* ── Gradient-wave footer ──────────────────────────────────────── */}
      <Reveal as="div" className="relative overflow-hidden rounded-[2rem] bg-foreground px-6 pb-28 pt-12 text-background sm:rounded-[2.5rem] sm:px-12">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">Safety first</p>
            <p className="max-w-lg text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
              Something unsafe? Don&apos;t wait on a report.
            </p>
            <p className="text-sm opacity-70">
              Ari is bottom-right on every visit. In an emergency, call 911 or{" "}
              {campus.campusPoliceName}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="tel:911"
              className="inline-flex h-11 items-center rounded-full bg-danger px-5 text-sm font-semibold text-danger-foreground"
            >
              Call 911
            </a>
            <a
              href={`tel:${campus.campusPolicePhone}`}
              className="inline-flex h-11 items-center rounded-full border border-background/30 px-5 text-sm font-semibold"
            >
              {campus.campusPoliceName} · {campus.campusPolicePhone}
            </a>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 text-primary">
          <svg className="cx-wave-slow absolute bottom-0 h-full w-[200%] opacity-40" viewBox="0 0 1600 120" preserveAspectRatio="none">
            <path fill="currentColor" d="M0 60 C200 10 400 110 800 60 C1000 10 1200 110 1600 60 V120 H0Z" />
          </svg>
          <svg className="cx-wave absolute bottom-0 h-3/4 w-[200%] opacity-70" viewBox="0 0 1600 120" preserveAspectRatio="none">
            <path fill="currentColor" d="M0 70 C200 120 600 20 800 70 C1000 120 1400 20 1600 70 V120 H0Z" />
          </svg>
        </div>
      </Reveal>

      <AriHelper
        campusPoliceName={campus.campusPoliceName}
        campusPolicePhone={campus.campusPolicePhone}
        counselingName={campus.counselingName}
        counselingUrl={campus.counselingUrl}
      />
    </div>
  );
}
