// Persona test for Ari's shared identity surface (ticket 09).
// Pins the consistent name "Ari", the presence of a friendly avatar, and the
// warm chat-style framing — the presentation-only persona alignment. Behavior
// (history, quick fixes, emergency takeover) is covered elsewhere and must be
// untouched by the persona work.

import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AriShell } from "./ari-shell";
import { AriAvatar, ARI_NAME } from "./ari-avatar";

afterEach(() => cleanup());

describe("Ari persona", () => {
  it("exposes the consistent name 'Ari'", () => {
    expect(ARI_NAME).toBe("Ari");
  });

  it("AriAvatar renders an accessible named avatar when given a label", () => {
    render(<AriAvatar label={ARI_NAME} />);
    expect(screen.getByRole("img", { name: "Ari" })).toBeInTheDocument();
  });

  it("AriShell shows Ari's name and its message", () => {
    render(<AriShell message="Hi there — how can I help?" />);
    // The name is shown as persistent, visible identity (not only in copy).
    expect(screen.getByText("Ari")).toBeInTheDocument();
    expect(
      screen.getByText("Hi there — how can I help?"),
    ).toBeInTheDocument();
  });

  it("AriShell still renders children (history line / quick fixes slot)", () => {
    render(
      <AriShell message="Hi">
        <p>9 similar reports this semester</p>
      </AriShell>,
    );
    expect(
      screen.getByText(/9 similar reports this semester/),
    ).toBeInTheDocument();
  });
});
