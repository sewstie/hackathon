"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AriRobot } from "./ari-robot";
import { Button } from "@/components/ui";
import type { QuickFix } from "@/types";

export interface AriPopupProps {
  /** Ari's one-line intro (from `ariIntro`). */
  message: React.ReactNode;
  /** The history line (from `ariHistoryLine`). */
  historyLine: string;
  /** Up to two curated quick fixes (from `ariQuickFixes`). */
  quickFixes: QuickFix[];
  /** Student tapped "That fixed it" — the flow logs a self-resolution. */
  onThatFixedIt: () => void;
  /** Student tapped "Still broken — file it" — the flow continues. */
  onStillBroken: () => void;
  className?: string;
}

/**
 * Ari's post-classification popup — a self-contained, Track-C-owned behavior
 * component built on the presentational `AriShell`. It shows Ari's message, a
 * history line, up to two curated quick fixes, and the two deflection actions.
 *
 * This component renders ONLY when Ari is not suppressed; callers gate it with
 * `ariSuppressed(...)` from the `ari` package (never shown for emergencies,
 * safety hazards, or private person-naming reports). Data is passed in already
 * computed so the component stays a thin, testable view.
 */
export function AriPopup({
  message,
  historyLine,
  quickFixes,
  onThatFixedIt,
  onStillBroken,
  className,
}: AriPopupProps) {
  const hasFixes = quickFixes.length > 0;
  return (
    <section
      aria-label="Ari"
      className={cn(
        "cx-pop flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-md)] sm:p-6",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <AriRobot size={64} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Ari</p>
          <p className="mt-1 text-base font-semibold leading-snug">{message}</p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span aria-hidden>↺</span>
            {historyLine}
          </p>
        </div>
      </div>

      {hasFixes ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Try this first — it might save you a report:</p>
          <ul className="flex flex-col gap-2" aria-label="Quick fixes to try">
            {quickFixes.map((fix, i) => (
              <li key={fix.id} className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm">
                <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{fix.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No quick fix for this one — let&apos;s get it to the right team.</p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {hasFixes ? (
          <Button type="button" variant="secondary" onClick={onThatFixedIt}>
            That fixed it
          </Button>
        ) : null}
        <Button type="button" onClick={onStillBroken}>
          Still broken — file it
        </Button>
      </div>
    </section>
  );
}
