"use client";

// Ticket 05 UI — the softer safety-hazard note (NOT a takeover).
//
// When detectSafetyHazard flags a non-active hazard (broken railing, exposed
// wiring, ice on stairs, broken lock, missing extinguisher, chirping detector)
// the report continues normally, but we surface a red note with the campus-
// police number and deliberately show NO quick fixes (you don't band-aid a
// safety hazard — story 29, 52). It's a role="note" so assistive tech
// announces it without hijacking the screen the way the takeover does.
import * as React from "react";

export interface SafetyNoteProps {
  /** Short hazard label from detectSafetyHazard, e.g. "Broken railing". */
  reason: string;
  /** Campus police display name, e.g. "MIT Police". */
  campusPoliceName: string;
  /** Campus police phone, e.g. "617-253-1212". */
  campusPolicePhone: string;
}

export function SafetyNote({ reason, campusPoliceName, campusPolicePhone }: SafetyNoteProps) {
  return (
    <div
      role="note"
      className="flex flex-col gap-1 rounded-[--radius] border-2 border-danger bg-danger/10 p-4 text-sm"
    >
      <p className="font-semibold text-danger">Safety hazard: {reason}</p>
      <p className="text-foreground">
        This looks like a safety hazard. If it&apos;s urgent, contact{" "}
        <strong>{campusPoliceName}</strong> at{" "}
        <a href={`tel:${campusPolicePhone}`} className="font-medium underline underline-offset-2">
          {campusPolicePhone}
        </a>
        . We won&apos;t suggest a do-it-yourself fix for safety issues.
      </p>
    </div>
  );
}
