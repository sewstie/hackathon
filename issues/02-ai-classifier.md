# 02: AI classifier module + keyword fallback

Status: OPEN
Track: A
Blocked By: 01-shared-foundation.md
Files Touched: src/modules/ai/ (index.ts, internals, tests), src/app/api/classify/ (route handler)

**What to build:** a server-side classification capability that turns a student's free text into a structured result, and never blocks the app when the AI is slow or down — so every downstream report flow has one reliable call to lean on.

- [ ] A single server-side `generateObject` call (Vercel AI SDK, `@ai-sdk/anthropic`) against one Zod schema returns category, item, neutral title, tier, missingDetails[], namesPerson, rejected (+reason), and (private mode) suggestedOffice.
- [ ] The call is bounded with `abortSignal: AbortSignal.timeout(...)`; on timeout, error, or missing key it falls through to a pure keyword fallback classifier (safe default category + Medium tier, result marked as fallback).
- [ ] The AI key/model are read from env server-side only; nothing is exposed to the browser.
- [ ] Tested through the module's public interface using `MockLanguageModelV4` from `ai/test` (happy path) and by forcing the fallback (timeout/missing key) — no network in tests. Covers demo case 16 (AI unavailable still classifies).
- [ ] `npm run lint && npm run test && npm run build` pass.
