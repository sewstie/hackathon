"use client";

// Ticket 05 UI — the visible step header for the report flow.
//
// The report flow runs four student-facing steps: Describe → Details → Photo →
// Review. The underlying phase machine has more states (classifying, blocked,
// emergency, filing, done); `stepForPhase` collapses those onto the four steps
// the student sees, so the header reflects progress without leaking internals.
// It is a read-only progress indicator (no navigation): the steps advance
// through the flow's own buttons, matching the existing phase logic.
import * as React from "react";

import { cn } from "@/lib/utils";

export const REPORT_STEPS = ["Describe", "Details", "Photo", "Review"] as const;
export type ReportStep = (typeof REPORT_STEPS)[number];

/** Map a flow phase onto the student-visible step the header highlights. */
export function stepForPhase(phase: string): ReportStep {
  switch (phase) {
    case "followups":
      return "Details";
    case "photo":
      return "Photo";
    case "confirm":
    case "filing":
    case "done":
      return "Review";
    default:
      // compose / classifying / emergency / blocked all read as "Describe".
      return "Describe";
  }
}

interface ReportStepsProps {
  current: ReportStep;
}

export function ReportSteps({ current }: ReportStepsProps) {
  const currentIndex = REPORT_STEPS.indexOf(current);
  return (
    <ol aria-label="Report progress" className="flex items-center gap-2 text-sm">
      {REPORT_STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-(--radius) px-2.5 py-1 font-medium transition-colors",
                active && "bg-primary text-primary-foreground",
                done && "bg-muted text-foreground",
                !active && !done && "text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-xs",
                  active ? "border-primary-foreground" : "border-border",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {step}
            </span>
            {i < REPORT_STEPS.length - 1 ? (
              <span aria-hidden="true" className="h-px w-4 bg-border" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
