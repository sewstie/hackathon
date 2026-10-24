"use client";

// The conversation under a report, shared by the student report page and the
// staff report view.
//
//   • Comments (public): anyone can read; students and staff can post.
//   • Messages with staff (direct): only the reporter and staff see this tab;
//     staff use it to ask a clarifying question, the reporter answers back.
//
// Posting goes through the comments package, which screens the text, saves it
// and notifies the right people (the bell in the header picks it up).
import * as React from "react";

import { getStore } from "@/lib/store";
import { listComments, postComment } from "@/packages/comments";
import type { CommentVisibility, Report, ReportComment, User } from "@/types";
import { Button } from "@/components/ui";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function ReportThread({ report, viewer }: { report: Report; viewer: User | null }) {
  const isStaff = viewer?.role === "responder";
  const isReporter = !!viewer && viewer.id === report.reporterId;
  const canDirect = isStaff || isReporter;

  const [tab, setTab] = React.useState<CommentVisibility>("public");
  const [comments, setComments] = React.useState<ReportComment[]>([]);
  const [names, setNames] = React.useState<Map<string, User>>(new Map());
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const inputId = React.useId();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const store = getStore();
      const [list, users] = await Promise.all([listComments(store, report.id, viewer), store.listUsers()]);
      if (cancelled) return;
      setComments(list);
      setNames(new Map(users.map((u) => [u.id, u])));
    })();
    return () => {
      cancelled = true;
    };
  }, [report.id, viewer, reloadKey]);

  const shown = comments.filter((c) => c.visibility === (canDirect ? tab : "public"));
  const directCount = comments.filter((c) => c.visibility === "direct").length;

  /** Students stay anonymous to other students; staff show their team. */
  function authorLabel(c: ReportComment): string {
    const u = names.get(c.authorId);
    if (c.authorRole === "staff") return u?.publicTeam ? `${u.publicTeam} staff` : "Staff";
    if (c.authorId === report.reporterId) return viewer?.id === c.authorId ? "You (reporter)" : "Reporter";
    if (viewer?.id === c.authorId) return "You";
    return isStaff && u ? u.name : "A student";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!viewer || busy) return;
    setBusy(true);
    setError(null);
    const visibility: CommentVisibility = canDirect ? tab : "public";
    const res = await postComment(getStore(), { report, author: viewer, body: text, visibility });
    setBusy(false);
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    setText("");
    setReloadKey((k) => k + 1);
  }

  const placeholder =
    tab === "direct"
      ? isStaff
        ? "Ask the reporter a question, e.g. “Which floor is it on?”"
        : "Reply to staff…"
      : isStaff
        ? "Post a public update, e.g. “A technician is on the way.”"
        : "Add a comment — does it still happen? Any detail that helps?";

  return (
    <section aria-labelledby={`${inputId}-h`} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${inputId}-h`} className="text-lg font-bold tracking-tight">
          Conversation
        </h2>
        {canDirect ? (
          <div role="tablist" aria-label="Conversation type" className="inline-flex rounded-full border border-border bg-muted/70 p-1 text-sm">
            {(
              [
                ["public", "Comments · public"],
                ["direct", isStaff ? "Message the reporter" : `Messages with staff${directCount ? ` (${directCount})` : ""}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => {
                  setTab(value);
                  setError(null);
                }}
                className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                  tab === value ? "bg-card text-foreground shadow-[var(--shadow-sm)]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {tab === "direct" && canDirect
          ? "Private between the reporter and staff. Other students can't see this."
          : "Public: everyone on campus can read these. Students show as “A student”."}
      </p>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {tab === "direct" && canDirect ? "No messages yet." : "No comments yet."}
        </p>
      ) : (
        <ul className="cx-stagger flex flex-col gap-2">
          {shown.map((c) => {
            const mine = viewer?.id === c.authorId;
            const staff = c.authorRole === "staff";
            return (
              <li key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : staff
                        ? "border border-staff/25 bg-staff-muted text-foreground"
                        : "border border-border bg-card text-foreground"
                  }`}
                >
                  <p className={`text-xs font-semibold ${mine ? "opacity-80" : staff ? "text-staff" : "text-muted-foreground"}`}>
                    {authorLabel(c)} · {timeAgo(c.createdAt)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {viewer ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor={inputId} className="sr-only">
            {tab === "direct" ? "Message" : "Comment"}
          </label>
          <textarea
            id={inputId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={placeholder}
            className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {error ? (
            <p role="alert" className="rounded-2xl bg-[var(--tier-urgent-bg)] px-4 py-2.5 text-sm text-[var(--tier-urgent-fg)]">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !text.trim()} className={isStaff ? "bg-staff text-staff-foreground" : undefined}>
              {busy ? "Sending…" : tab === "direct" ? "Send message" : "Post comment"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
