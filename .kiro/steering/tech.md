---
inclusion: always
---
# Tech

- Next.js App Router (v16, Cache Components), React 19, TypeScript strict (no `any`).
- Tailwind v4 with theme tokens / CSS variables only — no hex in components. Arbitrary CSS-var
  utilities use the v4 form `rounded-(--radius)`, never `rounded-[--radius]` (renders square).
- Data seam: `getStore()` → Supabase when `NEXT_PUBLIC_SUPABASE_*` are set, else the deterministic
  in-memory store + seed (offline demo and tests). Schema in `supabase/schema.sql`, seed generated
  from `src/lib/store/seed.ts` with `npm run gen:seed`.
- AI: Vercel AI SDK `generateObject` + Zod schema, Anthropic model from `AI_MODEL`
  (default `claude-opus-5-5`), server-only key. Every AI call has a keyword fallback and a timeout.
- Leaflet map loaded client-only (`next/dynamic`, `ssr: false`).
- Tests: Vitest + Testing Library; property-based tests with fast-check for invariants.
- Definition of done: `npm run typecheck && npm run lint:boundaries && npm run lint && npm run test`
  (and `npm run build` before shipping).
- Secrets only through `./ship-keys` — never print or commit a key.
