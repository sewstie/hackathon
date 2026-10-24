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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AriPopup, AriShell } from "@/components/ari";
import { ariHistoryLine, ariIntro, ariQuickFixes, ariSuppressed, thatFixedIt } from "@/packages/ari";
import { stopReportTour } from "@/components/onboarding";
import { isSpam, screenReport } from "@/packages/abuse";
import { useActiveUser } from "@/components/layout/active-user";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, Input, Select } from "@/components/ui";
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
  checkNamesPerson,
  fileReport,
  teamForCategory,
  type ReportDraft,
} from "@/modules/reporting";
import type { Building, Campus, QuickFix, Report } from "@/types";
import { CATEGORIES, TIERS, type Category, type Tier } from "@/types";

import { EmergencyTakeover } from "./emergency-takeover";
import { FollowUpStep, type FollowUpAnswers } from "./follow-up-step";
import { NamesPersonBlock } from "./names-person-block";
import { PhotoStep } from "./photo-step";
import { SafetyNote } from "./safety-note";
import { ReportSteps, stepForPhase } from "./report-steps";

const MAX_CHARS = 500;

type Phase =
  | "compose"
  | "classifying"
  | "emergency"
  | "blocked"
  | "followups"
  | "ari"
  | "photo"
  | "confirm"
  | "filing"
  | "done";

interface FiledSummary {
  confirmation: string;
  photoError: boolean;
  /** The filed report: drives the "where it went" pop-up. */
  report: Report;
}

interface FollowUpState {
  buildings: Building[];
  plan: Awaited<ReturnType<typeof buildFollowUpPlan>>;
}

export function ReportFlow() {
  const { activeUser, loading, users, setActiveUserId } = useActiveUser();
  const router = useRouter();
  // Ari's campus helper hands its text over as ?text=… so the student never
  // types the same thing twice.
  const carried = useSearchParams().get("text");

  const [phase, setPhase] = React.useState<Phase>("compose");
  const [text, setText] = React.useState(() => (carried ?? "").slice(0, MAX_CHARS));
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [draft, setDraft] = React.useState<ReportDraft | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filed, setFiled] = React.useState<FiledSummary | null>(null);
  /** Ari's look-back: history line + curated quick fixes; null while loading. */
  const [ari, setAri] = React.useState<{ intro: string; history: string; fixes: QuickFix[] } | null>(null);
  /** "That fixed it" was tapped: nothing is filed. */
  const [selfFixed, setSelfFixed] = React.useState(false);
  /** The "your report was rated X and sent to Y" pop-up after posting. */
  const [sentOpen, setSentOpen] = React.useState(false);
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

  // Ari also watches WHILE the student types: once they pause (~0.9 s) on text
  // that reads as an emergency, the Call 911 / campus-police takeover comes up
  // without waiting for Continue. The submit-time check below still runs.
  const liveTimer = React.useRef<number | undefined>(undefined);
  const dismissedLive = React.useRef<string | null>(null);
  React.useEffect(() => () => window.clearTimeout(liveTimer.current), []);
  function handleTextChange(next: string) {
    setText(next);
    window.clearTimeout(liveTimer.current);
    const t = next.trim();
    if (!t || t === dismissedLive.current) return;
    liveTimer.current = window.setTimeout(() => {
      const hit = detectEmergency(t);
      if (hit.isEmergency) {
        dismissedLive.current = t;
        setEmergencyReason(hit.reason);
        setPhase("emergency");
      }
    }, 900);
  }

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

      // Not a real report (spam, a prize/money claim, a joke, keyboard noise,
      // or nothing about campus): block it, keep the text, persist nothing.
      const screen = screenReport({
        text: trimmed,
        classification: {
          rejected: c.rejected || isSpam(trimmed),
          reason: c.rejectionReason ?? undefined,
        },
      });
      if (screen.rejected) {
        setError(screen.reason ?? "This doesn't look like a campus repair report.");
        setPhase("compose");
        return;
      }

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

      // Ticket 06: PUBLIC reports must never name a specific person. The guard
      // OR-s the AI flag with a pure keyword fallback, so it holds with the AI
      // off. On a block we persist NOTHING — the student's text stays in the
      // form and the block dialog offers Rephrase or Send privately.
      if (checkNamesPerson(nextDraft).blocked) {
        setPhase("blocked");
        return;
      }

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
        void showAri(nextDraft);
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

  /**
   * Block dialog — "Rephrase": return to the preserved text and re-validate.
   * Nothing was persisted; the student's text is still in the box, so we just
   * drop back to compose where re-submitting runs the guard again.
   */
  function handleRephrase() {
    setDraft(null);
    setPhase("compose");
  }

  /**
   * Block dialog — "Send privately": carry the SAME text into the Private tab
   * (the private path is allowed to name people). The private screen (Track C,
   * ticket 15) reads the text from the query param. Nothing was persisted here.
   */
  function handleSendPrivately() {
    const carried = draft?.text ?? text.trim();
    router.push(`/private?text=${encodeURIComponent(carried)}`);
  }

  function handleFollowUpsDone(answers: FollowUpAnswers) {    setDraft((d) => (d ? { ...d, location: answers.location } : d));
    setFileFlags((f) => ({
      ...f,
      buildingId: answers.buildingId,
      locationUnverified: answers.locationUnverified,
    }));
    if (draft) void showAri({ ...draft, location: answers.location });
    else setPhase("photo");
  }

  /**
   * Ari's step (prototype R11): before filing, Ari says how often this has
   * happened and how fast it usually gets fixed, and offers up to two safe
   * quick fixes. Never for hazards. Bounded: if anything is slow or fails we
   * move straight on to the photo step, so this can never hang the flow.
   */
  async function showAri(d: ReportDraft) {
    if (ariSuppressed({ safetyHazard: !!hazardReason }) || d.category === "Safety") {
      setPhase("photo");
      return;
    }
    setAri(null);
    setPhase("ari");
    const store = getStore();
    const ctx = { campusId: MIT_CAMPUS_ID, category: d.category, item: d.item };
    try {
      const [history, fixes] = await Promise.race([
        Promise.all([ariHistoryLine(store, ctx), ariQuickFixes(store, ctx)]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("slow")), 4000)),
      ]);
      setAri({ intro: ariIntro(d.category), history, fixes });
    } catch {
      setPhase("photo");
    }
  }

  async function handleThatFixedIt() {
    if (draft && activeUser) {
      await thatFixedIt(getStore(), {
        campusId: MIT_CAMPUS_ID,
        category: draft.category,
        item: draft.item,
        userId: activeUser.id,
      }).catch(() => {});
    }
    setSelfFixed(true);
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
      setFiled({ confirmation: result.confirmation, photoError: result.photoError, report: result.report });
      setSentOpen(true);
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
    setAri(null);
    setSelfFixed(false);
    setText("");
    setPhoto(null);
    setDraft(null);
    setFiled(null);
    setSentOpen(false);
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

  // Names-a-person block (public path): nothing was persisted; the student's
  // text is preserved in state (Rephrase returns straight to the compose box).
  // The dialog is modal and traps focus while open.
  if (phase === "blocked") {
    return (
      <div className="flex flex-col gap-4">
        <AriShell message="Reading your report…" />
        <NamesPersonBlock
          open
          onRephrase={handleRephrase}
          onSendPrivately={handleSendPrivately}
        />
      </div>
    );
  }

  if (phase === "done" && filed) {
    const team = teamForCategory(filed.report.category);
    // The staff member who owns that team's queue, so "see it" lands on it.
    const responder = users.find((u) => u.role === "responder" && u.publicTeam === team);
    return (
      <div className="flex flex-col gap-4" data-tour="done">
        <Dialog
          open={sentOpen}
          onClose={() => setSentOpen(false)}
          title="Your report is in 🎉"
          className="max-w-md"
        >
          <div className="flex flex-col gap-4 text-sm">
            <p className="font-medium text-foreground">{filed.report.title}</p>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border p-3">
                <dt className="text-xs text-muted-foreground">Ari rated it</dt>
                <dd className="mt-1">
                  <Badge tier={filed.report.tier} />
                </dd>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <dt className="text-xs text-muted-foreground">Sent to</dt>
                <dd className="mt-1 font-semibold text-foreground">{team} team</dd>
              </div>
            </dl>
            <p className="text-muted-foreground">
              It&apos;s now in the {team} staff queue — only {team} staff see it, ranked by
              severity × how many students hit it. You&apos;ll be notified every time its
              status changes.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setSentOpen(false)}>
                Close
              </Button>
              <Link
                href="/staff"
                onClick={() => {
                  if (responder) setActiveUserId(responder.id);
                  stopReportTour();
                }}
                className="inline-flex h-10 items-center justify-center rounded-(--radius) bg-staff px-4 text-sm font-medium text-staff-foreground transition-opacity hover:opacity-90"
              >
                See it in the {team} staff queue →
              </Link>
            </div>
          </div>
        </Dialog>
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
      <StepFrame phase={phase}>
        <div data-tour="followups">
          <FollowUpStep
            plan={followUp.plan}
            buildings={followUp.buildings}
            campusId={MIT_CAMPUS_ID}
            onDone={handleFollowUpsDone}
          />
        </div>
      </StepFrame>
    );
  }

  if (phase === "ari") {
    if (selfFixed) {
      return (
        <div className="flex flex-col gap-4" data-tour="done">
          <AriShell message="Glad it's sorted! Nothing was filed." />
          <div>
            <Button variant="secondary" onClick={() => { setSelfFixed(false); reset(); }}>
              Report something else
            </Button>
          </div>
        </div>
      );
    }
    return (
      <StepFrame phase={phase}>
        <div data-tour="ari">
          {ari ? (
            <AriPopup
              message={ari.intro}
              historyLine={ari.history}
              quickFixes={ari.fixes}
              onThatFixedIt={handleThatFixedIt}
              onStillBroken={() => setPhase("photo")}
            />
          ) : (
            <AriShell message="Checking past reports like this one…" />
          )}
        </div>
      </StepFrame>
    );
  }

  if (phase === "photo") {
    return (
      <StepFrame phase={phase}>
        <div data-tour="photo">
          <PhotoStep
            photo={photo}
            onChange={setPhoto}
            onNext={() => setPhase("confirm")}
            onBack={() => setPhase(followUp ? "followups" : "compose")}

          />
        </div>
      </StepFrame>
    );
  }

  if (phase === "confirm" || phase === "filing") {
    return (
      <StepFrame phase={phase}>
        <div className="flex flex-col gap-4" data-tour="confirm">
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
      </StepFrame>
    );
  }

  // compose / classifying
  return (
    <StepFrame phase={phase}>
      <div className="flex flex-col gap-4">
        <form className="flex flex-col gap-3" onSubmit={handleSubmitText}>
          <label htmlFor="report-text" className="text-sm font-medium">
            What&apos;s broken?
          </label>
          <textarea
            id="report-text"
            data-tour="report-text"
            value={text}
            maxLength={MAX_CHARS}
            onChange={(e) => handleTextChange(e.target.value)}
            disabled={phase === "classifying"}
            placeholder="Describe the problem in your own words — e.g. “The ice cream machine in Lobdell is broken again.”"
            className="min-h-28 w-full rounded-(--radius) border border-border bg-background p-3 text-sm placeholder:text-muted-foreground disabled:opacity-50"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Anonymous to students. Staff can see who filed.</span>
            <span aria-live="polite">{remaining} left</span>
          </div>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-[var(--tier-urgent-fg)]/20 bg-[var(--tier-urgent-bg)] px-4 py-3 text-sm text-[var(--tier-urgent-fg)]"
            >
              <span aria-hidden className="font-bold">!</span>
              <span>{error}</span>
            </div>
          ) : null}

          <div>
            <Button type="submit" disabled={!text.trim() || phase === "classifying"} data-tour="report-submit">
              {phase === "classifying" ? "Reading…" : "Continue"}
            </Button>
          </div>
        </form>

        {phase === "classifying" ? (
          <AriShell message="Reading your report…" />
        ) : null}
      </div>
    </StepFrame>
  );
}

/** Wraps a step's content with the visible Describe → Details → Photo → Review header. */
function StepFrame({ phase, children }: { phase: Phase; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <ReportSteps current={stepForPhase(phase)} />
      {children}
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
          <Button onClick={onFile} disabled={filing} data-tour="post">
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
