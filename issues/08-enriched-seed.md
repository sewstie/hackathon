# 08: Enriched MIT seed

Status: OPEN
Track: C
Blocked By: 01-prefactor-shared-seams.md
Files Touched: src/lib/store/seed.ts, tools/gen-seed-sql.ts, supabase/seed.sql

**What to build:** give the demo rich, varied content so every staff queue shows something and the product's breadth is visible. Rebalance the seeded MIT data across teams, offices, categories, severities, statuses and co-sign counts, and keep the SQL seed in sync with the in-memory one.

- [ ] Every public team (Facilities, Dining, Housing, IT, Grounds, Safety) and the key private offices have several reports each.
- [ ] Reports span categories, all tiers (Low→Urgent), and statuses (Received→Fixed, plus some In progress and Won't fix), with varied co-sign counts so the priority ranking visibly differs.
- [ ] Some reports are "fixed this week" so that view isn't empty; some are near-duplicates so the duplicate-merge / co-sign feature is demonstrable.
- [ ] `supabase/seed.sql` is regenerated from the same source as the in-memory seed so both stores match. MIT stays the demo campus.
- [ ] Existing store/seed-dependent tests still pass; determinism of the in-memory seed is preserved.
- [ ] `npm run lint && npm run test && npm run build` pass.
