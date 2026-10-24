// Tests exercise the emergency module through its PUBLIC INTERFACE only
// (index.ts). The two detectors are PURE (no network, no AI, no clock) so the
// safety path is instant on submit and never depends on the AI being up.
//
// Covers ticket 05: detectEmergency (full-screen takeover trigger),
// detectSafetyHazard (softer red note), and the audit requirement that every
// Call 911 / Campus Police tap is logged through the store seam.
import { describe, expect, it } from "vitest";

import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";

import {
  detectEmergency,
  detectSafetyHazard,
  logEmergencyCall,
  type EmergencyDetection,
} from "../index";

describe("emergency — detectEmergency (pure, instant, pre-network)", () => {
  it("raises on active life-threatening text with a one-line reason", () => {
    const result: EmergencyDetection = detectEmergency(
      "there's a fire in the stairwell and smoke everywhere",
    );
    expect(result.isEmergency).toBe(true);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it.each([
    "someone is having a heart attack in the lobby",
    "a person collapsed and isn't breathing",
    "there is an active shooter on campus",
    "I'm being assaulted right now",
    "someone is bleeding badly and won't stop",
    "there's a gas leak filling the room",
  ])("raises on %s", (text) => {
    expect(detectEmergency(text).isEmergency).toBe(true);
  });

  it("does NOT raise on an ordinary broken-thing report", () => {
    expect(detectEmergency("the ice cream machine is broken again").isEmergency).toBe(
      false,
    );
    expect(detectEmergency("wifi keeps dropping in the library").isEmergency).toBe(
      false,
    );
  });

  it("is case-insensitive and tolerant of punctuation", () => {
    expect(detectEmergency("FIRE!! in building 10").isEmergency).toBe(true);
  });
});

describe("emergency — detectSafetyHazard (softer, non-takeover)", () => {
  it.each([
    "the handrail on the stairs is broken",
    "there is exposed wiring near the outlet",
    "ice on the stairs outside the dorm",
    "the door lock is broken",
    "the fire extinguisher is missing from the hallway",
    "the smoke detector keeps chirping",
  ])("flags a non-active hazard: %s", (text) => {
    expect(detectSafetyHazard(text).isHazard).toBe(true);
  });

  it("does NOT flag an ordinary report", () => {
    expect(detectSafetyHazard("the vending machine ate my money").isHazard).toBe(
      false,
    );
  });

  it("does NOT double-fire as an active emergency (it's the softer path)", () => {
    // A broken railing is a hazard note, not a full-screen takeover.
    const text = "the handrail on the stairs is broken";
    expect(detectSafetyHazard(text).isHazard).toBe(true);
    expect(detectEmergency(text).isEmergency).toBe(false);
  });
});

describe("emergency — logEmergencyCall writes an audit row", () => {
  it("logs a Call 911 tap through the store's access log", async () => {
    const store = new InMemoryStore();
    await logEmergencyCall({
      store,
      actorId: "user-ana",
      kind: "call-911",
    });
    const log = await store.listAccessLog("emergency");
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe("call-911");
    expect(log[0].actorId).toBe("user-ana");
  });

  it("logs a Call Campus Police tap", async () => {
    const store = new InMemoryStore();
    await logEmergencyCall({
      store,
      actorId: "user-ben",
      kind: "call-campus-police",
      reportId: "report-123",
    });
    const log = await store.listAccessLog("report-123");
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe("call-campus-police");
  });
});

// A tiny guard so the MIT_CAMPUS_ID import stays meaningful if the module grows.
describe("emergency — campus constant is reachable for callers", () => {
  it("exposes the demo campus id from the store seam", () => {
    expect(MIT_CAMPUS_ID).toBe("mit");
  });
});
