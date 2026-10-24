// Rendering test for the <Onboarding/> component through its public surface.
// It pins the user-visible contract: each demo view announces itself with a
// welcome pop-up, the student nudge is NOT shown while the welcome is up
// (sequenced, never stacked) and appears after it is dismissed, the staff view
// never nudges, and the explainer site shows nothing.

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
import { ActiveUserProvider, type DemoView } from "@/components/layout";

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

function renderOnboarding(nudgeDelayMs = 50, view: DemoView = "student") {
  return render(
    <ActiveUserProvider>
      <Onboarding nudgeDelayMs={nudgeDelayMs} view={view} />
    </ActiveUserProvider>,
  );
}

describe("Onboarding", () => {
  it("shows the student-view welcome on entry and offers the staff view", async () => {
    renderOnboarding();
    expect(await screen.findByText("You're in the student view")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /switch to staff view/i })).toHaveAttribute(
      "href",
      "/staff",
    );
    // The nudge must NOT be stacked on top of the welcome.
    expect(screen.queryByText("Try it yourself")).not.toBeInTheDocument();
  });

  it("asks to report an incident only after the welcome is dismissed", async () => {
    renderOnboarding(50);
    await screen.findByText("You're in the student view");
    fireEvent.click(screen.getByRole("button", { name: /keep exploring/i }));
    await waitFor(() =>
      expect(screen.queryByText("You're in the student view")).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("Try it yourself")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /report an incident/i })).toHaveAttribute(
      "href",
      "/report",
    );
  });

  it("shows its own welcome in the staff view and never nudges there", async () => {
    renderOnboarding(20, "staff");
    expect(await screen.findByText("You're in the staff view")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to student view/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /got it/i }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(screen.queryByText("Try it yourself")).not.toBeInTheDocument();
  });

  it("shows nothing on the explainer site", async () => {
    renderOnboarding(20, "landing");
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not re-onboard when the session is already marked seen", async () => {
    try {
      window.sessionStorage.setItem("unifix.onboarding.seen", "1");
    } catch {
      return;
    }
    renderOnboarding();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("You're in the student view")).not.toBeInTheDocument();
    expect(screen.queryByText("Try it yourself")).not.toBeInTheDocument();
  });
});
