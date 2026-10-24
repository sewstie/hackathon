// Component test for the names-a-person block dialog (ticket 06).
//
// The dialog is the public-path guard's UI: it shows the EXACT block copy and
// offers exactly two ways forward — Rephrase and Send privately. It is a
// labelled modal (focus moves to Rephrase on open). Covers F8-block, case 5.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { NAMES_PERSON_BLOCK_MESSAGE } from "@/modules/reporting";

import { NamesPersonBlock } from "./names-person-block";

afterEach(() => cleanup());

describe("NamesPersonBlock", () => {
  it("shows the exact block copy and both actions", () => {
    render(
      <NamesPersonBlock open onRephrase={() => {}} onSendPrivately={() => {}} />,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText(NAMES_PERSON_BLOCK_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /rephrase/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send privately/i }),
    ).toBeInTheDocument();
  });

  it("moves focus to Rephrase on open (keyboard accessible)", () => {
    render(
      <NamesPersonBlock open onRephrase={() => {}} onSendPrivately={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /rephrase/i })).toHaveFocus();
  });

  it("Rephrase calls onRephrase; Send privately calls onSendPrivately", () => {
    const onRephrase = vi.fn();
    const onSendPrivately = vi.fn();
    render(
      <NamesPersonBlock
        open
        onRephrase={onRephrase}
        onSendPrivately={onSendPrivately}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /rephrase/i }));
    expect(onRephrase).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /send privately/i }));
    expect(onSendPrivately).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <NamesPersonBlock
        open={false}
        onRephrase={() => {}}
        onSendPrivately={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
