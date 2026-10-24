// Component tests for the two safety UI surfaces (ticket 05):
//   - EmergencyTakeover: full-screen, focuses Call 911 on mount, focus-trapped,
//     has Call Campus Police and "Not an emergency — continue my report".
//   - SafetyNote: a softer red note with the campus-police number and NO quick
//     fixes.
// These pin the keyboard-accessibility guarantees (stories 23, 24, 27, 82) and
// the "safety beats everything" wiring.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { EmergencyTakeover } from "./emergency-takeover";
import { SafetyNote } from "./safety-note";

afterEach(() => cleanup());

describe("EmergencyTakeover", () => {
  it("shows the one-line reason and the three safety actions", () => {
    render(
      <EmergencyTakeover
        reason="Possible fire"
        campusPoliceName="MIT Police"
        campusPolicePhone="617-253-1212"
        onContinue={() => {}}
        onCall={() => {}}
      />,
    );
    expect(screen.getByText("Possible fire")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /call 911/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /call .*police|campus police/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /not an emergency/i }),
    ).toBeInTheDocument();
  });

  it("is a labelled modal dialog and focuses Call 911 on mount", () => {
    render(
      <EmergencyTakeover
        reason="Possible medical emergency"
        campusPoliceName="MIT Police"
        campusPolicePhone="617-253-1212"
        onContinue={() => {}}
        onCall={() => {}}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("link", { name: /call 911/i })).toHaveFocus();
  });

  it("Call 911 is a tel: link (never auto-dials) and logs the tap", () => {
    const onCall = vi.fn();
    render(
      <EmergencyTakeover
        reason="Serious injury"
        campusPoliceName="MIT Police"
        campusPolicePhone="617-253-1212"
        onContinue={() => {}}
        onCall={onCall}
      />,
    );
    const call911 = screen.getByRole("link", { name: /call 911/i });
    expect(call911).toHaveAttribute("href", "tel:911");
    fireEvent.click(call911);
    expect(onCall).toHaveBeenCalledWith("call-911");
  });

  it("Call Campus Police dials the campus number and logs the tap", () => {
    const onCall = vi.fn();
    render(
      <EmergencyTakeover
        reason="Possible violence in progress"
        campusPoliceName="MIT Police"
        campusPolicePhone="617-253-1212"
        onContinue={() => {}}
        onCall={onCall}
      />,
    );
    const police = screen.getByRole("link", { name: /call .*police|campus police/i });
    expect(police).toHaveAttribute("href", "tel:617-253-1212");
    fireEvent.click(police);
    expect(onCall).toHaveBeenCalledWith("call-campus-police");
  });

  it("'Not an emergency — continue' calls onContinue (the only dismissal)", () => {
    const onContinue = vi.fn();
    render(
      <EmergencyTakeover
        reason="Possible fire"
        campusPoliceName="MIT Police"
        campusPolicePhone="617-253-1212"
        onContinue={onContinue}
        onCall={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /not an emergency/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe("SafetyNote", () => {
  it("shows the hazard reason and the campus-police number, no quick fixes", () => {
    render(
      <SafetyNote
        reason="Broken railing"
        campusPoliceName="MIT Police"
        campusPolicePhone="617-253-1212"
      />,
    );
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText(/broken railing/i)).toBeInTheDocument();
    expect(screen.getByText(/617-253-1212/)).toBeInTheDocument();
    expect(screen.getByText(/MIT Police/)).toBeInTheDocument();
    expect(screen.queryByText(/quick fix/i)).not.toBeInTheDocument();
  });
});
