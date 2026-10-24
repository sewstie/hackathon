// Pure sequencing logic for the demo onboarding: a small state machine that
// guarantees the welcome pop-up and the "try reporting" nudge are shown ONE AT
// A TIME, in order, each at most once per session. It owns no React, no DOM and
// no timers, so it is unit-testable in isolation; the <Onboarding/> component
// drives it from effects (mount → welcome, timer/scroll → nudge) and renders
// whatever `visibleStep` it reports.

/** Which onboarding surface, if any, is currently on screen. */
export type OnboardingStep = "welcome" | "nudge" | "none";

/** The sequenced onboarding state. At most one step is ever visible. */
export interface OnboardingState {
  /** The surface currently shown (never two at once). */
  visibleStep: OnboardingStep;
  /** The welcome pop-up has been shown this session (shown-once guard). */
  welcomeSeen: boolean;
  /** The nudge has been shown this session (shown-once guard). */
  nudgeSeen: boolean;
}

/**
 * Events the component feeds the machine:
 *  - `ENTER`      — landed in the student feed; show the welcome pop-up (once).
 *  - `DISMISS`    — user closed / acted on whatever is currently visible.
 *  - `NUDGE_READY`— the delay elapsed (or the user scrolled) → show the nudge,
 *                   but only once, and never while the welcome is still up.
 */
export type OnboardingEvent =
  | { type: "ENTER" }
  | { type: "DISMISS" }
  | { type: "NUDGE_READY" };

/** Fresh session state: nothing shown, nothing seen yet. */
export function initialOnboardingState(): OnboardingState {
  return { visibleStep: "none", welcomeSeen: false, nudgeSeen: false };
}

/**
 * The reducer. Invariants it maintains:
 *  1. `visibleStep` is only ever one surface — the two never stack.
 *  2. Each surface is shown at most once per session (the `*Seen` guards).
 *  3. The nudge is sequenced AFTER the welcome: a `NUDGE_READY` that arrives
 *     while the welcome is still visible is deferred (no-op on visibility) and
 *     only resolves once the welcome has been dismissed.
 */
export function onboardingReducer(
  state: OnboardingState,
  event: OnboardingEvent,
): OnboardingState {
  switch (event.type) {
    case "ENTER": {
      // Show the welcome only on the first entry of the session.
      if (state.welcomeSeen) return state;
      return { ...state, visibleStep: "welcome", welcomeSeen: true };
    }

    case "DISMISS": {
      // Closing whatever is up returns us to a calm, empty screen.
      if (state.visibleStep === "none") return state;
      return { ...state, visibleStep: "none" };
    }

    case "NUDGE_READY": {
      // Never twice.
      if (state.nudgeSeen) return state;
      // Never while the welcome is still on screen — stay as-is; the next
      // NUDGE_READY (re-fired after dismissal) will land it.
      if (state.visibleStep === "welcome") return state;
      return { ...state, visibleStep: "nudge", nudgeSeen: true };
    }

    default:
      return state;
  }
}

/** True once both surfaces have been shown — the session's onboarding is done. */
export function onboardingComplete(state: OnboardingState): boolean {
  return state.welcomeSeen && state.nudgeSeen;
}
