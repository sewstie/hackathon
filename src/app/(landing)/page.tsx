import Link from "next/link";
import { MA_IMPACT } from "@/packages/campuses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { AriRobot } from "@/components/ari";
import { DEMO_ENTRY } from "@/components/layout";
import { SchoolSearch } from "./school-search";

export const metadata = {
  title: "UniFix · report what's broken on campus",
  description:
    "What UniFix is, why campus upkeep matters in Massachusetts, and two live demos: the student view and the staff view.",
};

/**
 * The explainer site: what UniFix is and why it matters. It is deliberately
 * NOT the demo. Two clearly separate doors lead into the demo, one per view:
 * the student view (indigo) and the staff view (teal).
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col gap-12">
      {/* Pitch */}
      <section className="flex flex-col gap-4">
        <p className="text-sm font-medium text-primary">
          UniFix · the student-friendly front door to campus repairs
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Report what&apos;s broken on campus in plain language, and watch it get fixed.
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Describe the problem in your own words. UniFix classifies it, asks only the
          few details still missing, merges duplicates into one co-signed ticket, ranks
          it by severity × reach, routes it to the right team, and keeps every reporter
          posted from Received to Fixed.
        </p>
      </section>

      {/* The two demo doors */}
      <section className="flex flex-col gap-4" aria-labelledby="demos-heading">
        <div className="flex flex-col gap-1">
          <h2 id="demos-heading" className="text-2xl font-semibold tracking-tight">
            Try the live demo
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            The demo runs on a seeded MIT campus. It has two sides, on separate pages:
            the student who reports a problem and the staff who fix it. You can switch
            between them any time from the banner at the top.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col border-t-4 border-t-primary">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Student view
              </p>
              <CardTitle>Report a problem</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 text-sm text-muted-foreground">
              <p>
                Browse the campus feed and map, co-sign issues you also hit, file a
                report in plain language (Ari helps), or send a private report to a
                single office.
              </p>
              <Link
                href={DEMO_ENTRY.student}
                className="mt-auto inline-flex h-10 items-center justify-center rounded-[--radius] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                Open the student view
              </Link>
            </CardContent>
          </Card>
          <Card className="flex flex-col border-t-4 border-t-staff">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-wide text-staff">
                Staff view
              </p>
              <CardTitle>Fix what matters first</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 text-sm text-muted-foreground">
              <p>
                See a team&apos;s queue ranked by severity × reach, update statuses that
                notify every co-signer, and handle sensitive reports in an
                office-only private inbox.
              </p>
              <Link
                href={DEMO_ENTRY.staff}
                className="mt-auto inline-flex h-10 items-center justify-center rounded-[--radius] bg-staff px-4 text-sm font-medium text-staff-foreground transition-colors hover:opacity-90"
              >
                Open the staff view
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Meet Ari */}
      <section className="flex flex-col items-center gap-6 rounded-[--radius] border border-border bg-card p-6 sm:flex-row">
        <AriRobot size={110} label="Ari, the UniFix assistant" className="shrink-0" />
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Meet Ari</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Ari is the little assistant inside UniFix. When you report something, Ari
            tells you how often it has happened before and how long it usually takes to
            fix, and suggests safe quick fixes so you might not need to file at all. In
            an emergency Ari steps aside: the screen switches to a one-tap Call 911
            button before any AI runs.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            { step: "1 · Report", body: "Say what's wrong in your own words. Add a photo if you like." },
            { step: "2 · Routed", body: "AI classifies it, asks only the few missing details, and sends it to the right team." },
            { step: "3 · Fixed", body: "Follow a visible status from Received to Fixed. You're notified at every change." },
          ].map((s) => (
            <li key={s.step}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{s.step}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{s.body}</CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Massachusetts economic impact (AICUM 2025) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Why campuses matter in Massachusetts</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            The Commonwealth&apos;s {MA_IMPACT.memberInstitutions} independent, nonprofit
            colleges and universities are an economic engine. Keeping their campuses
            working well keeps that engine running.
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Annual economic impact", value: MA_IMPACT.economicImpact },
            { label: "Tax revenue to the Commonwealth", value: MA_IMPACT.taxRevenue },
            { label: "Jobs supported", value: MA_IMPACT.jobsSupported },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <CardTitle className="text-3xl font-bold tabular-nums">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              </CardContent>
            </Card>
          ))}
        </dl>
        <div className="grid gap-4 sm:grid-cols-3">
          {MA_IMPACT.regions.map((region) => (
            <Card key={region.name}>
              <CardHeader>
                <CardTitle className="text-base">{region.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <span className="text-xl font-semibold tabular-nums">{region.impact}</span>
                <span className="text-xs text-muted-foreground">{region.note}</span>
              </CardContent>
            </Card>
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
      </section>

      {/* Campus-agnostic: any school */}
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Works for any campus</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          MIT is the richly seeded demo, but UniFix opens for any Massachusetts school.
        </p>
        <SchoolSearch />
      </section>
    </div>
  );
}
