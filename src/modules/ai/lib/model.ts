// Internal: builds the Anthropic language model from server-only env.
//
// The AI key (ANTHROPIC_API_KEY) and model id (AI_MODEL) are read here, on the
// server, and never shipped to the browser. Returns null when no key is set so
// the caller can fall through to the keyword classifier without throwing.
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

// Claude Opus 5.5 powers classification (override with AI_MODEL).
const DEFAULT_MODEL = "claude-opus-5-5";

/** The default model from env, or null when no API key is configured. */
export function defaultModel(): LanguageModel | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const anthropic = createAnthropic({ apiKey });
  return anthropic(process.env.AI_MODEL || DEFAULT_MODEL);
}
