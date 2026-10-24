"use client";

// The public report flow: free text -> (Ari "Reading…") -> editable confirm
// card -> filed. This is a CLIENT component: classification goes through the
// server-side /api/classify route (so the AI key never ships to the browser),
// while filing goes through the shared Store seam and the reporting module.
//
// Ticket 03 scope: the free-text box (<=500 chars) + optional photo, the Ari
// "Reading your report…" state, and the title/location/tier/category confirm
// card. Ticket 04 adds follow-up questions. Ticket 05 adds the emergency
// takeover + safety note (below); the names-a-person block (06) extends this
// same screen next.
//
// Safety ordering (ticket 05): the instant the student submits, a PURE
// detectEmergency runs client-side BEFORE any network/AI call; a match shows
// the full-screen Call-911 takeover immediately. The AI classifier may
// independently RAISE an emergency (Urgent + life-safety), but can never close
// one — only the explicit "Not an emergency" action dismisses it, which files
// the report to Safety as Urgent. A softer detectSafetyHazard drives a non-
// takeover red note on the confirm card (no quick fixes).
import * as React from "react";

import { AriShell } from "@/components/ari";
import { useActiveUser } from "@/components/layout/active-user";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from "@/components/ui";
import { getStore, MIT_CAMPUS_ID } from "@/lib/store";
import type { Classification } from "@/modules/ai";
import {
  detectEmergency,
  detectSafetyHazard,
  logEmergencyCall,
  type EmergencyCallKind,
} from "@/modules/emergency";
import {
  buildFollowUpPlan,
  fileReport,
  teamForCategory,
  type ReportDraft,
} from "@/modules/reporting";
import type { Building, Campus } from "@/types";
import { CATEGORIES, TIERS, type Category, type Tier } from "@/types";

import { EmergencyTakeover } from "./emergency-takeover";
import { FollowUpStep, type FollowUpAnswers } from "./follow-up-step";
import { SafetyNote } from "./safety-note";

const MAX_CHARS = 500;

type Phase =
  | "compose"
  | "classifying"
  | "emergency"
  | "followups"
  | "confirm"
  | "filing"
  | "done";

interface FiledSummary {
  confirmation: string;
  photoError: boolean;
}

interface FollowUpState {
  buildings: Building[];
  plan: Awaited<ReturnType<typeof buildFollowUpPlan>>;
}

export function ReportFlow() {
  const { activeUser, loading } = useActiveUser();

  const [phase, setPhase] = React.useState<Phase>("compose");
  const [text, setText] = React.useState("");
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [draft, setDraft] = React.useState<ReportDraft | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filed, setFiled] = React.useState<FiledSummary | null>(null);
  const [followUp, setFollowUp] = React.useState<FollowUpState | null>(null);
  const [campus, setCampus] = React.useState<Campus | null>(null);
  /** The reason behind the active-emergency takeover; null when none. */
  const [emergencyReason, setEmergencyReason] = React.useState<string | null>(null);
  /** The softer, non-takeover hazard note reason; null when none. */
  const [hazardReason, setHazardReason] = React.useState<string | null>(null);
  const [fileFlags, setFileFlags] = React.useState<{
    buildingId?: string;
    incomplete: boolean;
    locationUnverified: boolean;
  }>({ incomplete: false, locationUnverified: false });

  // Load the active campus once so the takeover / note can show the campus-
  // police name + number (no AI, no blocking — purely presentational contacts).
  React.useEffect(() => {
    let alive = true;
    getStore()
      .getCampus(MIT_CAMPUS_ID)
      .then((c) => {
        if (alive) setCampus(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const remaining = MAX_CHARS - text.length;

  async function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);

    // SAFETY FIRST — pure, instant, client-side, BEFORE any network/AI call.
    // A life-threatening match takes over the whole screen immediately.
    const emergency = detectEmergency(trimmed);
    if (emergency.isEmergency) {
      setEmergencyReason(emergency.reason);
      setPhase("emergency");
      return;
    }

    // A non-active hazard drives a softer note shown later on the confirm card.
    const hazard = detectSafetyHazard(trimmed);
    setHazardReason(hazard.isHazard ? hazard.reason : null);

    setPhase("classifying");
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: trimmed, mode: "public" }),
      });
      if (!res.ok) throw new Error("Classification failed.");
      const c = (await res.json()) as Classification;
      const nextDraft: ReportDraft = {
        text: trimmed,
        category: c.category,
        item: c.item,
        title: c.title,
        tier: c.tier,
        location: "",
        missingDetails: c.missingDetails,
        namesPerson: c.namesPerson,
        fromFallback: c.source === "fallback",
      };
      setDraft(nextDraft);

      // The AI may independently RAISE an emergency (life-safety Urgent) that
      // the keyword check missed — but it can NEVER close one. Show the takeover.
      if (c.category === "Safety" && c.tier === "Urgent") {
        setEmergencyReason("This may be a life-safety emergency.");
        setPhase("emergency");
        return;
      }

      // Ticket 04: ask only the details still missing (location first, max 3).
      const store = getStore();
      const [plan, buildings] = await Promise.all([
        buildFollowUpPlan(nextDraft, { store, campusId: MIT_CAMPUS_ID }),
        store.listBuildings(MIT_CAMPUS_ID),
      ]);
      setFileFlags({ incomplete: plan.incomplete, locationUnverified: false });

      if (plan.questions.length > 0) {
        setFollowUp({ plan, buildings });
        setPhase("followups");
      } else {
        setPhase("confirm");
      }
    } catch {
      setError("We couldn't read your report just now. Please try again.");
      setPhase("compose");
    }
  }

  /** Record a Call 911 / Campus Police tap (never auto-dialed; audit only). */
  function handleEmergencyCall(kind: EmergencyCallKind) {
    if (!activeUser) return;
    // Fire-and-forget: logging must never delay the student reaching help.
    void logEmergencyCall({ store: getStore(), actorId: activeUser.id, kind });
  }

  /**
   * The ONLY emergency dismissal: "Not an emergency — continue my report".
   * Per the spec this files the report to Safety as Urgent, so we seed a draft
   * with that routing and drop the student onto the confirm card.
   */
  function handleNotAnEmergency() {
    setEmergencyReason(null);
    setDraft((d) => {
      const base: ReportDraft = d ?? {
        text: text.trim(),
        category: "Safety",
        item: "safety concern",
        title: text.trim().slice(0, 60) || "Safety concern",
        tier: "Urgent",
        location: "",
        missingDetails: [],
        namesPerson: false,
        fromFallback: true,
      };
      return { ...base, category: "Safety", tier: "Urgent" };
    });
    setPhase("confirm");
  }

  function handleFollowUpsDone(answers: FollowUpAnswers) {
    setDraft((d) => (d ? { ...d, location: answers.location } : d));
    setFileFlags((f) => ({
      ...f,
      buildingId: answers.buildingId,
      locationUnverified: answers.locationUnverified,
    }));
    setPhase("confirm");
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
        buildingId: fileFlags.buildingId,
        incomplete: fileFlags.incomplete,
        locationUnverified: fileFlags.locationUnverified,
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
    setFollowUp(null);
    setEmergencyReason(null);
    setHazardReason(null);
    setFileFlags({ incomplete: false, locationUnverified: false });
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  // Safety beats everything: when raised, the takeover covers the whole screen.
  if (phase === "emergency" && emergencyReason) {
    return (
      <EmergencyTakeover
        reason={emergencyReason}
        campusPoliceName={campus?.campusPoliceName ?? "Campus Police"}
        campusPolicePhone={campus?.campusPolicePhone ?? "911"}
        onContinue={handleNotAnEmergency}
        onCall={handleEmergencyCall}
      />
    );
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

  if (phase === "followups" && followUp) {
    return (
      <FollowUpStep
        plan={followUp.plan}
        buildings={followUp.buildings}
        campusId={MIT_CAMPUS_ID}
        onDone={handleFollowUpsDone}
      />
    );
  }

  if (phase === "confirm" || phase === "filing") {
    return (
      <div className="flex flex-col gap-4">
        {hazardReason ? (
          <SafetyNote
            reason={hazardReason}
            campusPoliceName={campus?.campusPoliceName ?? "Campus Police"}
            campusPolicePhone={campus?.campusPolicePhone ?? "911"}
          />
        ) : null}
        <ConfirmCard
          draft={draft!}
          filing={phase === "filing"}
          error={error}
          onChange={updateDraft}
          onBack={reset}
          onFile={handleFile}
        />
      </div>
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
