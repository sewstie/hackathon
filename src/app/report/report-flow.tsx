"use client";

// The public report flow: free text -> (Ari "Reading…") -> editable confirm
// card -> filed. This is a CLIENT component: classification goes through the
// server-side /api/classify route (so the AI key never ships to the browser),
// while filing goes through the shared Store seam and the reporting module.
//
// Ticket 03 scope: the free-text box (<=500 chars) + optional photo, the Ari
// "Reading your report…" state, and the title/location/tier/category confirm
// card. Follow-up questions (04), emergency takeover (05) and the names-a-person
// block (06) are separate tickets that extend this same screen.
import * as React from "react";

import { AriShell } from "@/components/ari";
import { useActiveUser } from "@/components/layout/active-user";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from "@/components/ui";
import { getStore, MIT_CAMPUS_ID } from "@/lib/store";
import type { Classification } from "@/modules/ai";
import {
  fileReport,
  teamForCategory,
  type ReportDraft,
} from "@/modules/reporting";
import { CATEGORIES, TIERS, type Category, type Tier } from "@/types";

const MAX_CHARS = 500;

type Phase = "compose" | "classifying" | "confirm" | "filing" | "done";

interface FiledSummary {
  confirmation: string;
  photoError: boolean;
}

export function ReportFlow() {
  const { activeUser, loading } = useActiveUser();

  const [phase, setPhase] = React.useState<Phase>("compose");
  const [text, setText] = React.useState("");
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [draft, setDraft] = React.useState<ReportDraft | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filed, setFiled] = React.useState<FiledSummary | null>(null);

  const remaining = MAX_CHARS - text.length;

  async function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    setPhase("classifying");
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: trimmed, mode: "public" }),
      });
      if (!res.ok) throw new Error("Classification failed.");
      const c = (await res.json()) as Classification;
      setDraft({
        text: trimmed,
        category: c.category,
        item: c.item,
        title: c.title,
        tier: c.tier,
        location: "",
        missingDetails: c.missingDetails,
        namesPerson: c.namesPerson,
        fromFallback: c.source === "fallback",
      });
      setPhase("confirm");
    } catch {
      setError("We couldn't read your report just now. Please try again.");
      setPhase("compose");
    }
  }

  async function handleFile() {
    if (!draft || !activeUser) return;
    setPhase("filing");
    setError(null);
    try {
      const result = await fileReport(draft, {
        store: getStore(),
        reporterId: activeUser.id,
        campusId: MIT_CAMPUS_ID,
        photo: photo ?? undefined,
      });
      setFiled({ confirmation: result.confirmation, photoError: result.photoError });
      setPhase("done");
    } catch {
      setError("We couldn't file your report just now. Please try again.");
      setPhase("confirm");
    }
  }

  function updateDraft(patch: Partial<ReportDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function reset() {
    setPhase("compose");
    setText("");
    setPhoto(null);
    setDraft(null);
    setFiled(null);
    setError(null);
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (phase === "done" && filed) {
    return (
      <div className="flex flex-col gap-4">
        <AriShell message={filed.confirmation} />
        {filed.photoError ? (
          <p role="status" className="text-sm text-muted-foreground">
            Your photo didn&apos;t attach, but your report was filed.
          </p>
        ) : null}
        <div>
          <Button variant="secondary" onClick={reset}>
            Report something else
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "confirm" || phase === "filing") {
    return (
      <ConfirmCard
        draft={draft!}
        filing={phase === "filing"}
        error={error}
        onChange={updateDraft}
        onBack={reset}
        onFile={handleFile}
      />
    );
  }

  // compose / classifying
  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-3" onSubmit={handleSubmitText}>
        <label htmlFor="report-text" className="text-sm font-medium">
          What&apos;s broken?
        </label>
        <textarea
          id="report-text"
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => setText(e.target.value)}
          disabled={phase === "classifying"}
          placeholder="Describe the problem in your own words — e.g. “The ice cream machine in Lobdell is broken again.”"
          className="min-h-28 w-full rounded-[--radius] border border-border bg-background p-3 text-sm placeholder:text-muted-foreground disabled:opacity-50"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Anonymous to students. Staff can see who filed.</span>
          <span aria-live="polite">{remaining} left</span>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="report-photo" className="text-sm font-medium">
            Add a photo (optional)
          </label>
          <input
            id="report-photo"
            type="file"
            accept="image/*"
            disabled={phase === "classifying"}
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div>
          <Button type="submit" disabled={!text.trim() || phase === "classifying"}>
            {phase === "classifying" ? "Reading…" : "Continue"}
          </Button>
        </div>
      </form>

      {phase === "classifying" ? (
        <AriShell message="Reading your report…" />
      ) : null}
    </div>
  );
}

interface ConfirmCardProps {
  draft: ReportDraft;
  filing: boolean;
  error: string | null;
  onChange: (patch: Partial<ReportDraft>) => void;
  onBack: () => void;
  onFile: () => void;
}

function ConfirmCard({ draft, filing, error, onChange, onBack, onFile }: ConfirmCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm your report</CardTitle>
        <p className="text-sm text-muted-foreground">
          Check the details — edit anything before you post.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="Title" htmlFor="confirm-title">
          <Input
            id="confirm-title"
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>

        <Field label="Location" htmlFor="confirm-location">
          <Input
            id="confirm-location"
            value={draft.location}
            placeholder="Building and floor / room"
            onChange={(e) => onChange({ location: e.target.value })}
          />
        </Field>

        <Field label="Category" htmlFor="confirm-category">
          <Select
            id="confirm-category"
            value={draft.category}
            onChange={(e) => onChange({ category: e.target.value as Category })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Severity" htmlFor="confirm-tier">
          <div className="flex items-center gap-3">
            <Select
              id="confirm-tier"
              value={draft.tier}
              onChange={(e) => onChange({ tier: e.target.value as Tier })}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Badge tier={draft.tier} />
          </div>
        </Field>

        <p className="text-sm text-muted-foreground">
          This will go to the <strong>{teamForCategory(draft.category)}</strong> team.
        </p>

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button onClick={onFile} disabled={filing}>
            {filing ? "Posting…" : "Post report"}
          </Button>
          <Button variant="ghost" onClick={onBack} disabled={filing}>
            Start over
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
