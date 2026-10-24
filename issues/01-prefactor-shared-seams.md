# 01: Prefactor — shared seams for delete, theme tokens & header slots

Status: OPEN
Track: SHARED
Blocked By: None
Files Touched: src/lib/store/types.ts, src/lib/store/in-memory.ts, src/lib/store/supabase.ts, src/test/store.test.ts, src/app/globals.css, src/components/ui/ (shared primitives), src/components/layout/header.tsx, supabase/schema.sql (delete cascade only if needed)

**What to build:** the small set of genuinely cross-cutting changes that every track would otherwise collide on, landed on `main` before the three branches fork. After this ticket: a report can be deleted at the store layer, the whole app inherits the refreshed visual tokens, and the header exposes stable slots that Tracks A/B can fill without editing `header.tsx` again. This is NOT a full shared foundation (that already exists from v1) — only the shared seams this v1-polish pass needs.

- [ ] `Store` gains `deleteReport(reportId): Promise<void>`; implemented in both `InMemoryStore` and `SupabaseStore` as a hard delete that also removes the report's co-signs. Deleting a non-existent id is a no-op.
- [ ] A Vitest test against `InMemoryStore` proves: file → delete removes the report from `listReports` and drops its co-signs; deleting an unknown id does nothing. (Prior art: `src/test/store.test.ts`.)
- [ ] `globals.css` CSS-variable palette is refreshed toward a clean, modern Wispr-Flow-style look (neutral base, one accent, refined type scale/spacing/radii/shadow tokens). Raw hex stays only in the `:root` token definitions; no hardcoded hex anywhere else. Existing tier tokens and accessibility (focus-visible, reduced-motion, ≥4.5:1 contrast) are preserved.
- [ ] Shared UI primitives (`src/components/ui`: card, button, badge, input, select) adopt the refreshed tokens so every page inherits the new look.
- [ ] The header is split into stable slots — logo · university-name slot · nav · notification-bell slot · role-switcher — so Track A/B can fill their slot without further edits to `header.tsx`. The university name is pulled out of the logo link into its own slot (content wired by Track B).
- [ ] `npm run lint && npm run test && npm run build` pass. Committed on `main` before branching.
