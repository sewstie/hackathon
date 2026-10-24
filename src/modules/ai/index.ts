// UniFix AI classification — the module's PUBLIC INTERFACE.
//
// `classify(input)` turns a student's free text into one structured result and
// NEVER blocks the app: it makes a single bounded server-side `generateObject`
// call (Vercel AI SDK + @ai-sdk/anthropic) against one Zod schema, and on a
// missing key / error / timeout it falls through to a pure keyword classifier.
//
// The language model is a SEAM: tests inject a MockLanguageModelV4 via
// `opts.model`; at runtime the model is built from server-only env. Nothing in
// here is exposed to the browser (the API route in src/app/api/classify is the
// only caller from the client side).
import { generateObject, type LanguageModel } from "ai";

import type { Category, Office, Tier } from "@/types";

import { keywordClassify } from "./lib/fallback";
import { defaultModel } from "./lib/model";
import { classificationSchema } from "./lib/schema";

export type ClassifyMode = "public" | "private";

export interface ClassifyInput {
  /** The student's free text (already length-capped by the UI). */
  text: string;
  /** Public (default) hides office routing; private suggests an office. */
  mode?: ClassifyMode;
}

export interface ClassifyOptions {
  /** Inject a model (tests pass a MockLanguageModelV4). Defaults to env model. */
  model?: LanguageModel;
  /** Abort budget for the AI call in ms. Defaults to 6000. */
  timeoutMs?: number;
}

/** The whole classification, plus which path produced it. */
export interface Classification {
  category: Category;
  item: string;
  title: string;
  tier: Tier;
  missingDetails: string[];
  namesPerson: boolean;
  rejected: boolean;
  rejectionReason: string | null;
  /** Private mode only; null in public mode. */
  suggestedOffice: Office | null;
  /** "ai" when the model answered; "fallback" when the keyword path ran. */
  source: "ai" | "fallback";
}

const DEFAULT_TIMEOUT_MS = 6000;

function systemPrompt(mode: ClassifyMode): string {
  return [
    "You classify a college student's free-text report of something broken on campus.",
    "Return one JSON object matching the schema exactly.",
    "category is the best-fit team; use City only for off-campus public issues (potholes, public streetlights, sidewalks).",
    "item is the specific broken thing, lowercased and short. title is a short neutral sentence for staff.",
    "tier is severity: Low, Medium, High, or Urgent (life-safety).",
    "missingDetails lists details still needed (location first), as short labels.",
    "namesPerson is true when the text names or clearly identifies a specific person.",
    "rejected is true for spam, scams, jokes, prizes or money claims, abuse, keyboard noise, or anything that is not a real problem with something on campus; give a short friendly rejectionReason then, else null.",
    mode === "private"
      ? "suggestedOffice is the single office that should receive this private report."
      : "suggestedOffice must be null in public mode.",
  ].join(" ");
}

/**
 * Classify `input.text`. Always resolves — on any AI problem it returns a
 * keyword-based result marked source:"fallback" (demo case 16: AI unavailable
 * still classifies).
 */
export async function classify(
  input: ClassifyInput,
  opts: ClassifyOptions = {},
): Promise<Classification> {
  const mode: ClassifyMode = input.mode ?? "public";
  const model = opts.model ?? defaultModel();

  if (model) {
    try {
      const { object } = await generateObject({
        model,
        schema: classificationSchema,
        system: systemPrompt(mode),
        prompt: input.text,
        abortSignal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });

      // The AI may RAISE but we still normalize public mode to no office.
      const suggestedOffice = mode === "private" ? object.suggestedOffice : null;

      return {
        category: object.category,
        item: object.item,
        title: object.title,
        tier: object.tier,
        missingDetails: object.missingDetails,
        namesPerson: object.namesPerson,
        rejected: object.rejected,
        rejectionReason: object.rejectionReason,
        suggestedOffice,
        source: "ai",
      };
    } catch {
      // timeout, network error, parse/validation error, missing key, etc.
      // fall through to the keyword classifier below.
    }
  }

  const fallback = keywordClassify(input.text, mode);
  return { ...fallback, source: "fallback" };
}
