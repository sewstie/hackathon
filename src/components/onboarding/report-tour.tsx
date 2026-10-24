"use client";

// Guided "try creating a report" tour for judges in the student demo.
//
// Started from the student welcome pop-up (or the try-it nudge). Ari docks a
// small coach card bottom-left and puts a pulsing ring on the exact thing to
// click next, telling the judge what to type and offering "Type it for me".
// The tour follows the real report flow — it never fakes a step — by watching
// which `data-tour="…"` marker is on screen:
//
//   report-cta → report-text / report-submit → followups → photo → confirm → done
//
// The tour runs only after its button is clicked; nothing here touches report
// logic.
import * as React from "react";
import Link from "next/link";
import { AriRobot } from "@/components/ari";
import { DEMO_ENTRY } from "@/components/layout";

const SAMPLE_TEXT = "The printer on the 2nd floor of Hayden Library is jammed and won't print.";
const EMERGENCY_SAMPLE = "there's smoke coming out of the lab";

// The tour flag lives in memory, NOT in storage: it survives in-app
// navigation (campus page → /report) but a fresh visit or reload never
// resumes it. The tour only ever starts from a click on its button.
let tourActive = false;
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

/** Start the tour (from the "Try creating a report, step by step" button). */
export function startReportTour() {
  tourActive = true;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export function readActive() {
  return tourActive;
}

/** True while the guided report tour is running (for other surfaces to yield). */
export function useReportTourActive(): boolean {
  return React.useSyncExternalStore(subscribe, readActive, () => false);
}

/** End the tour (Finish, ×, or leaving for the staff view). */
export function stopReportTour() {
  tourActive = false;
  emit();
}

type StepId = "cta" | "text" | "submit" | "followups" | "ari" | "photo" | "confirm" | "done" | "away";

interface StepCopy {
  n: number;
  title: string;
  body: React.ReactNode;
}

const TOTAL = 5;

/** Which step is live, judged from what is on screen right now. */
function detectStep(): { id: StepId; target: HTMLElement | null } {
  const q = (s: string) => document.querySelector<HTMLElement>(`[data-tour="${s}"]`);
  const done = q("done");
  if (done) return { id: "done", target: done };
  const confirm = q("confirm");
  if (confirm) return { id: "confirm", target: confirm.querySelector<HTMLElement>("[data-tour=post]") ?? confirm };
  const photo = q("photo");
  if (photo) return { id: "photo", target: photo };
  const ari = q("ari");
  if (ari) return { id: "ari", target: ari };
  const followups = q("followups");
  if (followups) return { id: "followups", target: followups };
  const text = q("report-text") as HTMLTextAreaElement | null;
  if (text) {
    if (text.value.trim()) return { id: "submit", target: q("report-submit") };
    return { id: "text", target: text };
  }
  const cta = q("report-cta");
  if (cta) return { id: "cta", target: cta };
  return { id: "away", target: null };
}

/** Put text into a React-controlled textarea so its onChange fires. */
function typeInto(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
}

export function ReportTour() {
  const active = useReportTourActive();
  const [step, setStep] = React.useState<StepId>("away");
  const targetRef = React.useRef<HTMLElement | null>(null);
  /** Live box of the thing to click, for the dim-everything-else spotlight. */
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  /** Another modal (pop-up) is open: step aside so nothing stacks. */
  const [yielding, setYielding] = React.useState(false);

  // Follow the target's box every frame so the hole tracks scroll / layout.
  React.useEffect(() => {
    if (!active) return;
    let raf = 0;
    const track = () => {
      const el = targetRef.current;
      setRect(el && el.isConnected ? el.getBoundingClientRect() : null);
      setYielding(document.querySelector('[role="dialog"][aria-modal="true"]') !== null);
      raf = window.requestAnimationFrame(track);
    };
    raf = window.requestAnimationFrame(track);
    return () => window.cancelAnimationFrame(raf);
  }, [active]);

  // Follow the real flow: re-read the screen a few times a second.
  React.useEffect(() => {
    if (!active) return;
    const tick = () => {
      const { id, target } = detectStep();
      setStep(id);
      if (target !== targetRef.current) {
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
        targetRef.current = target;
      }
    };
    tick();
    const id = window.setInterval(tick, 350);
    return () => {
      window.clearInterval(id);
      targetRef.current = null;
    };
  }, [active]);

  if (!active || yielding) return null;

  const copy: Record<StepId, StepCopy> = {
    away: {
      n: 1,
      title: "Let's file a report together",
      body: (
        <>
          Head to the campus page to start.{" "}
          <Link href={DEMO_ENTRY.student} className="font-semibold text-primary underline underline-offset-2">
            Go to campus home
          </Link>
        </>
      ),
    },
    cta: { n: 1, title: "Start a report", body: <>Click the glowing <strong>Report an issue</strong> button.</> },
    text: {
      n: 2,
      title: "Say what's wrong",
      body: (
        <>
          Type it like a text to a friend. Try:
          <span className="mt-2 block rounded-xl bg-muted px-3 py-2 text-foreground">“{SAMPLE_TEXT}”</span>
        </>
      ),
    },
    submit: {
      n: 2,
      title: "Send it to Ari",
      body: <>Click <strong>Continue</strong>. Ari reads it and sorts it — no form to fill.</>,
    },
    followups: {
      n: 3,
      title: "Answer Ari's questions",
      body: <>Ari asks only what&apos;s missing, location first. <strong>Tap a chip</strong> to answer (at most 3).</>,
    },
    ari: {
      n: 3,
      title: "Ari checks past reports",
      body: <>See how often this happened and how fast it gets fixed. Try a quick fix, or click <strong>Still broken — file it</strong>.</>,
    },
    photo: { n: 4, title: "Add a photo (optional)", body: <>Attach one if you like, or just click <strong>Next</strong>.</> },
    confirm: { n: 5, title: "Check and post", body: <>Edit anything on the card, then click <strong>Post report</strong>.</> },
    done: {
      n: 5,
      title: "Filed! 🎉",
      body: (
        <>
          It&apos;s now in the right team&apos;s queue, ranked by severity × reach. Bonus: report
          “{EMERGENCY_SAMPLE}” to see Ari&apos;s emergency screen.
        </>
      ),
    },
  };
  const c = copy[step];

  function typeSample(text: string) {
    const el = document.querySelector<HTMLTextAreaElement>('[data-tour="report-text"]');
    if (el) typeInto(el, text);
  }

  return (
    <>
    {/* Dim the page except the thing to click. Purely visual: clicks pass
        straight through (pointer-events none), so the real flow still works. */}
    {rect && step !== "done" ? (
      <div
        aria-hidden
        className="pointer-events-none fixed z-40 rounded-2xl ring-2 ring-primary transition-all duration-300 ease-out"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 55%, transparent)",
        }}
      />
    ) : null}
    <aside
      aria-label="Guided demo"
      aria-live="polite"
      className="cx-theme cx-pop fixed bottom-5 left-5 z-[45] ring-4 ring-primary/30 bg-card border border-border flex w-[min(21rem,calc(100vw-2.5rem))] flex-col gap-3 rounded-[1.75rem] p-5 text-card-foreground shadow-[0_30px_80px_-30px_var(--cx-glow)]"
    >
      <div className="flex items-start gap-3">
        <AriRobot variant="head" size={40} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Guided demo · Step {c.n} of {TOTAL}
          </p>
          <p className="mt-1 text-base font-semibold leading-snug">{c.title}</p>
        </div>
        <button
          type="button"
          onClick={stopReportTour}
          aria-label="End guided demo"
          className="-mr-1 -mt-1 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      <div className="text-sm leading-relaxed text-muted-foreground">{c.body}</div>

      {/* Progress dots. */}
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: TOTAL }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < c.n ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      {step === "text" && (
        <button
          type="button"
          onClick={() => typeSample(SAMPLE_TEXT)}
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Type it for me
        </button>
      )}
      {step === "done" && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={DEMO_ENTRY.staff}
            onClick={stopReportTour}
            className="inline-flex h-10 items-center justify-center rounded-full bg-staff px-4 text-sm font-semibold text-staff-foreground transition-opacity hover:opacity-90"
          >
            Switch to staff view
          </Link>
          <button
            type="button"
            onClick={stopReportTour}
            className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Finish
          </button>
        </div>
      )}
    </aside>
    </>
  );
}
