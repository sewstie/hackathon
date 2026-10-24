// Component tests for the accessibility-critical primitives: the focus-trapping
// Dialog and the text-plus-color tier Badge. These pin the keyboard and
// screen-reader guarantees the whole app relies on.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

afterEach(() => cleanup());

describe("Badge tier", () => {
  it("renders the tier NAME as text (never color alone)", () => {
    render(<Badge tier="Urgent" />);
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });
});

describe("Dialog", () => {
  it("is a labelled modal dialog when open", () => {
    render(
      <Dialog open onClose={() => {}} title="Heads up">
        <button>Inside</button>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Heads up")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <Dialog open={false} onClose={() => {}} title="Hidden">
        <button>Inside</button>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("focuses the provided initial element on open", () => {
    function Harness() {
      const ref = React.useRef<HTMLButtonElement>(null);
      return (
        <Dialog open onClose={() => {}} title="Emergency" initialFocusRef={ref}>
          <button ref={ref}>Call 911</button>
          <button>Other</button>
        </Dialog>
      );
    }
    render(<Harness />);
    expect(screen.getByText("Call 911")).toHaveFocus();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Esc me">
        <button>Inside</button>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
