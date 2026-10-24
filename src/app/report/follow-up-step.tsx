"use client";

// Ticket 04 UI — the smart follow-up step. Between classification and the
// confirm card, the app asks only the details still missing (location first,
// capped at three), with tap-chips drawn from the seeded campus. "Use my
// location" checks the device against the chosen building; "Type instead" is
// always available. The rules live in the reporting module; this component is
// just the presentation and the browser-geolocation call.
import * as React from "react";

import { AriShell } from "@/components/ari";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import type { Building } from "@/types";
import {
  verifyDeviceLocation,
  type FollowUpPlan,
  type FollowUpQuestion,
} from "@/modules/reporting";
import { getStore } from "@/lib/store";

export interface FollowUpAnswers {
  /** Combined, human-readable location string for the report. */
  location: string;
  /** Resolved building id when a seeded building chip was picked. */
  buildingId?: string;
  /** "Use my location" put the device > 500 m from the chosen building. */
  locationUnverified: boolean;
}

interface FollowUpStepProps {
  plan: FollowUpPlan;
  buildings: Building[];
  campusId: string;
  onDone: (answers: FollowUpAnswers) => void;
}

/** What a report says when it isn't tied to one place. */
export const NO_PLACE = "No specific location (campus-wide)";

export function FollowUpStep({ plan, buildings, campusId, onDone }: FollowUpStepProps) {
  const [index, setIndex] = React.useState(0);
  const [typed, setTyped] = React.useState("");
  const [geoNote, setGeoNote] = React.useState<string | null>(null);

  const answersRef = React.useRef<FollowUpAnswers>({
    location: "",
    buildingId: undefined,
    locationUnverified: false,
  });

  const question: FollowUpQuestion | undefined = plan.questions[index];

  const advance = React.useCallback(() => {
    if (index + 1 >= plan.questions.length) {
      onDone(answersRef.current);
    } else {
      setIndex((i) => i + 1);
      setTyped("");
      setGeoNote(null);
    }
  }, [index, plan.questions.length, onDone]);

  function recordLocation(value: string) {
    const building = buildings.find((b) => b.name === value);
    answersRef.current.location = answersRef.current.location
      ? `${answersRef.current.location}, ${value}`
      : value;
    if (building) answersRef.current.buildingId = building.id;
  }

  function recordDetail(value: string) {
    if (!question) return;
    if (question.detail === "location") {
      recordLocation(value);
    } else {
      answersRef.current.location = answersRef.current.location
        ? `${answersRef.current.location}, ${value}`
        : value;
    }
  }

  function chooseChip(value: string) {
    recordDetail(value);
    advance();
  }

  /**
   * "No specific place": for problems that aren't in one spot (Wi-Fi, an app,
   * a campus-wide outage). Records that, and skips the follow-ups that only
   * make sense for a place (floor, dining hall…), finishing straight away.
   */
  function noSpecificPlace() {
    answersRef.current.location = NO_PLACE;
    answersRef.current.buildingId = undefined;
    onDone(answersRef.current);
  }

  function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    const value = typed.trim();
    if (!value) return;
    recordDetail(value);
    advance();
  }

  function useMyLocation() {
    setGeoNote(null);
    if (!("geolocation" in navigator)) {
      setGeoNote("Your device doesn't support location. Pick a building instead.");
      return;
    }
    setGeoNote("Checking your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const buildingId = answersRef.current.buildingId;
        if (!buildingId) {
          setGeoNote("Pick a building first, then confirm with your location.");
          return;
        }
        const check = await verifyDeviceLocation(
          { store: getStore(), campusId, buildingId },
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        );
        answersRef.current.locationUnverified = check.locationUnverified;
        if (check.locationUnverified) {
          setGeoNote(
            "You seem to be more than 500 m from that building — we'll flag this for staff.",
          );
        } else {
          setGeoNote("Location confirmed.");
        }
      },
      () => setGeoNote("We couldn't read your location. Pick a building instead."),
      // Never wait forever on a permission prompt or a slow GPS fix.
      { timeout: 8000, maximumAge: 60_000 },
    );
  }

  React.useEffect(() => {
    // No questions to ask — finish immediately (effect, not during render).
    if (plan.questions.length === 0) onDone(answersRef.current);
    // Run once per plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  if (!question) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <AriShell message="Just a couple of quick details…" />
      <Card>
        <CardHeader>
          <CardTitle>{question.prompt}</CardTitle>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Question {index + 1} of {plan.questions.length}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {question.chips.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label={question.prompt}>
              {question.chips.map((chip) => (
                <Button
                  key={chip}
                  variant="secondary"
                  type="button"
                  onClick={() => chooseChip(chip)}
                >
                  {chip}
                </Button>
              ))}
            </div>
          ) : null}

          {question.detail === "location" ? (
            <div className="flex flex-col gap-1">
              <Button
                variant="secondary"
                type="button"
                onClick={noSpecificPlace}
                className="w-fit border-dashed"
              >
                <span aria-hidden>🌐</span> No specific place
              </Button>
              <p className="text-xs text-muted-foreground">
                For things that aren&apos;t in one spot — like Wi-Fi, an app, or a campus-wide outage.
              </p>
            </div>
          ) : null}

          {question.useMyLocation ? (
            <div className="flex flex-col gap-1">
              <Button variant="ghost" type="button" onClick={useMyLocation}>
                Use my location
              </Button>
              {geoNote ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {geoNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {question.allowTypeInstead ? (
            <form className="flex items-end gap-2" onSubmit={submitTyped}>
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="followup-typed" className="text-sm font-medium">
                  Type instead
                </label>
                <Input
                  id="followup-typed"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Type your answer"
                />
              </div>
              <Button type="submit" disabled={!typed.trim()}>
                Next
              </Button>
            </form>
          ) : null}

          <div>
            <Button variant="ghost" type="button" onClick={advance}>
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
