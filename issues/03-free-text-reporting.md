# 03: Free-text reporting + Ari "Reading…" + confirmation card

Status: OPEN
Track: A
Blocked By: 02-ai-classifier.md
Files Touched: src/modules/reporting/ (index.ts, internals, tests), src/app/report/ (page + public report flow components)

**What to build:** the core public report flow — a student types what's wrong, the app classifies it, shows an editable confirmation, and files a public report — so the single most important student action works end to end.

- [ ] Report screen with the free-text box (up to 500 chars, placeholder copy from the brief) and an optional photo; while classifying, the Ari shell shows "Reading your report…".
- [ ] On submit, the reporting module calls the AI classifier (02) and produces a draft with category/item/title/tier; the student can change the category.
- [ ] A confirmation card shows title, location, tier, and category — each editable — before posting; posting creates a public report via the store and shows "Sent to {Team}. We'll let you know when it changes."
- [ ] Optional photo uploads to Supabase Storage with the URL on the report; upload failure never blocks filing (report created without photo, user told it didn't attach).
- [ ] Tested through the reporting module interface with the in-memory store + mock model (classify → confirm → file). Covers F1.
- [ ] `npm run lint && npm run test && npm run build` pass.
