// Tests exercise the ai module through its PUBLIC INTERFACE only (index.ts).
//
// Two behaviours are proven here, per ticket 02 and the spec's testing decisions:
//   1. Happy path  — a classification is produced from the model via the
//      language-model seam, using MockLanguageModelV4 (no network).
//   2. Fallback     — on a missing key / model error / timeout, the module falls
//      through to a pure keyword classifier (safe default category + Medium
//      tier, result marked source:"fallback"). This is demo case 16.
import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import type { LanguageModel } from "ai";

import { classify, type Classification } from "../index";

// The exact result shape the installed MockLanguageModelV4 expects from a
// non-streaming doGenerate. Derived from the constructor so it tracks whatever
// @ai-sdk version is installed (no hardcoded provider-type import to drift).
type MockConstructorArg = NonNullable<
  ConstructorParameters<typeof MockLanguageModelV4>[0]
>;
type DoGenerateFn = Extract<MockConstructorArg["doGenerate"], (...a: never[]) => unknown>;
type GenerateResult = Awaited<ReturnType<DoGenerateFn>>;

/** A correctly-typed non-streaming generate result that emits `text`. */
function textResult(text: string): GenerateResult {
  return {
    content: [{ type: "text", text }],
    finishReason: "stop",
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    warnings: [],
  } as unknown as GenerateResult;
}

/** Build a mock model that returns `obj` as the generated JSON object. */
function modelReturning(obj: Record<string, unknown>): LanguageModel {
  return new MockLanguageModelV4({
    doGenerate: async () => textResult(JSON.stringify(obj)),
  });
}

/** Build a mock model whose generation always throws (simulates AI down). */
function modelThatFails(): LanguageModel {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw new Error("simulated AI failure");
    },
  });
}

describe("ai classify — happy path (model via mock seam)", () => {
  it("returns the model's structured classification marked source:ai", async () => {
    const model = modelReturning({
      category: "Dining",
      item: "ice cream machine",
      title: "Ice cream machine is broken",
      tier: "Medium",
      missingDetails: ["location"],
      namesPerson: false,
      rejected: false,
      rejectionReason: null,
      suggestedOffice: null,
    });

    const result: Classification = await classify(
      { text: "the ice cream machine is broken again" },
      { model },
    );

    expect(result.source).toBe("ai");
    expect(result.category).toBe("Dining");
    expect(result.item).toBe("ice cream machine");
    expect(result.title).toBe("Ice cream machine is broken");
    expect(result.tier).toBe("Medium");
    expect(result.missingDetails).toEqual(["location"]);
    expect(result.namesPerson).toBe(false);
    expect(result.rejected).toBe(false);
  });

  it("surfaces suggestedOffice in private mode", async () => {
    const model = modelReturning({
      category: "Housing",
      item: "roommate conflict",
      title: "Roommate leaves the door unlocked",
      tier: "Medium",
      missingDetails: [],
      namesPerson: true,
      rejected: false,
      rejectionReason: null,
      suggestedOffice: "Housing",
    });

    const result = await classify(
      { text: "my roommate keeps leaving our door unlocked", mode: "private" },
      { model },
    );

    expect(result.source).toBe("ai");
    expect(result.suggestedOffice).toBe("Housing");
  });
});

describe("ai classify — fallback (AI unavailable / error / timeout)", () => {
  it("falls through to the keyword classifier when the model throws", async () => {
    const result = await classify(
      { text: "the vending machine ate my money" },
      { model: modelThatFails() },
    );

    expect(result.source).toBe("fallback");
    // Safe defaults: a real category guess, Medium tier, not rejected.
    expect(result.tier).toBe("Medium");
    expect(result.rejected).toBe(false);
    expect(typeof result.title).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
  });

  it("falls back (no network) when no model is provided and no key is set", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await classify({ text: "broken heater in my dorm room" });
      expect(result.source).toBe("fallback");
      expect(result.tier).toBe("Medium");
    } finally {
      if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
    }
  });

  it("falls back when the model exceeds the timeout", async () => {
    const slow = new MockLanguageModelV4({
      doGenerate: async () => {
        await new Promise((r) => setTimeout(r, 50));
        return textResult("{}");
      },
    });

    const result = await classify(
      { text: "wifi keeps dropping in the library" },
      { model: slow, timeoutMs: 1 },
    );

    expect(result.source).toBe("fallback");
  });
});

describe("ai classify — keyword fallback signals", () => {
  it("flags a person-naming public report via the honorific fallback", async () => {
    const result = await classify(
      { text: "Professor Smith yelled at me in the hallway" },
      { model: modelThatFails() },
    );

    expect(result.source).toBe("fallback");
    expect(result.namesPerson).toBe(true);
  });

  it("routes an off-campus issue to the City category in fallback", async () => {
    const result = await classify(
      { text: "there is a huge pothole on the public street outside" },
      { model: modelThatFails() },
    );

    expect(result.source).toBe("fallback");
    expect(result.category).toBe("City");
  });

  it("defaults the suggested office to Dean of Students in private fallback", async () => {
    const result = await classify(
      { text: "something happened and I need to talk to someone", mode: "private" },
      { model: modelThatFails() },
    );

    expect(result.source).toBe("fallback");
    expect(result.suggestedOffice).toBe("Dean of Students");
  });
});
