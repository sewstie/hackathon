"use client";

import * as React from "react";
import { PrivateInboxHint } from "@/components/onboarding";

/** Shows the private-inbox explainer each time this page is opened. */
export function PrivateInboxGate() {
  const [open, setOpen] = React.useState(true);
  return <PrivateInboxHint open={open} onClose={() => setOpen(false)} />;
}
