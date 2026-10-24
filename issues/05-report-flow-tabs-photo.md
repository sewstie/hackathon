# 05: Tabbed report flow with polished photo step

Status: DONE
Track: B
Blocked By: 01-prefactor-shared-seams.md
Files Touched: src/app/report/ (report-flow.tsx + step/tab components), src/modules/reporting/ (photo step glue only; reuse existing PhotoUploader)

**What to build:** make filing a report feel clear and finished. The flow gains a visible, pretty step/tab header so the student always knows where they are, and photo attachment becomes an attractive, optional step rather than a bare file input.

- [ ] The report flow shows a visible step/tab header — Describe → Details → Photo → Review — that reflects progress. The existing phase logic (AI classify → follow-ups → confirm → file) is preserved underneath; safety ordering (instant client-side emergency takeover before any AI call) and the names-a-person block are unchanged.
- [ ] The Photo step is a polished, optional affordance: tap or drag to upload, image preview, remove/replace. A photo is never required to submit.
- [ ] Photo persistence reuses the existing reporting-module uploader (Supabase Storage via the injected `PhotoUploader`) when configured, and falls back to a local object-URL preview when cloud isn't configured, so the demo works offline.
- [ ] All existing reporting tests still pass; any new behavior is tested through the reporting module interface.
- [ ] `npm run lint && npm run test && npm run build` pass.
