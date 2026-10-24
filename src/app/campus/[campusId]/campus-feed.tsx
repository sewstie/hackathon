"use client";

import * as React from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { orderForFeed, type PrioritizableReport } from "@/packages/priority";
import type { Report } from "@/types";
import { useActiveUser } from "@/components/layout";
import { Badge, Button, Dialog } from "@/components/ui";

/** Statuses that keep a report visible in the feed. */
const OPEN_STATUSES: ReadonlySet<Report["status"]> = new Set([
  "Received",
  "Assigned",
  "In progress",
]);

/** A report plus the live co-sign facts the row needs. */
interface FeedItem {
  report: Report;
  signers: number;
  /** Whether the active user has co-signed (upvoted) this report. */
  signedByMe: boolean;
}

/** Project a FeedItem onto the pure priority ordering shape. */
function toPrioritizable(item: FeedItem): PrioritizableReport & { __id: string } {
  return {
    id: item.report.id,
    tier: item.report.tier,
    signers: item.signers,
    incomplete: item.report.incomplete,
    createdAt: item.report.createdAt,
    __id: item.report.id,
  };
}

/** The scrollable student feed for one campus. Interactive: upvote + delete. */
export function CampusFeed({ campusId }: { campusId: string }) {
  const { activeUser, loading: userLoading } = useActiveUser();
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const store = getStore();
    const reports = await store.listReports(campusId);
    const open = reports.filter((r) => OPEN_STATUSES.has(r.status));
    const built = await Promise.all(
      open.map(async (report) => {
        const coSigns = await store.listCoSigns(report.id);
        return {
          report,
          signers: coSigns.length,
          signedByMe: activeUser ? coSigns.some((c) => c.userId === activeUser.id) : false,
        } satisfies FeedItem;
      }),
    );
    return built;
  }, [campusId, activeUser]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (userLoading) return;
      const built = await load();
      if (cancelled) return;
      setItems(built);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, userLoading]);

  const ordered = React.useMemo(() => {
    const byId = new Map(items.map((i) => [i.report.id, i]));
    return orderForFeed(items.map(toPrioritizable)).map((p) => byId.get(p.id)!);
  }, [items]);

  async function toggleUpvote(item: FeedItem) {
    if (!activeUser) return;
    const id = item.report.id;
    if (pending.has(id)) return;
    setPending((prev) => new Set(prev).add(id));
    const store = getStore();
    try {
      if (item.signedByMe) {
        await store.removeCoSign(id, activeUser.id);
      } else {
        await store.addCoSign(id, activeUser.id);
      }
      // Re-read the true count so the UI reflects the store exactly.
      const signers = await store.countSigners(id);
      setItems((prev) =>
        prev.map((i) =>
          i.report.id === id
            ? { ...i, signers, signedByMe: !item.signedByMe }
            : i,
        ),
      );
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function confirmDelete() {
    const id = confirmId;
    if (!id) return;
    setConfirmId(null);
    const store = getStore();
    await store.deleteReport(id);
    setItems((prev) => prev.filter((i) => i.report.id !== id));
  }

  function canDelete(report: Report): boolean {
    if (!activeUser) return false;
    // The report's owner, or any staff (responder), may delete.
    return activeUser.role === "responder" || report.reporterId === activeUser.id;
  }

  if (loading || userLoading) {
    return (
      <ul aria-busy="true" aria-label="Loading reports" className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-28 animate-pulse rounded-3xl border border-border bg-card" />
        ))}
      </ul>
    );
  }

  if (ordered.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
        No reports here yet — be the first to{" "}
        <Link href="/report" className="font-semibold text-primary underline underline-offset-2">
          report an issue
        </Link>
        .
      </div>
    );
  }

  const confirmTarget = items.find((i) => i.report.id === confirmId)?.report;

  return (
    <>
      <ul className="cx-stagger flex flex-col gap-3">
        {ordered.map((item, index) => {
          const { report, signers, signedByMe } = item;
          const busy = pending.has(report.id);
          return (
            <li key={report.id}>
              <article className="cx-lift group flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                {/* Rank in the priority order. */}
                <span
                  aria-hidden
                  className="hidden w-8 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground sm:block"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tier={report.tier} />
                    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {report.status}
                    </span>
                    {report.incomplete && (
                      <span className="text-xs font-medium text-muted-foreground">· incomplete</span>
                    )}
                    {report.locationUnverified && (
                      <span className="text-xs font-medium text-muted-foreground">· location unverified</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold leading-snug tracking-tight">{report.title}</h3>
                  <p className="text-sm text-muted-foreground">{report.location}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <Button
                    variant={signedByMe ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => toggleUpvote(item)}
                    disabled={!activeUser || busy}
                    aria-pressed={signedByMe}
                    aria-label={
                      signedByMe
                        ? `Remove your upvote — ${signers} ${signers === 1 ? "signer" : "signers"}`
                        : `Upvote — ${signers} ${signers === 1 ? "signer" : "signers"}`
                    }
                    className="h-9 rounded-full px-4 tabular-nums"
                  >
                    <span aria-hidden>▲</span>
                    <span>
                      {signers} {signers === 1 ? "signer" : "signers"}
                    </span>
                  </Button>
                  <div className="flex items-center gap-1">
                    <Link
                      href={{ pathname: "/report-detail", query: { id: report.id } }}
                      className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-muted"
                    >
                      View <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                    </Link>
                    {canDelete(report) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmId(report.id)}
                        aria-label={`Delete report: ${report.title}`}
                        className="h-9 rounded-full"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Delete this report?"
        description={
          confirmTarget
            ? `"${confirmTarget.title}" will be permanently removed. This can't be undone.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmId(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
