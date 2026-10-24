"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Dialog } from "@/components/ui";
import { AriRobot } from "@/components/ari";
import { demoViewFor, DEMO_ENTRY, type DemoView } from "@/components/layout";
import {
  initialOnboardingState,
  onboardingReducer,
} from "./onboarding-sequence";

/** How long after the welcome closes the try-reporting nudge appears. */
const DEFAULT_NUDGE_DELAY_MS = 10_000;
/** One-per-session markers so a reload / re-navigation doesn't re-onboard. */
const SESSION_KEYS: Record<Exclude<DemoView, "landing">, string> = {
  student: "unifix.onboarding.seen",
  staff: "unifix.onboarding.staff.seen",
};

/** Pages where nudging "go file a report" makes no sense: you're already there. */
function isReportingPage(pathname: string | null): boolean {
  return !!pathname && (pathname.startsWith("/report") || pathname.startsWith("/private"));
}

export interface OnboardingProps {
  /** Delay before the nudge becomes ready (ms). Overridable for tests. */
  nudgeDelayMs?: number;
  /** Force a view (tests); defaults to the view of the current URL. */
  view?: DemoView;
}

const linkButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[--radius] px-4 text-sm font-medium transition-colors hover:opacity-90";

/**
 * Demo onboarding, mounted once in the root layout. The first time a session
 * enters the STUDENT demo it shows a welcome pop-up (narrated by Ari) saying
 * "this is the student view"; a little later a one-time nudge invites the
 * judge to try reporting an incident. The first time it enters the STAFF demo
 * it shows its own pop-up saying "this is the staff view". The explainer site
 * gets nothing. Sequencing (never two at once, each once) is the reducer's job.
 */
export function Onboarding({ nudgeDelayMs = DEFAULT_NUDGE_DELAY_MS, view }: OnboardingProps) {
  const pathname = usePathname();
  const current = view ?? demoViewFor(pathname);
  if (current === "landing") return null;
  // Keyed by view: entering the other demo starts its own onboarding.
  return (
    <ViewOnboarding
      key={current}
      view={current}
      nudgeDelayMs={nudgeDelayMs}
      suppressNudge={isReportingPage(pathname)}
    />
  );
}

function ViewOnboarding({
  view,
  nudgeDelayMs,
  suppressNudge,
}: {
  view: Exclude<DemoView, "landing">;
  nudgeDelayMs: number;
  suppressNudge: boolean;
}) {
  const [state, dispatch] = React.useReducer(
    onboardingReducer,
    undefined,
    initialOnboardingState,
  );
  const sessionKey = SESSION_KEYS[view];
  const dismiss = React.useCallback(() => dispatch({ type: "DISMISS" }), []);

  // Entry: show the welcome once per session (per view).
  React.useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(sessionKey) === "1";
    } catch {
      // sessionStorage can throw (privacy mode); fall back to in-memory once.
    }
    if (!alreadySeen) dispatch({ type: "ENTER" });
  }, [sessionKey]);

  React.useEffect(() => {
    if (!state.welcomeSeen) return;
    try {
      window.sessionStorage.setItem(sessionKey, "1");
    } catch {
      // ignore
    }
  }, [state.welcomeSeen, sessionKey]);

  // Student view only: a little after the welcome closes, ask the judge to
  // try reporting an incident. Not while already on a reporting page.
  React.useEffect(() => {
    if (view !== "student" || suppressNudge) return;
    if (state.nudgeSeen || !state.welcomeSeen) return;
    if (state.visibleStep === "welcome") return;
    const id = window.setTimeout(() => dispatch({ type: "NUDGE_READY" }), nudgeDelayMs);
    return () => window.clearTimeout(id);
  }, [view, suppressNudge, state.welcomeSeen, state.nudgeSeen, state.visibleStep, nudgeDelayMs]);

  const copy =
    view === "student"
      ? {
          title: "You're in the student view",
          body: "This is what a student at MIT sees: a live feed and map of what's broken on campus. Students report problems in plain language, upvote (co-sign) ones they also hit, and follow each one from Received to Fixed. The staff who fix them use a separate view.",
          tip: "Use the Student menu at the top right to switch between Ana, Ben and Cam.",
        }
      : {
          title: "You're in the staff view",
          body: "This is what campus staff see: their team's queue, ranked by severity × how many students are affected, plus a private inbox for sensitive reports. Staff update the status and every student on the report is notified.",
          tip: "Use the Staff member menu at the top right to switch teams. Every team and office has reports waiting.",
        };

  return (
    <>
      <Dialog open={state.visibleStep === "welcome"} onClose={dismiss} title={copy.title} className="max-w-lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <AriRobot size={72} className="shrink-0" />
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">Ari</p>
              <p>{copy.body}</p>
              <p className="text-muted-foreground">{copy.tip}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={dismiss}>
              {view === "student" ? "Keep exploring" : "Got it"}
            </Button>
            {view === "student" ? (
              <Link href={DEMO_ENTRY.staff} onClick={dismiss} className={`${linkButton} bg-staff text-staff-foreground`}>
                Switch to staff view
              </Link>
            ) : (
              <Link href={DEMO_ENTRY.student} onClick={dismiss} className={`${linkButton} bg-primary text-primary-foreground`}>
                Back to student view
              </Link>
            )}
          </div>
        </div>
      </Dialog>

      {state.visibleStep === "nudge" && !suppressNudge ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-[--radius] border border-border bg-card p-4 text-card-foreground shadow-[var(--shadow-md)]"
        >
          <AriRobot size={48} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Try it yourself</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Want to see the core flow? Report an incident, like a broken printer or a
              leaking ceiling. It takes under a minute.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/report"
                onClick={dismiss}
                className="inline-flex h-8 items-center justify-center gap-2 rounded-[--radius] bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                Report an incident
              </Link>
              <Button variant="ghost" size="sm" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="shrink-0 rounded-[--radius] p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
