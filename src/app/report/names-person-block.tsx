"use client";

// Ticket 06 UI — the names-a-person block dialog (public path only).
//
// When a PUBLIC submission is flagged for naming a specific person, the report
// is blocked and NOTHING is persisted. This dialog states the exact reason and
// offers the only two ways forward:
//   - Rephrase: return to the preserved text and re-validate.
//   - Send privately: carry the same text into the Private tab (allowed to
//     name people).
// It is an accessible modal (focus trapped, labelled) built on the shared
// Dialog primitive. Escape / backdrop close it as "Rephrase" (the safe default
// that keeps the student's text), never as a silent persist.
import * as React from "react";

import { Button, Dialog } from "@/components/ui";
import { NAMES_PERSON_BLOCK_MESSAGE } from "@/modules/reporting";

export interface NamesPersonBlockProps {
  open: boolean;
  /** Return to the preserved text and re-validate. Also the Escape/backdrop path. */
  onRephrase: () => void;
  /** Carry the text into the Private tab (the private path may name people). */
  onSendPrivately: () => void;
}

export function NamesPersonBlock({
  open,
  onRephrase,
  onSendPrivately,
}: NamesPersonBlockProps) {
  const rephraseRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      onClose={onRephrase}
      title="This can't be reported publicly"
      description={NAMES_PERSON_BLOCK_MESSAGE}
      initialFocusRef={rephraseRef}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button ref={rephraseRef} variant="secondary" onClick={onRephrase}>
          Rephrase
        </Button>
        <Button onClick={onSendPrivately}>Send privately</Button>
      </div>
    </Dialog>
  );
}
