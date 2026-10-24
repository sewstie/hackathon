// Rendering test for the <Onboarding/> component through its public surface.
// It pins the user-visible contract: the welcome pop-up appears on entry, the
// nudge is NOT shown while the welcome is up (sequenced, never stacked), and
// the nudge appears after the welcome is dismissed and the delay elapses.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import { Onboarding } from "./onboarding";
import { ActiveUserProvider } from "@/components/layout";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  try {
    window.sessionStorage.clear();
  } catch {
    // ignore
  }
});

beforeEach(() => {
  try {
    window.sessionStorage.clear();
  } catch {
    // ignore
  }
});

function renderOnboarding(nudgeDelayMs = 50) {
  return render(
    <ActiveUserProvider>
      <Onboarding nudgeDelayMs={nudgeDelayMs} />
    </ActiveUserProvider>,
  );
}

describe("Onboarding", () => {
  it("shows the welcome pop-up on entry and offers a staff switch", async () => {
    renderOnboarding();
    expect(
      await screen.findByText("You're in the student view"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /switch to staff view/i }),
    ).toBeInTheDocument();
    // The nudge must NOT be stacked on top of the welcome.
    expect(screen.queryByText("Try it yourself")).not.toBeInTheDocument();
  });

  it("shows the try-reporting nudge only after the welcome is dismissed", async () => {
    renderOnboarding(50);
    const welcome = await screen.findByText("You're in the student view");
    expect(welcome).toBeInTheDocument();

    // Dismiss the welcome.
    fireEvent.click(screen.getByRole("button", { name: /keep exploring/i }));
    await waitFor(() =>
      expect(
        screen.queryByText("You're in the student view"),
      ).not.toBeInTheDocument(),
    );

    // After the delay, the nudge appears — and the welcome is gone.
    expect(await screen.findByText("Try it yourself")).toBeInTheDocument();
    expect(
      screen.queryByText("You're in the student view"),
    ).not.toBeInTheDocument();
  });

  it("does not re-onboard when the session is already marked seen", async () => {
    try {
      window.sessionStorage.setItem("unifix.onboarding.seen", "1");
    } catch {
      // if storage is unavailable this test is a no-op guarantee; skip body
      return;
    }
    renderOnboarding();
    // Give effects a tick; nothing onboarding-related should appear.
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen.queryByText("You're in the student view"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Try it yourself")).not.toBeInTheDocument();
  });
});
