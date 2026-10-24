"use client";

import * as React from "react";
import Link from "next/link";
import { Button, Dialog } from "@/components/ui";
import { useActiveUser } from "@/components/layout";
import {
  initialOnboardingState,
  onboardingReducer,
} from "./onboarding-sequence";

/** How long after entering the feed the try-reporting nudge appears. */
const DEFAULT_NUDGE_DELAY_MS = 16_000;
/** One-per-session marker so a reload / re-navigation doesn't re-onboard. */
const SESSION_KEY = "unifix.onboarding.seen";

export interface OnboardingProps {
  /**
   * Delay before the nudge becomes ready (ms). Overridable for tests; defaults
   * to ~16s per the spec's "~15–20s or after some scrolling".
   */
  nudgeDelayMs?: number;
}

/**
 * Demo onboarding, mounted on the student feed. On first entry of a session it
 * shows a small, dismissible WELCOME pop-up explaining the student view and
 * offering a one-tap switch to the staff view. A little later a one-time,
 * dismissible NUDGE invites the judge to try filing a report. The two are
 * SEQUENCED by `onboardingReducer` so they never overlap, and the whole thing
 * runs at most once per session (tracked in `sessionStorage`).
 */
export function Onboarding({ nudgeDelayMs = DEFAULT_NUDGE_DELAY_MS }: OnboardingProps) {
  const [state, dispatch] = React.useReducer(
    onboardingReducer,
    undefined,
    initialOnboardingState,
  );
  const { users, setActiveUserId } = useActiveUser();

  // Entry: show the welcome once per session.
  React.useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage can throw (privacy mode); fall back to in-memory once.
    }
    if (!alreadySeen) dispatch({ type: "ENTER" });
  }, []);

  // Mark the session as onboarded once the welcome has been shown, so a reload
  // doesn't replay it. (The in-session reducer guards against double-show too.)
  React.useEffect(() => {
    if (state.welcomeSeen) {
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, [state.welcomeSeen]);

  // Nudge timer: start once the welcome has been dismissed (visibleStep back to
  // "none" with the welcome already seen but the nudge not yet). Re-firing
  // NUDGE_READY while the welcome is up is a safe no-op in the reducer.
  React.useEffect(() => {
    if (state.nudgeSeen) return;
    if (!state.welcomeSeen) return; // wait until the welcome has appeared
    if (state.visibleStep === "welcome") return; // sequenced: not while it's up
    const id = window.setTimeout(() => dispatch({ type: "NUDGE_READY" }), nudgeDelayMs);
    return () => window.clearTimeout(id);
  }, [state.welcomeSeen, state.nudgeSeen, state.visibleStep, nudgeDelayMs]);

  function switchToStaff() {
    const staff = users.find((u) => u.role === "responder");
    if (staff) setActiveUserId(staff.id);
    dispatch({ type: "DISMISS" });
  }

  return (
    <>
      <Dialog
        open={state.visibleStep === "welcome"}
        onClose={() => dispatch({ type: "DISMISS" })}
        title="You're in the student view"
        description="This is what a student sees — a live feed of campus reports they can upvote (co-sign) and add to. You can switch to the staff view any time from the header."
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => dispatch({ type: "DISMISS" })}>
            Keep exploring
          </Button>
          <Button variant="primary" onClick={switchToStaff}>
            Switch to staff view
          </Button>
        </div>
      </Dialog>

      {state.visibleStep === "nudge" ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-full max-w-md items-start gap-3 rounded-[--radius] border border-border bg-card p-4 text-card-foreground shadow-[var(--shadow-md)]"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Try it yourself</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Want to see the core flow? File a quick report — it takes under a minute.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/report"
                onClick={() => dispatch({ type: "DISMISS" })}
                className="inline-flex h-8 items-center justify-center gap-2 rounded-[--radius] bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                Report an issue
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: "DISMISS" })}
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dispatch({ type: "DISMISS" })}
            className="shrink-0 rounded-[--radius] p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
