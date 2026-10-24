"use client";

// "Show me around" — a spotlight walkthrough of the demo screen.
//
// Everything is dimmed except one part of the page; a small card next to it
// says what that part is. Next / Back / Skip, arrow keys and Escape work.
// Parts are found by `data-spot="…"` markers; a step whose marker isn't on the
// current page is skipped, so one list serves every page of a view.
import * as React from "react";
import { createPortal } from "react-dom";
import { AriRobot } from "@/components/ari";

export interface SpotStep {
  spot: string;
  title: string;
  body: string;
}

export const STUDENT_SPOTS: SpotStep[] = [
  { spot: "switch-view", title: "Which side you're on", body: "This bar says you're in the student view. You can jump to the staff view any time." },
  { spot: "nav", title: "Student pages", body: "The campus feed, a new report, a private report, and the reports you filed or co-signed." },
  { spot: "report-cta", title: "Start a report here", body: "Say what's wrong in plain words. Ari sorts it and asks only what's missing." },
  { spot: "stats", title: "Live numbers", body: "How many reports are open, how many are high or urgent, and how many got fixed." },
  { spot: "map", title: "The campus map", body: "Problems clustered by building. The color is the most severe report there." },
  { spot: "feed", title: "Campus reports", body: "Ranked by severity × how many students hit it. Tap ▲ to co-sign one you also hit." },
  { spot: "nav-private-report", title: "Private report", body: "For sensitive issues, like ones that name a person. It goes to ONE office only — never the public feed." },
  { spot: "bell", title: "Notifications", body: "You're told every time a report you filed or co-signed changes status." },
  { spot: "role", title: "Switch students", body: "Try the demo as Ana, Ben or Cam." },
  { spot: "ari", title: "Ari, your helper", body: "Ask for help any time. If something sounds urgent, Ari shows Call 911 and MIT Police first." },
];

export const STAFF_SPOTS: SpotStep[] = [
  { spot: "switch-view", title: "You're on the staff side", body: "This is what campus staff see. Students never see this screen." },
  { spot: "team-scope", title: "You only see your area", body: "Each staff member sees only their own team's reports. Facilities staff see Facilities only, IT sees IT only, and so on." },
  { spot: "staff-tabs", title: "Your work", body: "Your team's queue, and — if you hold an office — the private inbox." },
  { spot: "filters", title: "Filter the queue", body: "Narrow by status or building." },
  { spot: "queue", title: "The team queue", body: "Highest priority first: severity × how many students are affected. Open one to update its status — every co-signer is notified." },
  { spot: "private-tab", title: "Private inbox", body: "Sensitive reports sent privately to your office only. They never appear in the public feed; every view is logged." },
  { spot: "nav-private-inbox", title: "Private inbox page", body: "The full inbox: read the report, reply in a private thread, and mark it reviewing, resolved or referred." },
  { spot: "role", title: "Switch staff member", body: "Pick someone on another team to see THEIR queue — e.g. Ivan for IT. Try Campus Police or the Dean of Students for the private inbox." },
];

const PAD = 8;

/** The first VISIBLE element carrying this marker (nav renders twice). */
function findSpot(spot: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-spot="${spot}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function SpotlightTour({
  steps,
  onClose,
  staff = false,
}: {
  steps: SpotStep[];
  onClose: () => void;
  /** Staff view: teal highlight instead of indigo. */
  staff?: boolean;
}) {
  // Only steps whose part is on this page.
  const [live] = React.useState(() => steps.filter((s) => findSpot(s.spot)));
  const [i, setI] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const step = live[i];

  // Bring the part into view, then track its box (scroll, resize, reveal).
  React.useEffect(() => {
    if (!step) return;
    const el = findSpot(step.spot);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    let raf = 0;
    const track = () => {
      const now = findSpot(step.spot);
      setRect(now ? now.getBoundingClientRect() : null);
      raf = window.requestAnimationFrame(track);
    };
    raf = window.requestAnimationFrame(track);
    cardRef.current?.focus();
    return () => window.cancelAnimationFrame(raf);
  }, [step]);

  const next = React.useCallback(() => {
    if (i >= live.length - 1) onClose();
    else setI(i + 1);
  }, [i, live.length, onClose]);
  const back = React.useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, back, onClose]);

  if (!step || typeof document === "undefined") return null;

  // Card placement: under the part if there's room, else above; clamped.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(340, vw - 32);
  let top = vh / 2 - 90;
  let left = vw / 2 - cardW / 2;
  if (rect) {
    const below = rect.bottom + PAD + 14;
    top = below + 200 < vh ? below : Math.max(16, rect.top - PAD - 14 - 200);
    left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16);
  }

  return createPortal(
    <div
      className="cx-theme fixed inset-0 z-[90]"
      role="dialog"
      aria-modal="true"
      aria-label="Guided look around"
      style={
        staff
          ? ({ "--primary": "var(--staff)", "--primary-foreground": "var(--staff-foreground)" } as React.CSSProperties)
          : undefined
      }
    >
      {/* Click-catcher: the page is paused while the tour is on. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-primary transition-all duration-300 ease-out"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 62%, transparent)",
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-foreground/60" />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        aria-live="polite"
        className="cx-pop absolute flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-lg)] outline-none transition-[top,left] duration-300"
        style={{ top, left, width: cardW }}
      >
        <div className="flex items-start gap-3">
          <AriRobot variant="head" size={36} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {i + 1} of {live.length}
            </p>
            <p className="mt-0.5 text-base font-bold leading-snug">{step.title}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        <div aria-hidden className="flex gap-1">
          {live.map((s, n) => (
            <span key={s.spot} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {i >= live.length - 1 ? "Done" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
