"use client";

import * as React from "react";
import Link from "next/link";
import { getStore, MIT_CAMPUS_ID } from "@/lib/store";
import type { Report } from "@/types";
import { useActiveUser } from "@/components/layout";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

interface RowData {
  report: Report;
  signers: number;
}

function ReportRow({ row }: { row: RowData }) {
  const { report, signers } = row;
  return (
    <Link
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
        <span>{report.status}</span>
        <span aria-hidden>·</span>
        {/* Counts only — never who filed or co-signed. */}
        <span>
          {signers} {signers === 1 ? "signer" : "signers"}
        </span>
      </div>
    </Link>
  );
}

/** My reports: the ones I filed and the ones I co-signed, counts only (never
 * who). Owned folder: src/app/my-reports. */
export default function MyReportsPage() {
  const { activeUser, loading: userLoading } = useActiveUser();
  const [filed, setFiled] = React.useState<RowData[]>([]);
  const [coSigned, setCoSigned] = React.useState<RowData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const store = getStore();
    (async () => {
      if (!activeUser) {
        // Defer so no setState runs synchronously in the effect body.
        if (!userLoading && !cancelled) setLoading(false);
        return;
      }
      const reports = await store.listReports(MIT_CAMPUS_ID);
      const withSigners = await Promise.all(
        reports.map(async (report) => ({
          report,
          signers: await store.countSigners(report.id),
          coSigns: await store.listCoSigns(report.id),
        })),
      );
      if (cancelled) return;

      const mine: RowData[] = [];
      const backed: RowData[] = [];
      for (const { report, signers, coSigns } of withSigners) {
        if (report.reporterId === activeUser.id) {
          mine.push({ report, signers });
        } else if (coSigns.some((c) => c.userId === activeUser.id)) {
          backed.push({ report, signers });
        }
      }
      setFiled(mine);
      setCoSigned(backed);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeUser, userLoading]);

  if (loading || userLoading) {
    return <p className="text-muted-foreground">Loading your reports…</p>;
  }

  return (
    <div className="flex max-w-prose flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My reports</h1>
        <p className="text-sm text-muted-foreground">
          Anonymous to students. You see counts, never who filed or co-signed.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Reports I filed</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {filed.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t filed any reports yet.</p>
          ) : (
            filed.map((row) => <ReportRow key={row.report.id} row={row} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reports I co-signed</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {coSigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t co-signed any reports yet.</p>
          ) : (
            coSigned.map((row) => <ReportRow key={row.report.id} row={row} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
