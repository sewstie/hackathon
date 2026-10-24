"use client";

// Ticket 05 UI — the full-screen emergency takeover.
//
// Safety beats everything: the instant detectEmergency raises on submit (before
// any network/AI), this covers the whole screen with a red, high-contrast panel
// — Ari, a one-line reason, a LARGE Call 911 button, Call Campus Police, and
// the single explicit dismissal "Not an emergency — continue my report".
//
// Accessibility (stories 82, 80): it's a role="dialog" aria-modal panel that
// moves focus to Call 911 on mount and TRAPS focus (Tab cycles within), and it
// fits at 360 px. The app NEVER auto-dials — Call 911 / Campus Police are
// `tel:` links the user must tap; each tap is reported via onCall so the caller
// can write the audit row.
import * as React from "react";

import { AriShell } from "@/components/ari";
import type { EmergencyCallKind } from "@/modules/emergency";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export interface EmergencyTakeoverProps {
  /** One-line reason from detectEmergency, e.g. "Possible fire". */
  reason: string;
  /** Campus police display name, e.g. "MIT Police". */
  campusPoliceName: string;
  /** Campus police phone for the tel: link, e.g. "617-253-1212". */
  campusPolicePhone: string;
  /** The ONLY dismissal: files the report to Safety as Urgent. */
  onContinue: () => void;
  /** Reports a Call 911 / Campus Police tap so the caller can log it. */
  onCall: (kind: EmergencyCallKind) => void;
}

export function EmergencyTakeover({
  reason,
  campusPoliceName,
  campusPolicePhone,
  onContinue,
  onCall,
}: EmergencyTakeoverProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const call911Ref = React.useRef<HTMLAnchorElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    // Move focus to Call 911 on mount — help is one keystroke away (story 82).
    call911Ref.current?.focus();

    // Trap Tab within the panel. There is NO Escape dismissal: the only way out
    // is the explicit "Not an emergency" action (the AI can never close one).
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-y-auto bg-danger p-6 text-danger-foreground"
    >
      <AriShell
        className="w-full max-w-sm border-danger-foreground/30 bg-danger-foreground/10"
        message={
          <span className="text-danger-foreground">
            If you&apos;re in danger, get help first.
          </span>
        }
      />

      <div className="flex w-full max-w-sm flex-col items-center gap-2 text-center">
        <h1 id={titleId} className="text-2xl font-bold">
          This may be an emergency
        </h1>
        <p id={descId} className="text-lg font-medium">
          {reason}
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <a
          ref={call911Ref}
          href="tel:911"
          onClick={() => onCall("call-911")}
          className="flex w-full items-center justify-center rounded-[--radius] bg-danger-foreground px-6 py-5 text-2xl font-bold text-danger focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-danger-foreground"
        >
          Call 911
        </a>
        <a
          href={`tel:${campusPolicePhone}`}
          onClick={() => onCall("call-campus-police")}
          className="flex w-full items-center justify-center rounded-[--radius] border-2 border-danger-foreground px-6 py-4 text-lg font-semibold text-danger-foreground focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-danger-foreground"
        >
          Call {campusPoliceName}
        </a>
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-[--radius] px-6 py-3 text-base font-medium text-danger-foreground underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-foreground"
        >
          Not an emergency — continue my report
        </button>
      </div>

      <p className="max-w-sm text-center text-sm text-danger-foreground/80">
        We&apos;ll never dial for you — tap a button above to call yourself.
      </p>
    </div>
  );
}
