import Link from "next/link";
import { MA_IMPACT } from "@/packages/campuses";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { SchoolSearch } from "./school-search";

/**
 * UniFix landing page — the front door. It states the pitch, shows the
 * Massachusetts economic-impact numbers (AICUM 2025) with source citations,
 * explains how it works in three steps, and lets a visitor search any
 * Massachusetts campus and open it.
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col gap-10">
      {/* Pitch */}
      <section className="flex flex-col gap-4">
        <p className="text-sm font-medium text-primary">
          UniFix · the student-friendly front door to campus repairs
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Report what&apos;s broken on campus in plain language — and watch it
          get fixed.
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Describe the problem in your own words. UniFix classifies it, asks
          only the few details still missing, merges duplicates into one
          co-signed ticket, and keeps every reporter posted from Received to
          Fixed.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/campus/mit"
            className="inline-flex h-10 items-center justify-center rounded-[--radius] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Open the MIT demo
          </Link>
          <Link
            href="/report"
            className="inline-flex h-10 items-center justify-center rounded-[--radius] border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Report an issue
          </Link>
        </div>
      </section>

      {/* School search */}
      <section className="flex flex-col gap-4">
        <SchoolSearch />
      </section>

      {/* Massachusetts economic impact (AICUM 2025) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Why campuses matter in Massachusetts
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            The Commonwealth&apos;s {MA_IMPACT.memberInstitutions} independent,
            nonprofit colleges and universities are an economic engine. Keeping
            their campuses working well keeps that engine running.
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
                <CardTitle className="text-3xl font-bold tabular-nums">
                  {stat.value}
                </CardTitle>
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
                <span className="text-xl font-semibold tabular-nums">
                  {region.impact}
                </span>
                <span className="text-xs text-muted-foreground">
                  {region.note}
                </span>
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

      {/* How it works */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1 · Report",
              body: "Say what's wrong in your own words. Add a photo if you like.",
            },
            {
              step: "2 · Routed",
              body: "AI classifies it, asks only the few missing details, and sends it to the right team.",
            },
            {
              step: "3 · Fixed",
              body: "Follow a visible status from Received to Fixed — you're notified at every change.",
            },
          ].map((step) => (
            <li key={step.step}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{step.step}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {step.body}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
