# Project Rules & Architecture

## 1. Tech Stack & Overview
- **Stack:**  Next.js App Router, TypeScript strict, Tailwind + shadcn/ui, Supabase (Postgres + Storage), Vercel AI SDK (generateObject with a Zod schema), Recharts,Vercel
- **App Summary:**  CampusFix lets college students report what's broken on campus in plain language. AI classifies each report, asks only the few details still missing (location first, tap-chips, max 3 questions), merges duplicates into one co-signed ticket, ranks by severity × reach, and routes it to the right staff team. Every report has a visible status from Received to Fixed, and the reporter and all co-signers are notified on every change. A **Direct (private) report** mode sends sensitive issues — ones that name a person or a room — to exactly one office with a "private, not confidential" notice. **Ari**, a small assistant, shows past history and safe quick fixes; in an emergency Ari takes over the screen with a one-tap Call 911 button before any AI runs. The product is **campus-agnostic**; the richly-seeded demo campus is **MIT** (Cambridge, MA), and off-campus issues hand off to **Cambridge SeeClickFix**.

## 2. Deep Modules Architecture (Big Blocks, Tiny Interfaces)
- **Deep Modules Only:** Do NOT create many tiny shallow helper files. Group domain/feature logic into Deep Modules (`src/modules/<feature>/index.ts`) that expose a small, simple public interface and hide all complex internal logic inside their folder.
- **No Pass-Through Wrappers:** Every module must hide real complexity behind a simpler function signature.
- **The Interface is the Test Surface:** Write Vitest tests strictly against the public interface of a Deep Module. Never test private helpers or mock internal functions.

## 3. Shared Boundaries (3-Track Parallel Safety)
- **Shared Foundation (`Wave 1 / Track: SHARED`):** Shared types, database schema, global state/store, and base UI primitives (`components/ui`) belong in `issues/01-shared-foundation.md`.
- **Feature Tracks (`Track: A`, `Track: B`, `Track: C`):** Parallel feature agents must stay strictly inside their assigned module/route folders and consume Shared Foundation interfaces without modifying other tracks' files.

## 4. UI & Code Standards
- TypeScript `strict` mode—no `any`.
- Styling via Tailwind theme tokens / CSS variables only (no hardcoded hex values).
- Keyboard accessible and properly labeled UI elements.

## 5. Feedback Loops (Definition of Done)
Every ticket implementation MUST pass before committing:
- `npm run lint`
- `npm run test`
- `npm run build`
