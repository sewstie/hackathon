"use client";

import * as React from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { orderForFeed, type PrioritizableReport } from "@/packages/priority";
import type { Report } from "@/types";
import { useActiveUser } from "@/components/layout";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog } from "@/components/ui";

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
    return <p className="text-sm text-muted-foreground">Loading reports…</p>;
  }

  if (ordered.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No reports here yet — be the first to{" "}
          <Link href="/report" className="text-primary underline underline-offset-2">
            report an issue
          </Link>
          .
        </CardContent>
      </Card>
    );
  }

  const confirmTarget = items.find((i) => i.report.id === confirmId)?.report;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {ordered.map((item) => {
          const { report, signers, signedByMe } = item;
          const busy = pending.has(report.id);
          return (
            <li key={report.id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <CardTitle className="text-base font-medium">{report.title}</CardTitle>
                  <Badge tier={report.tier} />
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>{report.location}</span>
                    <span aria-hidden>·</span>
                    <span>{report.status}</span>
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
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                    >
                      <span aria-hidden>▲</span>
                      <span>
                        {signers} {signers === 1 ? "signer" : "signers"}
                      </span>
                    </Button>
                    <div className="flex items-center gap-2">
                      <Link
                        href={{ pathname: "/report-detail", query: { id: report.id } }}
                        className="text-sm text-primary underline underline-offset-2"
                      >
                        View
                      </Link>
                      {canDelete(report) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmId(report.id)}
                          aria-label={`Delete report: ${report.title}`}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
