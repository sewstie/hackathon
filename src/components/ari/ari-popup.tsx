"use client";

import * as React from "react";
import { AriShell } from "./ari-shell";
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
    <AriShell message={message} className={className}>
      <div className="mt-2 space-y-3">
        <p className="text-sm text-muted-foreground">{historyLine}</p>

        {hasFixes ? (
          <ul className="space-y-2" aria-label="Quick fixes to try">
            {quickFixes.map((fix) => (
              <li
                key={fix.id}
                className="rounded-[--radius] border border-border bg-background p-2 text-sm"
              >
                {fix.text}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {hasFixes ? (
            <Button type="button" variant="secondary" onClick={onThatFixedIt}>
              That fixed it
            </Button>
          ) : null}
          <Button type="button" onClick={onStillBroken}>
            Still broken — file it
          </Button>
        </div>
      </div>
    </AriShell>
  );
}
