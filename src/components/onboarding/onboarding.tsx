"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Dialog } from "@/components/ui";
import { AriRobot } from "@/components/ari";
import { readActive as reportTourRunning, ReportTour, startReportTour, useReportTourActive } from "./report-tour";
import { SpotlightTour, STAFF_SPOTS, STUDENT_SPOTS } from "./spotlight-tour";
import { demoViewFor, DEMO_ENTRY, type DemoView } from "@/components/layout";
import {
  initialOnboardingState,
  onboardingReducer,
} from "./onboarding-sequence";

/** How long after the welcome closes the try-reporting nudge appears. */
const DEFAULT_NUDGE_DELAY_MS = 10_000;
/**
 * The welcome pop-up shows every time the demo is OPENED: every page load, and
 * every switch between the student and staff views. In-app page changes inside
 * one view don't re-show it (the layout stays mounted). "Demo guide" in the top
 * bar reopens it on demand.
 */
/** Fired by the header's "Demo guide" button to reopen the welcome on demand. */
export const OPEN_ONBOARDING_EVENT = "unifix:onboarding-open";



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
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-90";

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
  const dismiss = React.useCallback(() => dispatch({ type: "DISMISS" }), []);
  /** "Show me around": the spotlight walkthrough of this view's screen. */
  const [spotlight, setSpotlight] = React.useState(false);
  const tourRunning = useReportTourActive();
  // One surface at a time: the nudge never appears over a tour.
  const busy = spotlight || tourRunning;
  const showAround = () => {
    dismiss();
    setSpotlight(true);
  };

  // Entry: show the welcome every time this view is opened (mounted) — but
  // not on a reload in the middle of the guided report tour.
  React.useEffect(() => {
    if (!(view === "student" && reportTourRunning())) dispatch({ type: "ENTER" });
  }, [view]);

  // The header's "Demo guide" button reopens it at any time.
  React.useEffect(() => {
    const open = () => dispatch({ type: "REOPEN" });
    window.addEventListener(OPEN_ONBOARDING_EVENT, open);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, open);
  }, []);

  // Student view only: a little after the welcome closes, ask the judge to
  // try reporting an incident. Not while already on a reporting page.
  React.useEffect(() => {
    if (view !== "student" || suppressNudge) return;
    if (state.nudgeSeen || !state.welcomeSeen) return;
    if (state.visibleStep === "welcome") return;
    const id = window.setTimeout(() => dispatch({ type: "NUDGE_READY" }), nudgeDelayMs);
    return () => window.clearTimeout(id);
  }, [view, suppressNudge, state.welcomeSeen, state.nudgeSeen, state.visibleStep, nudgeDelayMs]);

  const student = view === "student";
  const copy = student
    ? {
        title: "You're in the student view",
        intro: "This is what a student at MIT sees: a live map and feed of what's broken on campus.",
        points: [
          { icon: "✍️", label: "Report in plain words", hint: "Ari sorts it and asks only what's missing" },
          { icon: "▲", label: "Upvote what you also hit", hint: "Co-signs push it up the queue" },
          { icon: "✓", label: "Follow it to Fixed", hint: "You're notified at every step" },
        ],
        tip: "Switch between Ana, Ben and Cam from the Student menu, top right.",
      }
    : {
        title: "You're in the staff view",
        intro: "This is what campus staff see when they fix what students report.",
        points: [
          { icon: "☰", label: "Your team's queue", hint: "Ranked by severity × how many are affected" },
          { icon: "↻", label: "Update the status", hint: "Every student on the report is notified" },
          { icon: "🔒", label: "Private inbox", hint: "Sensitive reports, for one office only" },
        ],
        tip: "Switch teams from the Staff member menu, top right. Every team has reports waiting.",
      };
  // One accent per view: indigo for students, teal for staff.
  const accent = { "--v": student ? "var(--primary)" : "var(--staff)" } as React.CSSProperties;

  const hero = (
    <div
      aria-hidden
      style={accent}
      className="relative h-36 overflow-hidden border-b border-border bg-[radial-gradient(120%_120%_at_100%_0%,color-mix(in_oklab,var(--v)_28%,transparent)_0%,transparent_60%),radial-gradient(90%_90%_at_0%_100%,color-mix(in_oklab,var(--ari-glow)_22%,transparent)_0%,transparent_60%)]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(color-mix(in_oklab,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--foreground)_5%,transparent)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(80%_100%_at_70%_30%,black,transparent)]" />
      <span className="absolute left-7 top-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--v)] backdrop-blur">
        <span className="relative flex size-2">
          <span className="cx-ring absolute inset-0 rounded-full bg-[var(--v)]" />
          <span className="relative size-2 rounded-full bg-[var(--v)]" />
        </span>
        Demo · {student ? "Student" : "Staff"} view
      </span>
      <div className="absolute -bottom-3 right-6">
        <span className="absolute inset-4 rounded-full bg-[color-mix(in_oklab,var(--v)_25%,transparent)] blur-2xl" />
        <AriRobot size={104} className="relative" />
      </div>
    </div>
  );

  return (
    <>
      <Dialog
        open={state.visibleStep === "welcome"}
        onClose={dismiss}
        title={copy.title}
        hero={hero}
        className="max-w-lg overflow-hidden p-0 sm:p-0"
        titleClassName="px-7 pt-6 text-2xl font-bold tracking-tight"
        bodyClassName="mt-2 px-7 pb-7"
      >
        <div className="flex flex-col gap-5" style={accent}>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.intro}</p>

          <ul className="cx-stagger flex flex-col gap-2">
            {copy.points.map((p) => (
              <li key={p.label} className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-3 py-2.5">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--v)_12%,transparent)] text-sm font-bold text-[var(--v)]"
                >
                  {p.icon}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-foreground">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.hint}</span>
                </span>
              </li>
            ))}
          </ul>

          {student ? (
            // Guided walkthrough: Ari points at each thing to click and says
            // what to type, through the real report flow.
            <Link
              href={DEMO_ENTRY.student}
              onClick={() => {
                startReportTour();
                dismiss();
              }}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-[linear-gradient(120deg,var(--primary),color-mix(in_oklab,var(--primary)_55%,var(--ari-glow)))] p-4 text-primary-foreground shadow-[0_18px_40px_-18px_var(--primary)] transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden className="relative flex size-11 shrink-0 items-center justify-center">
                <span className="cx-ring absolute inset-0 rounded-full bg-primary-foreground/30" />
                <span className="relative flex size-11 items-center justify-center rounded-full bg-primary-foreground text-primary">▶</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-bold">Try creating a report, step by step</span>
                <span className="text-sm opacity-85">Ari shows what to click and type · 1 min</span>
              </span>
              <span aria-hidden className="text-lg transition-transform group-hover:translate-x-1">→</span>
            </Link>
          ) : null}

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <span aria-hidden>💡</span>
            <span>{copy.tip}</span>
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
            {student ? (
              <>
                {/* Order of attention: the step-by-step card above leads, then
                    exploring; the staff view is there but deliberately small. */}
                <Link
                  href={DEMO_ENTRY.staff}
                  onClick={dismiss}
                  className="mr-auto inline-flex h-10 items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Switch to staff view <span aria-hidden>→</span>
                </Link>
                <Button variant="ghost" onClick={dismiss}>
                  Keep exploring
                </Button>
                <Button variant="secondary" onClick={showAround} className="h-10 px-5">
                  Show me around
                </Button>
              </>
            ) : (
              <>
                {/* Staff side: staff actions lead; the way back stays quiet. */}
                <Link
                  href={DEMO_ENTRY.student}
                  onClick={dismiss}
                  className="mr-auto inline-flex h-10 items-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <span aria-hidden>←</span> Back to student view
                </Link>
                <Button variant="ghost" onClick={dismiss}>
                  Got it
                </Button>
                <Button onClick={showAround} className="h-10 bg-staff px-5 text-staff-foreground">
                  Show me around
                </Button>
              </>
            )}
          </div>
        </div>
      </Dialog>

      {state.visibleStep === "nudge" && !suppressNudge && !busy ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-(--radius) border border-border bg-card p-4 text-card-foreground shadow-[var(--shadow-md)]"
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
                className="inline-flex h-8 items-center justify-center gap-2 rounded-(--radius) bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                Report an incident
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  startReportTour();
                  dismiss();
                }}
              >
                Show me step by step
              </Button>
              <Button variant="ghost" size="sm" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="shrink-0 rounded-(--radius) p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      ) : null}

      {view === "student" ? <ReportTour /> : null}
      {spotlight ? (
        <SpotlightTour
          steps={student ? STUDENT_SPOTS : STAFF_SPOTS}
          staff={!student}
          onClose={() => setSpotlight(false)}
        />
      ) : null}
    </>
  );
}
