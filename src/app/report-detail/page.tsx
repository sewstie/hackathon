"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getStore } from "@/lib/store";
import { coSign } from "@/packages/duplicates";
import { tierPresentation } from "@/packages/priority";
import type { Report, Status } from "@/types";
import { useActiveUser } from "@/components/layout";
import { ReportThread } from "@/components/comments";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

/** The public lifecycle, in order, for the status timeline. "Won't fix" is a
 * terminal branch shown only when reached. */
const TIMELINE: Status[] = ["Received", "Assigned", "In progress", "Fixed"];

function StatusTimeline({ status }: { status: Status }) {
  const reachedIndex = TIMELINE.indexOf(status);
  const wontFix = status === "Won't fix";
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Status timeline">
      {TIMELINE.map((step, i) => {
        const done = !wontFix && reachedIndex >= i;
        const current = !wontFix && reachedIndex === i;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-current={current ? "step" : undefined}
              className={
                done
                  ? "rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
                  : "rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              }
            >
              {step}
            </span>
            {i < TIMELINE.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
          </li>
        );
      })}
      {wontFix && (
        <li>
          <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Won&apos;t fix
          </span>
        </li>
      )}
    </ol>
  );
}

function ReportDetailInner() {
  const params = useSearchParams();
  const reportId = params.get("id");
  const chat = params.get("chat") === "direct" ? "direct" : "public";
  const { activeUser } = useActiveUser();

  const [report, setReport] = React.useState<Report | null>(null);
  const [signers, setSigners] = React.useState(0);
  const [alreadySigned, setAlreadySigned] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    // Always go through an async task so no setState runs synchronously in the
    // effect body (which would trigger cascading renders).
    (async () => {
      if (!reportId) {
        if (!cancelled) setLoading(false);
        return;
      }
      const store = getStore();
      const [r, count, coSigns] = await Promise.all([
        store.getReport(reportId),
        store.countSigners(reportId),
        store.listCoSigns(reportId),
      ]);
      if (cancelled) return;
      setReport(r);
      setSigners(count);
      setAlreadySigned(
        !!activeUser && coSigns.some((c) => c.userId === activeUser.id),
      );
      setLoading(false);
      // Opened from a notification: jump to the conversation once it renders.
      if (window.location.hash === "#conversation") {
        requestAnimationFrame(() =>
          document.getElementById("conversation")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId, activeUser]);

  async function handleCoSign() {
    if (!report || !activeUser) return;
    setBusy(true);
    const result = await coSign(getStore(), report.id, activeUser.id);
    setSigners(result.signers);
    setAlreadySigned(true);
    setBusy(false);
  }

  if (loading) return <p className="text-muted-foreground">Loading report…</p>;
  if (!reportId || !report) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground">That report could not be found.</p>
        <Link href="/my-reports" className="text-sm underline">
          Back to my reports
        </Link>
      </div>
    );
  }

  const tier = tierPresentation(report.tier);

  return (
    <div className="flex max-w-prose flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{report.title}</CardTitle>
            <Badge tier={report.tier} aria-label={`Tier ${tier.label}`} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Location</dt>
            <dd>{report.location}</dd>
            <dt className="text-muted-foreground">Category</dt>
            <dd>{report.category}</dd>
            <dt className="text-muted-foreground">Signers</dt>
            <dd>
              {signers} {signers === 1 ? "person" : "people"}
            </dd>
          </dl>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusTimeline status={report.status} />
          </div>

          {alreadySigned ? (
            <p className="rounded-(--radius) bg-muted p-3 text-sm">
              You&apos;re on it. We&apos;ll notify you when it&apos;s fixed.
            </p>
          ) : (
            <div>
              <Button onClick={handleCoSign} disabled={busy || !activeUser}>
                {busy ? "Co-signing…" : "Co-sign — this happened to me too"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <ReportThread key={`${report.id}-${chat}`} report={report} viewer={activeUser} initialTab={chat} />
        </CardContent>
      </Card>

      <Link href="/my-reports" className="text-sm underline">
        Back to my reports
      </Link>
    </div>
  );
}

/** Report detail + co-sign. Reads the report id from the `?id=` query param so
 * it works without a dynamic route segment (owned folder: src/app/report-detail). */
export default function ReportDetailPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading report…</p>}>
      <ReportDetailInner />
    </Suspense>
  );
}
