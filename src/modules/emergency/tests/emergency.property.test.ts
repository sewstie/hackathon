// Property-based tests (fast-check) for the safety rules: wrapping a known
// emergency phrase in ANY surrounding text must still raise the takeover, and
// the detectors must never throw on arbitrary input.
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { detectEmergency, detectSafetyHazard } from "@/modules/emergency";

const EMERGENCIES = [
  "someone collapsed",
  "there's a fire",
  "somebody got stabbed",
  "he is not breathing",
  "i want to kill myself",
  "it smells like gas",
  "two people are trapped in the elevator",
  "someone has a gun",
  "she is having a seizure",
];

// Filler that can't accidentally contain a keyword: lowercase words from a
// small neutral vocabulary.
const filler = fc
  .array(fc.constantFrom("the", "near", "room", "today", "please", "hurry", "by", "library", "dorm", "3rd", "floor", "and"), {
    maxLength: 8,
  })
  .map((w) => w.join(" "));

describe("emergency detection — properties", () => {
  it("an emergency phrase is caught whatever text surrounds it, in any letter case", () => {
    fc.assert(
      fc.property(fc.constantFrom(...EMERGENCIES), filler, filler, fc.boolean(), (phrase, before, after, upper) => {
        const text = `${before} ${upper ? phrase.toUpperCase() : phrase} ${after}`;
        expect(detectEmergency(text).isEmergency).toBe(true);
      }),
      { numRuns: 2000 },
    );
  });

  it("the detectors never throw and always return a reason when they fire", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (text) => {
        const e = detectEmergency(text);
        const h = detectSafetyHazard(text);
        if (e.isEmergency) expect(e.reason.length).toBeGreaterThan(0);
        if (h.isHazard) expect(h.reason.length).toBeGreaterThan(0);
        // An emergency is handled by the takeover, never also as a softer hazard note.
        expect(e.isEmergency && h.isHazard).toBe(false);
      }),
      { numRuns: 2000 },
    );
  });
});
