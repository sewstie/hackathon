"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  OFFICE_OPTIONS,
  filePrivateReport,
  privacyNotice,
  routeOffice,
} from "@/packages/private";
import { getStore, MIT_CAMPUS_ID } from "@/lib/store";
import { detectEmergency } from "@/modules/emergency";
import { isSpam } from "@/packages/abuse";
import { useActiveUser } from "@/components/layout";
import type { Campus, Office } from "@/types";
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from "@/components/ui";

const MAX_CHARS = 500;

type Step = "compose" | "review" | "filed";

/**
 * The Direct (private) report flow. A student describes a sensitive issue —
 * which may name people, rooms and times — then confirms or changes the office,
 * reads the exact privacy terms, and files privately. The destination of the
 * public-path "Send privately" redirect: any carried text arrives as the
 * `initialText` prop.
 *
 * Immediate-danger text triggers an emergency takeover with Call 911 / Campus
 * Police before any filing, so safety comes before paperwork.
 */
export function PrivateReportFlow({ initialText = "" }: { initialText?: string }) {
  const router = useRouter();
  const { activeUser, loading } = useActiveUser();

  const [step, setStep] = React.useState<Step>("compose");
  const [text, setText] = React.useState(initialText);
  const [office, setOffice] = React.useState<Office>("Dean of Students");
  const [dontShareName, setDontShareName] = React.useState(false);
  const [emergency, setEmergency] = React.useState(false);
  const [spamError, setSpamError] = React.useState<string | null>(null);
  const [campus, setCampus] = React.useState<Campus | null>(null);
  const [filing, setFiling] = React.useState(false);
  const [filedReportId, setFiledReportId] = React.useState<string | null>(null);

  React.useEffect(() => {
    getStore()
      .getCampus(MIT_CAMPUS_ID)
      .then(setCampus)
      .catch(() => setCampus(null));
  }, []);

  function onContinue() {
    const decision = routeOffice({ text });
    setOffice(decision.office);
    // Prototype R5.9: the takeover applies inside Direct reports too. Same
    // instant keyword check as the public flow; a false alarm costs one tap.
    if (decision.emergency || detectEmergency(text).isEmergency) {
      setEmergency(true);
      return;
    }
    if (isSpam(text)) {
      setSpamError("This doesn't look like a real report. Say what happened, and where.");
      return;
    }
    setSpamError(null);
    setStep("review");
  }

  async function onFile() {
    if (!activeUser) return;
    setFiling(true);
    try {
      const title = text.trim().slice(0, 80) || "Private report";
      const filed = await filePrivateReport(getStore(), {
        campusId: MIT_CAMPUS_ID,
        reporterId: activeUser.id,
        office,
        title,
        body: text.trim(),
        dontShareName,
      });
      setFiledReportId(filed.id);
      setStep("filed");
    } finally {
      setFiling(false);
    }
  }

  // Safety beats everything: emergency takeover before any filing.
  if (emergency) {
    return <EmergencyTakeover campus={campus} onDismiss={() => { setEmergency(false); setStep("review"); }} />;
  }

  if (step === "filed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sent privately to {office}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            Your report is with {office}. You&apos;ll be notified of any reply or
            status change.
          </p>
          <div className="flex flex-wrap gap-2">
            {filedReportId && (
              <Button onClick={() => router.push(`/private/thread/${filedReportId}`)}>
                Open your private thread
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => router.push(`/campus/${MIT_CAMPUS_ID}`)}
            >
              Back to campus home
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "review") {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <p className="text-sm font-medium text-primary">Direct (private) report</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Review and send</h1>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Going to: {office}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="office-select" className="text-sm font-medium">
                Change office
              </label>
              <Select
                id="office-select"
                value={office}
                onChange={(e) => setOffice(e.target.value as Office)}
              >
                {OFFICE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={dontShareName}
                onChange={(e) => setDontShareName(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Don&apos;t share my name.{" "}
                <span className="text-muted-foreground">
                  They won&apos;t be able to contact you directly.
                </span>
              </span>
            </label>

            <p
              className="rounded-(--radius) border border-border bg-muted p-3 text-sm"
              role="note"
            >
              {privacyNotice(office)}
            </p>

            {campus && (
              <p className="text-sm">
                Want to talk to someone confidentially?{" "}
                <a
                  href={campus.counselingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  {campus.counselingName} &rarr;
                </a>
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setStep("compose")}>
            Back
          </Button>
          <Button onClick={onFile} disabled={filing || loading || !activeUser}>
            {filing ? "Sending…" : "Send privately"}
          </Button>
        </div>
      </div>
    );
  }

  // Compose step.
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-primary">Direct (private) report</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Report something sensitive, privately
        </h1>
        <p className="text-sm text-muted-foreground">
          You can name people, rooms, and times. This goes to exactly one office —
          not the public feed.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label htmlFor="private-text" className="text-sm font-medium">
          What happened?
        </label>
        <textarea
          id="private-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={6}
          maxLength={MAX_CHARS}
          placeholder="Describe what happened. You can include names, rooms, and times."
          className="w-full rounded-(--radius) border border-border bg-background p-3 text-sm"
          aria-describedby="private-char-count"
        />
        <p id="private-char-count" className="text-xs text-muted-foreground">
          {text.length}/{MAX_CHARS}
        </p>
        {spamError ? (
          <p role="alert" className="rounded-2xl bg-[var(--tier-urgent-bg)] px-4 py-3 text-sm text-[var(--tier-urgent-fg)]">
            {spamError}
          </p>
        ) : null}
      </div>

      <div>
        <Button onClick={onContinue} disabled={text.trim().length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}

/** Full-screen emergency takeover: safety before any report is filed. */
function EmergencyTakeover({
  campus,
  onDismiss,
}: {
  campus: Campus | null;
  onDismiss: () => void;
}) {
  const call911Ref = React.useRef<HTMLAnchorElement>(null);
  React.useEffect(() => {
    call911Ref.current?.focus();
  }, []);

  const policePhone = campus?.campusPolicePhone ?? "911";
  const policeName = campus?.campusPoliceName ?? "Campus Police";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Emergency"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-danger p-6 text-danger-foreground"
    >
      <p className="max-w-sm text-center text-lg font-semibold">
        If you&apos;re in immediate danger, call for help now.
      </p>
      <a
        ref={call911Ref}
        href="tel:911"
        className="flex h-16 w-full max-w-xs items-center justify-center rounded-(--radius) bg-background text-lg font-bold text-danger"
      >
        Call 911
      </a>
      <a
        href={`tel:${policePhone}`}
        className="flex h-14 w-full max-w-xs items-center justify-center rounded-(--radius) border border-danger-foreground text-base font-semibold"
      >
        Call {policeName}
      </a>
      <button
        type="button"
        onClick={onDismiss}
        className="text-sm underline underline-offset-2"
      >
        Not an emergency — continue my report
      </button>
    </div>
  );
}
