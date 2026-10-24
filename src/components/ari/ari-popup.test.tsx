// Behavior test for Ari's post-classification popup (Track-C component).
// The shell is presentational; this pins the popup's history line, quick-fix
// list, and the two deflection actions ("That fixed it" / "Still broken").

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AriPopup } from "./ari-popup";
import type { QuickFix } from "@/types";

afterEach(() => cleanup());

const wifiFixes: QuickFix[] = [
  {
    id: "qf-wifi-1",
    campusId: "mit",
    category: "IT",
    item: "wifi",
    text: "Forget the MIT network and reconnect.",
  },
];

describe("AriPopup", () => {
  it("shows the message, history line, and quick fixes", () => {
    render(
      <AriPopup
        message="Hi, I'm Ari."
        historyLine="9 similar reports this semester · usually fixed in ~3 days"
        quickFixes={wifiFixes}
        onThatFixedIt={() => {}}
        onStillBroken={() => {}}
      />,
    );
    expect(screen.getByText("Hi, I'm Ari.")).toBeInTheDocument();
    expect(
      screen.getByText(/9 similar reports this semester/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Forget the MIT network and reconnect/),
    ).toBeInTheDocument();
  });

  it("fires the deflection callbacks when their buttons are tapped", () => {
    const onThatFixedIt = vi.fn();
    const onStillBroken = vi.fn();
    render(
      <AriPopup
        message="Hi, I'm Ari."
        historyLine="First report like this here."
        quickFixes={wifiFixes}
        onThatFixedIt={onThatFixedIt}
        onStillBroken={onStillBroken}
      />,
    );
    fireEvent.click(screen.getByText("That fixed it"));
    fireEvent.click(screen.getByText("Still broken — file it"));
    expect(onThatFixedIt).toHaveBeenCalledTimes(1);
    expect(onStillBroken).toHaveBeenCalledTimes(1);
  });

  it("hides the 'That fixed it' action when there are no quick fixes", () => {
    render(
      <AriPopup
        message="Hi, I'm Ari."
        historyLine="First report like this here."
        quickFixes={[]}
        onThatFixedIt={() => {}}
        onStillBroken={() => {}}
      />,
    );
    expect(screen.queryByText("That fixed it")).not.toBeInTheDocument();
    expect(screen.getByText("Still broken — file it")).toBeInTheDocument();
  });
});
