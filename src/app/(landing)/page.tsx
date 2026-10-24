import Link from "next/link";
import { MA_IMPACT } from "@/packages/campuses";
import { Reveal } from "@/components/ui";
import { AriRobot } from "@/components/ari";
import { DEMO_ENTRY } from "@/components/layout";
import { SchoolSearch } from "./school-search";
import { WatchDemoButton } from "./demo-video";
import { SubmissionSections } from "./submission-sections";

export const metadata = {
  title: "UniFix · report what's broken on campus",
  description:
    "What UniFix is, why campus upkeep matters in Massachusetts, and two live demos: the student view and the staff view.",
};

const STEPS = [
  { n: "01", title: "Report", body: "Say what's wrong in your own words. Add a photo if you like." },
  { n: "02", title: "Routed", body: "AI sorts it, asks only what's missing, and sends it to the one team that fixes it — only they see it in their queue." },
  { n: "03", title: "Fixed", body: "Follow it from Received to Fixed. You're notified at every change." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{children}</span>
  );
}

/**
 * The explainer site: what UniFix is and why it matters. It is deliberately
 * NOT the demo. The STUDENT view is the main door (big, first, indigo); the
 * staff view is there for anyone curious, but quieter.
 */
export default function LandingPage() {
  return (
    <div className="cx-theme flex flex-col gap-20 pb-10 sm:gap-28">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="cx-hero cx-rise rounded-[2rem] px-6 py-12 sm:rounded-[2.5rem] sm:px-12 sm:py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col items-start gap-6">
            <span className="cx-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
              <span className="relative flex size-2">
                <span aria-hidden className="cx-ring absolute inset-0 rounded-full bg-primary" />
                <span className="relative size-2 rounded-full bg-primary" />
              </span>
              The student-friendly front door to campus repairs
            </span>

            <h1 className="text-4xl font-bold leading-[1.04] tracking-[-0.035em] sm:text-6xl">
              Report what&apos;s broken.{" "}
              <span className="cx-gradient-text">Watch it get fixed.</span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Say it in plain words. UniFix sorts it, merges duplicates, sends it to the
              right team, and keeps you posted until it&apos;s fixed.
            </p>

            <div className="flex flex-col items-start gap-3">
              {/* The demo video comes first; the student demo is right beside it. */}
              <div className="flex w-full flex-wrap items-center gap-3">
                <WatchDemoButton />
              <Link
                href={DEMO_ENTRY.student}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-primary bg-card pl-5 pr-1.5 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
              >
                Start the student demo
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Runs on a live MIT demo campus · no sign-up · 1 minute
              </p>
            </div>
          </div>

          {/* Product glimpse: one report, from words to Fixed. */}
          <div aria-hidden className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(circle,var(--cx-glow)_0%,transparent_70%)]" />
            <div className="cx-glass relative flex flex-col gap-4 rounded-[1.75rem] p-5 shadow-[0_30px_80px_-40px_var(--cx-glow)]">
              <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                “the printer on the 2nd floor of Hayden is jammed again”
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">IT</span>
                <span className="rounded-full bg-[var(--tier-medium-bg)] px-3 py-1 text-[var(--tier-medium-fg)]">Medium</span>
                <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">Hayden · 2F</span>
                <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">▲ 9 co-signed</span>
              </div>
              <ol className="flex items-center gap-2 text-[11px] font-semibold">
                {["Received", "Assigned", "In progress", "Fixed"].map((s, i) => (
                  <li key={s} className="flex flex-1 flex-col gap-1.5">
                    <span className={`h-1.5 rounded-full ${i < 3 ? "bg-primary" : "bg-border"}`} />
                    <span className={i < 3 ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                  </li>
                ))}
              </ol>
              <div className="flex items-center gap-3 rounded-2xl bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground">
                <AriRobot variant="head" size={30} className="shrink-0" />
                9 similar reports this semester · usually fixed in ~2 days
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Submission write-up + the walkthrough video, right under the hero ── */}
      <SubmissionSections />

      {/* ── The demo doors: student first, staff quieter ─────────────── */}
      <Reveal className="flex flex-col gap-6" aria-labelledby="demos-heading">
        <div className="flex flex-col gap-2">
          <Eyebrow>
            <span className="text-primary">06</span> — Live demo
          </Eyebrow>
          <h2 id="demos-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Start as a student
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Link
            href={DEMO_ENTRY.student}
            className="cx-lift group relative flex flex-col gap-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklab,var(--primary)_60%,var(--ari-glow)))] p-7 text-primary-foreground sm:p-9"
          >
            <span
              aria-hidden
              className="absolute -right-16 -top-16 size-64 rounded-full bg-primary-foreground/10 blur-2xl"
            />
            <span className="w-fit rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
              Recommended · Student view
            </span>
            <span className="flex flex-col gap-2">
              <span className="text-2xl font-bold tracking-tight sm:text-3xl">Report a problem in under a minute</span>
              <span className="max-w-md text-sm leading-relaxed opacity-85">
                Browse the campus map and feed, co-sign what you also hit, file a report in
                plain words, or send one privately to a single office.
              </span>
            </span>
            <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-primary-foreground px-6 py-3 text-sm font-bold text-primary">
              Open the student view
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>

          <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-border bg-card p-7 sm:p-9">
            <span className="flex flex-col gap-2">
              <span className="w-fit text-xs font-bold uppercase tracking-[0.16em] text-staff">Also: staff view</span>
              <span className="text-lg font-bold tracking-tight">See the other side</span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                Each staff member sees only their own area — Facilities sees Facilities, IT
                sees IT — ranked by severity × reach, plus a private inbox.
              </span>
            </span>
            <Link
              href={DEMO_ENTRY.staff}
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-staff underline-offset-4 hover:underline"
            >
              Open the staff view <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          You can switch between the two any time from the banner at the top.
        </p>
      </Reveal>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <Reveal className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Eyebrow>
            <span className="text-primary">07</span> — How it works
          </Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Three steps, no forms</h2>
        </div>
        <ol className="cx-stagger grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="cx-lift flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
              <span className="cx-gradient-text text-4xl font-bold tabular-nums">{s.n}</span>
              <span className="flex flex-col gap-1">
                <span className="text-lg font-bold tracking-tight">{s.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>

        {/* Ari, as the little helper it is. */}
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card/70 p-5">
          <AriRobot size={64} label="Ari, the UniFix assistant" className="shrink-0" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Ari</span> rides along: it shows how
            often an issue happened before, suggests safe quick fixes, and in an emergency
            puts a one-tap <span className="font-semibold text-danger">Call 911</span> button
            first — before any AI runs.
          </p>
        </div>
      </Reveal>

      {/* ── Massachusetts economic impact (AICUM 2025) ───────────────── */}
      <Reveal className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Eyebrow>
            <span className="text-primary">08</span> — Why it matters
          </Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why campuses matter in Massachusetts</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            The Commonwealth&apos;s {MA_IMPACT.memberInstitutions} independent, nonprofit
            colleges and universities are an economic engine. Keeping their campuses
            working well keeps that engine running.
          </p>
        </div>
        <dl className="cx-stagger grid gap-4 sm:grid-cols-3">
          {[
            { label: "Annual economic impact", value: MA_IMPACT.economicImpact },
            { label: "Tax revenue to the Commonwealth", value: MA_IMPACT.taxRevenue },
            { label: "Jobs supported", value: MA_IMPACT.jobsSupported },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-2 rounded-3xl border border-border bg-card p-6">
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="cx-gradient-text text-4xl font-bold tabular-nums tracking-tight">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-3 sm:grid-cols-3">
          {MA_IMPACT.regions.map((region) => (
            <div key={region.name} className="flex flex-col gap-1 rounded-2xl border border-border bg-card/70 px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {region.name}
              </span>
              <span className="text-xl font-bold tabular-nums">{region.impact}</span>
              <span className="text-xs text-muted-foreground">{region.note}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Source:{" "}
          <a
            href={MA_IMPACT.sourceUrl}
            className="underline underline-offset-2 hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            {MA_IMPACT.source}
          </a>{" "}
          ({MA_IMPACT.year}).
        </p>
      </Reveal>

      {/* ── Campus-agnostic: any school ──────────────────────────────── */}
      <Reveal className="flex flex-col gap-6 rounded-[2rem] border border-border bg-card p-7 sm:p-10">
        <div className="flex flex-col gap-2">
          <Eyebrow>
            <span className="text-primary">09</span> — Any campus
          </Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight">Works for any campus</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            MIT is the richly seeded demo, but UniFix opens for any Massachusetts school.
          </p>
        </div>
        <SchoolSearch />
      </Reveal>

      {/* ── Closing CTA with the gradient wave ───────────────────────── */}
      <Reveal
        as="div"
        className="relative overflow-hidden rounded-[2rem] bg-foreground px-6 pb-32 pt-12 text-background sm:rounded-[2.5rem] sm:px-12"
      >
        <div className="relative z-10 flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-md text-3xl font-bold leading-tight tracking-tight">
            See it the way a student does.
          </p>
          <Link
            href={DEMO_ENTRY.student}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-background px-6 text-sm font-bold text-foreground transition-transform hover:-translate-y-0.5"
          >
            Start the student demo <span aria-hidden>→</span>
          </Link>
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
    </div>
  );
}
