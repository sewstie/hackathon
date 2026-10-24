import { describe, expect, it } from "vitest";
import {
  PENALTY_UNCONFIRMED_HIGH,
  SEVERITY_WEIGHT,
  orderByPriority,
  priorityScore,
  tierPresentation,
} from "../index";
import type { PrioritizableReport } from "../index";

// A compact factory for the priority inputs. Only the fields the ordering rule
// reads are modeled — the module is a pure function over this shape, so tests
// stay deterministic and need no store or cloud.
function report(
  overrides: Partial<PrioritizableReport> & Pick<PrioritizableReport, "id">,
): PrioritizableReport {
  return {
    tier: "Medium",
    signers: 0,
    incomplete: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("priorityScore", () => {
  it("weights severity far above popularity", () => {
    // High(200)+4 = 204 beats Medium(100)+9 = 109 (the prototype rule).
    const high = report({ id: "h", tier: "High", signers: 4 });
    const medium = report({ id: "m", tier: "Medium", signers: 9 });
    expect(priorityScore(high)).toBe(204);
    expect(priorityScore(medium)).toBe(109);
    expect(priorityScore(high)).toBeGreaterThan(priorityScore(medium));
  });

  it("caps the signer contribution at 90", () => {
    const a = report({ id: "a", tier: "Medium", signers: 90 });
    const b = report({ id: "b", tier: "Medium", signers: 9999 });
    expect(priorityScore(a)).toBe(SEVERITY_WEIGHT.Medium + 90);
    expect(priorityScore(b)).toBe(priorityScore(a));
  });

  it("penalizes an unconfirmed/incomplete High so demand can correct it", () => {
    const incompleteHigh = report({
      id: "ih",
      tier: "High",
      signers: 0,
      incomplete: true,
    });
    expect(priorityScore(incompleteHigh)).toBe(
      SEVERITY_WEIGHT.High - PENALTY_UNCONFIRMED_HIGH,
    );
  });

  it("only penalizes High (not other tiers) when incomplete", () => {
    const incompleteMedium = report({
      id: "im",
      tier: "Medium",
      signers: 5,
      incomplete: true,
    });
    expect(priorityScore(incompleteMedium)).toBe(SEVERITY_WEIGHT.Medium + 5);
  });
});

describe("orderByPriority", () => {
  it("ranks a High (4 signers) above a Medium (9 signers)", () => {
    const high = report({ id: "high", tier: "High", signers: 4 });
    const medium = report({ id: "medium", tier: "Medium", signers: 9 });
    const ordered = orderByPriority([medium, high]);
    expect(ordered.map((r) => r.id)).toEqual(["high", "medium"]);
  });

  it("lets a very popular Medium overtake an unconfirmed High", () => {
    // incomplete High(200-30)=170 < Medium(100+90)=190.
    const incompleteHigh = report({
      id: "ih",
      tier: "High",
      signers: 0,
      incomplete: true,
    });
    const popularMedium = report({ id: "pm", tier: "Medium", signers: 90 });
    const ordered = orderByPriority([incompleteHigh, popularMedium]);
    expect(ordered.map((r) => r.id)).toEqual(["pm", "ih"]);
  });

  it("always puts Urgent first regardless of signer counts", () => {
    const urgent = report({ id: "u", tier: "Urgent", signers: 0 });
    const popularHigh = report({ id: "ph", tier: "High", signers: 90 });
    const ordered = orderByPriority([popularHigh, urgent]);
    expect(ordered[0].id).toBe("u");
  });

  it("orders multiple Urgents among themselves by score then oldest-first", () => {
    const urgentOld = report({
      id: "uo",
      tier: "Urgent",
      signers: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const urgentNewPopular = report({
      id: "unp",
      tier: "Urgent",
      signers: 10,
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    const ordered = orderByPriority([urgentOld, urgentNewPopular]);
    // Higher score first (more signers), both Urgent.
    expect(ordered.map((r) => r.id)).toEqual(["unp", "uo"]);
  });

  it("breaks ties oldest-first", () => {
    const older = report({
      id: "older",
      tier: "Medium",
      signers: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = report({
      id: "newer",
      tier: "Medium",
      signers: 5,
      createdAt: "2026-03-01T00:00:00.000Z",
    });
    const ordered = orderByPriority([newer, older]);
    expect(ordered.map((r) => r.id)).toEqual(["older", "newer"]);
  });

  it("respects a staff tier override by using the effective tier", () => {
    // A Low report staff-overrode to Urgent must lead.
    const overridden = report({
      id: "ov",
      tier: "Low",
      signers: 0,
      tierOverride: "Urgent",
    });
    const high = report({ id: "high", tier: "High", signers: 50 });
    const ordered = orderByPriority([high, overridden]);
    expect(ordered[0].id).toBe("ov");
  });

  it("does not mutate the input array", () => {
    const input = [
      report({ id: "a", tier: "Low" }),
      report({ id: "b", tier: "Urgent" }),
    ];
    const snapshot = input.map((r) => r.id);
    orderByPriority(input);
    expect(input.map((r) => r.id)).toEqual(snapshot);
  });
});

describe("tierPresentation", () => {
  it("exposes text + a token-based color for every tier (never color-only)", () => {
    for (const tier of ["Low", "Medium", "High", "Urgent"] as const) {
      const p = tierPresentation(tier);
      expect(p.label).toBe(tier);
      // Accessible: a text label always accompanies the color token.
      expect(p.label.length).toBeGreaterThan(0);
      // Color is a CSS variable token, not a hardcoded hex.
      expect(p.colorVar).toMatch(/^var\(--/);
    }
  });

  it("honors a staff override when presenting the effective tier", () => {
    const r = report({ id: "x", tier: "Low", tierOverride: "High" });
    expect(tierPresentation(r).label).toBe("High");
  });
});
