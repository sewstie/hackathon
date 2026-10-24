// Tests exercise the reporting module through its PUBLIC INTERFACE only
// (index.ts), per ticket 03 and the spec's testing decisions. No network and no
// cloud: the AI model is a MockLanguageModelV4 seam and data goes through the
// deterministic in-memory store.
//
// The flow proven here is the core public report: classify -> confirm (with an
// edit) -> file. Plus the photo path: a failing uploader never blocks filing.
import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import type { LanguageModel } from "ai";

import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";

import { classifyReport, fileReport, type ReportDraft } from "../index";

// --- mock model helpers (mirrors the ai module's test seam) -----------------
type MockConstructorArg = NonNullable<
  ConstructorParameters<typeof MockLanguageModelV4>[0]
>;
type DoGenerateFn = Extract<MockConstructorArg["doGenerate"], (...a: never[]) => unknown>;
type GenerateResult = Awaited<ReturnType<DoGenerateFn>>;

function textResult(text: string): GenerateResult {
  return {
    content: [{ type: "text", text }],
    finishReason: "stop",
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    warnings: [],
  } as unknown as GenerateResult;
}

function modelReturning(obj: Record<string, unknown>): LanguageModel {
  return new MockLanguageModelV4({
    doGenerate: async () => textResult(JSON.stringify(obj)),
  });
}

const ICE_CREAM = {
  category: "Dining",
  item: "ice cream machine",
  title: "Ice cream machine is broken",
  tier: "Medium",
  missingDetails: ["location"],
  namesPerson: false,
  rejected: false,
  rejectionReason: null,
  suggestedOffice: null,
} as const;

describe("reporting — classifyReport produces an editable draft", () => {
  it("turns free text into a draft with category/item/title/tier", async () => {
    const draft = await classifyReport(
      { text: "the ice cream machine is broken again" },
      { model: modelReturning(ICE_CREAM) },
    );

    expect(draft.category).toBe("Dining");
    expect(draft.item).toBe("ice cream machine");
    expect(draft.title).toBe("Ice cream machine is broken");
    expect(draft.tier).toBe("Medium");
    // The raw text is preserved so the UI can re-validate / re-submit.
    expect(draft.text).toContain("ice cream machine");
    // Location starts empty (a follow-up detail, ticket 04).
    expect(draft.location).toBe("");
  });

  it("still returns a usable draft when the AI is unavailable (fallback)", async () => {
    const failing = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("AI down");
      },
    });
    const draft = await classifyReport(
      { text: "the vending machine ate my money" },
      { model: failing },
    );
    expect(draft.tier).toBe("Medium");
    expect(draft.title.length).toBeGreaterThan(0);
  });
});

describe("reporting — fileReport posts a public report via the store", () => {
  it("creates a report from the (optionally edited) draft and confirms the team", async () => {
    const store = new InMemoryStore();
    const base = await classifyReport(
      { text: "the ice cream machine is broken again" },
      { model: modelReturning(ICE_CREAM) },
    );

    // The student edits the category and fills the location on the confirm card.
    const edited: ReportDraft = {
      ...base,
      category: "Dining",
      location: "Stratton Student Center (W20), Lobdell Dining",
    };

    const result = await fileReport(edited, {
      store,
      reporterId: "user-ana",
      campusId: MIT_CAMPUS_ID,
    });

    expect(result.report.id).toBeTruthy();
    expect(result.report.category).toBe("Dining");
    expect(result.report.title).toBe("Ice cream machine is broken");
    expect(result.report.location).toBe("Stratton Student Center (W20), Lobdell Dining");
    expect(result.report.reporterId).toBe("user-ana");
    // Confirmation copy names the team the report was sent to.
    expect(result.confirmation).toBe(
      "Sent to Dining. We'll let you know when it changes.",
    );
    expect(result.photoAttached).toBe(false);

    // It is actually persisted and readable back through the store.
    const stored = await store.getReport(result.report.id);
    expect(stored?.title).toBe("Ice cream machine is broken");

    // The reporter counts as signed (the store adds the reporter's co-sign).
    const signers = await store.countSigners(result.report.id);
    expect(signers).toBe(1);
  });

  it("respects a changed category when filing", async () => {
    const store = new InMemoryStore();
    const base = await classifyReport(
      { text: "the ice cream machine is broken again" },
      { model: modelReturning(ICE_CREAM) },
    );
    const result = await fileReport(
      { ...base, category: "Facilities", location: "Building 10" },
      { store, reporterId: "user-ben", campusId: MIT_CAMPUS_ID },
    );
    expect(result.report.category).toBe("Facilities");
    expect(result.confirmation).toBe(
      "Sent to Facilities. We'll let you know when it changes.",
    );
  });
});

describe("reporting — photo upload never blocks filing", () => {
  it("attaches the photo URL when the uploader succeeds", async () => {
    const store = new InMemoryStore();
    const base = await classifyReport(
      { text: "broken ice cream machine" },
      { model: modelReturning(ICE_CREAM) },
    );
    const result = await fileReport(
      { ...base, location: "W20" },
      {
        store,
        reporterId: "user-ana",
        campusId: MIT_CAMPUS_ID,
        photo: new Blob(["img"], { type: "image/png" }),
        uploadPhoto: async () => "https://cdn.example.com/photo.png",
      },
    );
    expect(result.photoAttached).toBe(true);
    expect(result.report.photoUrl).toBe("https://cdn.example.com/photo.png");
  });

  it("files anyway (no photo) and tells the user when the uploader fails", async () => {
    const store = new InMemoryStore();
    const base = await classifyReport(
      { text: "broken ice cream machine" },
      { model: modelReturning(ICE_CREAM) },
    );
    const result = await fileReport(
      { ...base, location: "W20" },
      {
        store,
        reporterId: "user-ana",
        campusId: MIT_CAMPUS_ID,
        photo: new Blob(["img"], { type: "image/png" }),
        uploadPhoto: async () => {
          throw new Error("storage unavailable");
        },
      },
    );
    // The report still exists...
    expect(result.report.id).toBeTruthy();
    expect(result.report.photoUrl).toBeUndefined();
    // ...and the caller is told the photo didn't attach.
    expect(result.photoAttached).toBe(false);
    expect(result.photoError).toBe(true);

    const stored = await store.getReport(result.report.id);
    expect(stored?.photoUrl).toBeUndefined();
  });
});
