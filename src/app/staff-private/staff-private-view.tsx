"use client";

import * as React from "react";
import {
  listOfficeInbox,
  openPrivateReport,
  reassignOffice,
  setPrivateStatus,
} from "@/packages/private/access";
import {
  loadThread,
  postOfficeReply,
} from "@/packages/private/thread";
import { OFFICE_OPTIONS } from "@/packages/private";
import { getStore } from "@/lib/store";
import { useActiveUser } from "@/components/layout";
import { PRIVATE_STATUSES } from "@/types";
import type {
  AccessLogEntry,
  Office,
  PrivateMessage,
  PrivateReport,
  PrivateStatus,
} from "@/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
} from "@/components/ui";

/**
 * The responder's private workspace. Only responders who hold an office see an
 * inbox, and it contains only their office's reports. Opening a report logs a
 * "view"; replying, changing status (Referred requires a note), and reassigning
 * all go through the private module's office-scoped seam, which logs the action
 * and (for status/replies) notifies the student. Reassigning to another office
 * removes it from this inbox by construction.
 */
export function StaffPrivateView() {
  const { activeUser, loading } = useActiveUser();
  const [inbox, setInbox] = React.useState<PrivateReport[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const loadInbox = React.useCallback(async (): Promise<PrivateReport[]> => {
    if (!activeUser) return [];
    return listOfficeInbox(getStore(), activeUser);
  }, [activeUser]);

  const refreshInbox = React.useCallback(async () => {
    const next = await loadInbox();
    setInbox(next);
  }, [loadInbox]);

  React.useEffect(() => {
    if (!activeUser) return;
    let cancelled = false;
    loadInbox().then((next) => {
      if (!cancelled) setInbox(next);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUser, loadInbox]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const hasOffice =
    activeUser?.role === "responder" && Boolean(activeUser.privateOffice);

  if (!hasOffice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Private inbox</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Only staff who hold an office can view private reports. Switch to an
          office holder to see this inbox.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-primary">Private inbox</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {activeUser?.privateOffice}
        </h1>
        <p className="text-sm text-muted-foreground">
          Only your office can see these reports. Everything you do here is logged.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {inbox.length === 0 ? (
              <p className="text-sm text-muted-foreground">No private reports.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {inbox.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={
                        "w-full rounded-(--radius) px-3 py-2 text-left text-sm " +
                        (selectedId === r.id ? "bg-muted font-medium" : "hover:bg-muted")
                      }
                    >
                      <span className="block truncate">{r.title}</span>
                      <span className="text-xs text-muted-foreground">{r.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {selectedId ? (
          <PrivateReportDetail
            key={selectedId}
            reportId={selectedId}
            onChanged={refreshInbox}
            onClosed={() => setSelectedId(null)}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Select a report to view it. Opening a report is logged.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PrivateReportDetail({
  reportId,
  onChanged,
  onClosed,
}: {
  reportId: string;
  onChanged: () => void | Promise<void>;
  onClosed: () => void;
}) {
  const { activeUser } = useActiveUser();
  const [report, setReport] = React.useState<PrivateReport | null>(null);
  const [messages, setMessages] = React.useState<PrivateMessage[]>([]);
  const [log, setLog] = React.useState<AccessLogEntry[]>([]);
  const [denied, setDenied] = React.useState(false);
  const [reply, setReply] = React.useState("");
  const [note, setNote] = React.useState("");
  const [toOffice, setToOffice] = React.useState<Office | "">("");
  const [busy, setBusy] = React.useState(false);

  type DetailSnapshot = {
    denied: boolean;
    report: PrivateReport | null;
    messages: PrivateMessage[];
    log: AccessLogEntry[];
  };

  const loadSnapshot = React.useCallback(async (): Promise<DetailSnapshot> => {
    const user = activeUser;
    if (!user) return { denied: false, report: null, messages: [], log: [] };
    const store = getStore();
    // Opening the report logs a "view" via the module.
    const access = await openPrivateReport(store, reportId, user);
    if (!access.allowed) {
      return { denied: true, report: null, messages: [], log: [] };
    }
    const thread = await loadThread(store, reportId, user);
    const accessLog = await store.listAccessLog(reportId);
    return {
      denied: false,
      report: access.data,
      messages: thread.allowed ? thread.data : [],
      log: accessLog,
    };
  }, [activeUser, reportId]);

  const applySnapshot = React.useCallback((snap: DetailSnapshot) => {
    setDenied(snap.denied);
    setReport(snap.report);
    setMessages(snap.messages);
    setLog(snap.log);
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

  async function onReply() {
    if (!activeUser || reply.trim().length === 0) return;
    setBusy(true);
    try {
      await postOfficeReply(getStore(), reportId, reply.trim(), activeUser);
      setReply("");
      applySnapshot(await loadSnapshot());
    } finally {
      setBusy(false);
    }
  }

  async function onStatus(status: PrivateStatus) {
    if (!activeUser) return;
    if (status === "Referred" && note.trim().length === 0) {
      // Module rejects a Referred without a note; surface it in the UI first.
      window.alert("A referred report needs a note explaining the referral.");
      return;
    }
    setBusy(true);
    try {
      await setPrivateStatus(
        getStore(),
        reportId,
        status,
        activeUser,
        status === "Referred" ? note.trim() : undefined,
      );
      applySnapshot(await loadSnapshot());
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function onReassign() {
    if (!activeUser || toOffice === "") return;
    setBusy(true);
    try {
      await reassignOffice(getStore(), reportId, toOffice, activeUser);
      // The report has left this office; close the detail and refresh the inbox.
      onClosed();
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (denied || !report) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {denied
            ? "You don't have access to this report."
            : "Loading…"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{report.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge>{report.status}</Badge>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Office:</span>
            <Badge>{report.currentOffice}</Badge>
          </div>
          <p className="whitespace-pre-wrap">{report.body}</p>
          <p className="text-xs text-muted-foreground">
            {report.dontShareName
              ? "Reporter asked to stay anonymous — identity hidden."
              : "Reporter identity visible to this office."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {PRIVATE_STATUSES.map((s) => (
              <Button
                key={s}
                variant={report.status === s ? "primary" : "secondary"}
                disabled={busy}
                onClick={() => onStatus(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="referral-note" className="text-xs text-muted-foreground">
              Note (required to mark Referred)
            </label>
            <input
              id="referral-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this being referred?"
              className="h-10 w-full rounded-(--radius) border border-border bg-background px-3 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reassign to another office</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <label htmlFor="reassign-office" className="text-xs text-muted-foreground">
            Reassigning removes this report from your inbox.
          </label>
          <div className="flex gap-2">
            <Select
              id="reassign-office"
              value={toOffice}
              onChange={(e) => setToOffice(e.target.value as Office)}
            >
              <option value="">Choose an office…</option>
              {OFFICE_OPTIONS.filter((o) => o !== report.currentOffice).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
            <Button variant="secondary" disabled={busy || toOffice === ""} onClick={onReassign}>
              Reassign
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thread</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={
                    m.authorRole === "office"
                      ? "self-end rounded-(--radius) bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "self-start rounded-(--radius) bg-muted px-3 py-2 text-sm"
                  }
                >
                  <span className="mb-1 block text-xs opacity-70">
                    {m.authorRole === "office" ? "You (office)" : "Student"}
                  </span>
                  {m.body}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor="office-reply" className="text-sm font-medium">
              Reply to the student
            </label>
            <textarea
              id="office-reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              className="w-full rounded-(--radius) border border-border bg-background p-3 text-sm"
            />
            <div>
              <Button onClick={onReply} disabled={busy || reply.trim().length === 0}>
                Send reply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access log</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {log.map((e) => (
              <li key={e.id}>
                {e.action} · {e.actorOffice ?? e.actorId} ·{" "}
                {new Date(e.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
