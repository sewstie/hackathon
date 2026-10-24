"use client";

// Ari's floating helper — always parked bottom-right on the campus page.
//
// A student can open Ari at any time and say what's going on. Safety runs
// first and runs LIVE (pure keyword check, no network, no AI):
//
//   - an active emergency ("there's smoke in the lab") immediately raises the
//     full-screen takeover: Call 911 + Call campus police, never auto-dialed;
//   - a non-active hazard ("railing is loose") shows a red note with the campus
//     police number and NO quick fixes;
//   - anything else gets a one-tap hand-off into the normal report flow with the
//     text carried over.
//
// The helper also keeps the help contacts one tap away (police, private report,
// confidential counseling) so "where do I get help" never needs a search.
import * as React from "react";
import Link from "next/link";

import { getStore } from "@/lib/store";
import { useActiveUser } from "@/components/layout";
import { detectEmergency, detectSafetyHazard, logEmergencyCall } from "@/modules/emergency";
import type { EmergencyCallKind } from "@/modules/emergency";
import { AriRobot } from "./ari-robot";
import { EmergencyTakeover } from "./ari-emergency";

export interface AriHelperProps {
  campusPoliceName: string;
  campusPolicePhone: string;
  counselingName: string;
  counselingUrl: string;
}

export function AriHelper({
  campusPoliceName,
  campusPolicePhone,
  counselingName,
  counselingUrl,
}: AriHelperProps) {
  const { activeUser } = useActiveUser();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  /** Reason of the emergency currently on screen; null when none. */
  const [emergency, setEmergency] = React.useState<string | null>(null);
  /** Text the student already said is "not an emergency" (don't re-raise it). */
  const [dismissedFor, setDismissedFor] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const launcherRef = React.useRef<HTMLButtonElement>(null);
  const panelId = React.useId();

  const trimmed = text.trim();
  const hazard = React.useMemo(() => detectSafetyHazard(trimmed), [trimmed]);
  const confirmedUrgent = dismissedFor !== null && dismissedFor === trimmed;

  // Live safety check: raise the takeover once the student pauses typing
  // (~0.6 s), so "fire" mid-way through "fire extinguisher" doesn't fire it.
  const checkTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(checkTimer.current), []);
  function handleChange(next: string) {
    setText(next);
    window.clearTimeout(checkTimer.current);
    const t = next.trim();
    if (!t || t === dismissedFor) return;
    checkTimer.current = window.setTimeout(() => {
      const hit = detectEmergency(t);
      if (hit.isEmergency) setEmergency(hit.reason);
    }, 600);
  }

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open || emergency) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, emergency]);

  function logCall(kind: EmergencyCallKind) {
    if (!activeUser) return;
    // Fire-and-forget: logging must never stand between a student and help.
    void logEmergencyCall({ store: getStore(), actorId: activeUser.id, kind }).catch(() => {});
  }

  const reportHref = { pathname: "/report", query: trimmed ? { text: trimmed } : {} };

  return (
    <>
      {emergency && (
        <EmergencyTakeover
          reason={emergency}
          campusPoliceName={campusPoliceName}
          campusPolicePhone={campusPolicePhone}
          onCall={logCall}
          onContinue={() => {
            setDismissedFor(trimmed);
            setEmergency(null);
          }}
        />
      )}

      <div className="cx-theme fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {open && (
          <section
            id={panelId}
            aria-label="Ari, your campus helper"
            className="cx-pop cx-glass w-[min(22rem,calc(100vw-2.5rem))] rounded-[1.75rem] p-5 text-card-foreground shadow-[0_30px_80px_-30px_var(--cx-glow)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Ari</p>
                <p className="mt-1 text-base font-semibold leading-snug">
                  Hi! Something broken, or something unsafe? Tell me.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  launcherRef.current?.focus();
                }}
                aria-label="Close Ari"
                className="-mr-1 -mt-1 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <label htmlFor={`${panelId}-text`} className="sr-only">
              What&apos;s going on?
            </label>
            <textarea
              id={`${panelId}-text`}
              ref={inputRef}
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. “the printer in the library is jammed”"
              className="mt-4 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            {/* Live answer. aria-live so screen readers hear Ari react. */}
            <div aria-live="polite" className="mt-3 flex flex-col gap-2">
              {confirmedUrgent ? (
                <p className="rounded-2xl bg-[var(--tier-urgent-bg)] px-4 py-3 text-sm text-[var(--tier-urgent-fg)]">
                  Okay. I&apos;ll send it to Safety as <strong>Urgent</strong>. If that
                  changes, call {campusPoliceName}:{" "}
                  <a
                    href={`tel:${campusPolicePhone}`}
                    onClick={() => logCall("call-campus-police")}
                    className="font-semibold underline underline-offset-2"
                  >
                    {campusPolicePhone}
                  </a>
                </p>
              ) : hazard.isHazard ? (
                <p role="note" className="rounded-2xl bg-[var(--tier-urgent-bg)] px-4 py-3 text-sm text-[var(--tier-urgent-fg)]">
                  <strong>{hazard.reason}.</strong> Keep clear of it. If anyone could
                  get hurt, call {campusPoliceName}:{" "}
                  <a
                    href={`tel:${campusPolicePhone}`}
                    onClick={() => logCall("call-campus-police")}
                    className="font-semibold underline underline-offset-2"
                  >
                    {campusPolicePhone}
                  </a>
                </p>
              ) : trimmed ? (
                <p className="text-sm text-muted-foreground">
                  Got it. I&apos;ll take it from here — I&apos;ll ask only what&apos;s missing.
                </p>
              ) : null}

              {trimmed && (
                <Link
                  href={reportHref}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Report this <span aria-hidden>→</span>
                </Link>
              )}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Need help now?
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <li>
                  <a
                    href="tel:911"
                    onClick={() => logCall("call-911")}
                    className="flex h-10 items-center justify-center rounded-full bg-danger font-semibold text-danger-foreground transition-opacity hover:opacity-90"
                  >
                    Call 911
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${campusPolicePhone}`}
                    onClick={() => logCall("call-campus-police")}
                    className="flex h-10 items-center justify-center rounded-full border border-danger/40 px-2 text-center font-semibold text-danger transition-colors hover:bg-[var(--tier-urgent-bg)]"
                  >
                    {campusPoliceName}
                  </a>
                </li>
                <li>
                  <Link
                    href="/private"
                    className="flex h-10 items-center justify-center rounded-full border border-border px-2 font-medium transition-colors hover:bg-muted"
                  >
                    Send privately
                  </Link>
                </li>
                <li>
                  <a
                    href={counselingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 items-center justify-center rounded-full border border-border px-2 text-center font-medium transition-colors hover:bg-muted"
                    title={`Talk to ${counselingName} confidentially`}
                  >
                    Talk to someone
                  </a>
                </li>
              </ul>
            </div>
          </section>
        )}

        <button
          ref={launcherRef}
          data-spot="ari"
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={open ? "Close Ari" : "Ask Ari for help"}
          className="group relative flex items-center gap-2 rounded-full py-1 pl-4 pr-1 cx-glass shadow-[0_20px_50px_-20px_var(--cx-glow)] transition-transform hover:-translate-y-0.5"
        >
          {!open && (
            <span className="text-sm font-semibold text-foreground">Need help?</span>
          )}
          <span className="relative flex size-14 items-center justify-center">
            <span aria-hidden className="cx-ring absolute inset-1 rounded-full bg-[var(--cx-glow)]" />
            <AriRobot variant="head" size={52} className="relative" />
          </span>
        </button>
      </div>
    </>
  );
}
