"use client";

import * as React from "react";
import { loadThread, postStudentMessage } from "@/packages/private/thread";
import { getStore } from "@/lib/store";
import { useActiveUser } from "@/components/layout";
import type { PrivateMessage, PrivateReport } from "@/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

/**
 * The student's private thread. It loads the report and its messages through
 * the office-scoped seam: the reporting student always reaches their own
 * thread. Office replies and status changes arrive here; the student can post
 * follow-ups. If the active user is not the reporter, nothing is shown.
 */
export function PrivateThreadView({ reportId }: { reportId: string }) {
  const { activeUser, loading } = useActiveUser();
  const [report, setReport] = React.useState<PrivateReport | null>(null);
  const [messages, setMessages] = React.useState<PrivateMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [denied, setDenied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // Pure loader: fetches the thread (and the status header when the reporter
  // also holds the report) and returns a snapshot. State is applied by the
  // caller via a promise callback, so no setState runs synchronously here.
  type Snapshot = {
    denied: boolean;
    messages: PrivateMessage[];
    report: PrivateReport | null;
  };
  const loadSnapshot = React.useCallback(async (): Promise<Snapshot> => {
    const user = activeUser;
    if (!user) return { denied: false, messages: [], report: null };
    const store = getStore();
    const thread = await loadThread(store, reportId, user);
    if (!thread.allowed) {
      return { denied: true, messages: [], report: null };
    }
    const all = await store.listPrivateReportsForActor(user);
    const owned = all.find((r) => r.id === reportId) ?? null;
    return { denied: false, messages: thread.data, report: owned };
  }, [activeUser, reportId]);

  const applySnapshot = React.useCallback((snap: Snapshot) => {
    setDenied(snap.denied);
    setMessages(snap.messages);
    setReport(snap.report);
  }, []);

  React.useEffect(() => {
    if (!activeUser) return;
    let cancelled = false;
    loadSnapshot().then((snap) => {
      if (!cancelled) applySnapshot(snap);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUser, loadSnapshot, applySnapshot]);

  async function onSend() {
    if (!activeUser || draft.trim().length === 0) return;
    setBusy(true);
    try {
      const res = await postStudentMessage(getStore(), reportId, draft.trim(), activeUser);
      if (res.allowed) {
        setDraft("");
        applySnapshot(await loadSnapshot());
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (denied) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Private report</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This private conversation isn&apos;t available for the current user.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-primary">Direct (private) report</p>
        <h1 className="text-2xl font-semibold tracking-tight">Your private thread</h1>
        {report && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge>{report.status}</Badge>
          </div>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet. Send one below.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={
                    m.authorRole === "student"
                      ? "self-end rounded-[--radius] bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "self-start rounded-[--radius] bg-muted px-3 py-2 text-sm"
                  }
                >
                  <span className="mb-1 block text-xs opacity-70">
                    {m.authorRole === "student" ? "You" : "Office"}
                  </span>
                  {m.body}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <label htmlFor="thread-reply" className="text-sm font-medium">
          Reply
        </label>
        <textarea
          id="thread-reply"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Write a message to the office…"
          className="w-full rounded-[--radius] border border-border bg-background p-3 text-sm"
        />
        <div>
          <Button onClick={onSend} disabled={busy || draft.trim().length === 0}>
            {busy ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
