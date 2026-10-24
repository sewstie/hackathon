"use client";

import * as React from "react";
import Link from "next/link";
import { getStore, MIT_CAMPUS_ID } from "@/lib/store";
import { fixedThisWeek } from "@/packages/notifications";
import type { Report } from "@/types";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

/**
 * Campus home — the "Fixed this week" proof that the app works. Lists the
 * public reports that reached Fixed in the last 7 days, newest-first, so
 * students can see the loop close. (Private reports never appear here.)
 *
 * Owned folder: src/app/campus-home.
 */
export default function CampusHomePage() {
  const [fixed, setFixed] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fixedThisWeek(getStore(), MIT_CAMPUS_ID);
      if (cancelled) return;
      setFixed(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex max-w-prose flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Campus home</h1>
        <p className="text-sm text-muted-foreground">
          See what&apos;s been fixed around campus lately.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Fixed this week</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : fixed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing fixed in the last week yet — check back soon.
            </p>
          ) : (
            fixed.map((report) => (
              <Link
                key={report.id}
                href={{ pathname: "/report-detail", query: { id: report.id } }}
                className="block rounded-(--radius) border border-border bg-card p-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{report.title}</span>
                  <Badge tier={report.tier} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span>{report.location}</span>
                  <span aria-hidden>·</span>
                  <span>Fixed</span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
