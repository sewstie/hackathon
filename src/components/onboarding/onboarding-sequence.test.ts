// Tests for the onboarding sequence — the pure state machine behind the demo's
// welcome pop-up and try-reporting nudge. These assert the externally-visible
// guarantees the spec cares about:
//   - the welcome shows once per session,
//   - the nudge shows once per session,
//   - the two NEVER appear at the same time (sequenced, not stacked).

import { describe, expect, it } from "vitest";
import {
  initialOnboardingState,
  onboardingReducer,
  onboardingComplete,
  type OnboardingState,
  type OnboardingEvent,
} from "./onboarding-sequence";

/** Replay a list of events from the initial state. */
function run(events: OnboardingEvent[]): OnboardingState {
  return events.reduce(onboardingReducer, initialOnboardingState());
}

describe("onboardingReducer", () => {
  it("starts with nothing shown", () => {
    const s = initialOnboardingState();
    expect(s.visibleStep).toBe("none");
    expect(onboardingComplete(s)).toBe(false);
  });

  it("shows the welcome pop-up on entry", () => {
    const s = run([{ type: "ENTER" }]);
    expect(s.visibleStep).toBe("welcome");
    expect(s.welcomeSeen).toBe(true);
  });

  it("shows the welcome only once per session", () => {
    // Enter, dismiss, enter again → the second entry does not re-open it.
    const s = run([{ type: "ENTER" }, { type: "DISMISS" }, { type: "ENTER" }]);
    expect(s.visibleStep).toBe("none");
  });

  it("shows the nudge after the welcome is dismissed", () => {
    const s = run([
      { type: "ENTER" },
      { type: "DISMISS" },
      { type: "NUDGE_READY" },
    ]);
    expect(s.visibleStep).toBe("nudge");
    expect(s.nudgeSeen).toBe(true);
  });

  it("NEVER stacks the nudge on top of the welcome", () => {
    // Nudge becomes ready while the welcome is still up → welcome stays, no stack.
    const s = run([{ type: "ENTER" }, { type: "NUDGE_READY" }]);
    expect(s.visibleStep).toBe("welcome");
    expect(s.nudgeSeen).toBe(false);
  });

  it("defers an early NUDGE_READY until the welcome is dismissed", () => {
    // Even if the nudge fires early, it lands the moment the welcome closes
    // (the component re-fires NUDGE_READY after dismissal).
    const s = run([
      { type: "ENTER" },
      { type: "NUDGE_READY" }, // deferred — welcome still up
      { type: "DISMISS" }, // close welcome
      { type: "NUDGE_READY" }, // now it lands
    ]);
    expect(s.visibleStep).toBe("nudge");
  });

  it("shows the nudge only once per session", () => {
    const s = run([
      { type: "ENTER" },
      { type: "DISMISS" },
      { type: "NUDGE_READY" },
      { type: "DISMISS" },
      { type: "NUDGE_READY" },
    ]);
    expect(s.visibleStep).toBe("none");
  });

  it("is complete once both surfaces have been shown", () => {
    const s = run([
      { type: "ENTER" },
      { type: "DISMISS" },
      { type: "NUDGE_READY" },
      { type: "DISMISS" },
    ]);
    expect(onboardingComplete(s)).toBe(true);
    expect(s.visibleStep).toBe("none");
  });

  it("dismiss on an empty screen is a no-op", () => {
    const s = run([{ type: "DISMISS" }]);
    expect(s.visibleStep).toBe("none");
  });
});
