import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { AriShell } from "@/components/ari";

/**
 * Placeholder campus home. Feature tracks replace/extend this: the landing
 * page, map, priority list and Fixed-this-week all land here or under their
 * own routes. This shows the shell works end to end.
 */
export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Report what&apos;s broken on campus
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Describe the problem in plain language. CampusFix classifies it, asks only
          the few details still missing, merges duplicates, and keeps you posted from
          Received to Fixed.
        </p>
        <div>
          <Link
            href="/report"
            className="inline-flex h-10 items-center justify-center rounded-[--radius] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Report an issue
          </Link>
        </div>
      </section>

      <AriShell message="Hi, I'm Ari. I'll show what's been fixed before and suggest quick fixes once you start a report." />

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "1 · Report", body: "Say what's wrong in your own words." },
          { title: "2 · Routed", body: "It's classified and sent to the right team." },
          { title: "3 · Fixed", body: "You're notified at every status change." },
        ].map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{step.body}</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
