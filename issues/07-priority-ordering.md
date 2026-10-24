# 07: Priority ordering (severity × reach)

Status: DONE
Track: B
Blocked By: 01-shared-foundation.md
Files Touched: src/modules/priority/ (index.ts, internals, tests)

**What to build:** the deterministic rule that orders reports by real priority, not popularity — so staff always see the worst problems first and demand can correct an uncertain rating.

- [ ] Pure ordering function: Urgent tier always sorts above all non-Urgent; otherwise `score = severityWeight (Low 0 / Medium 100 / High 200) + min(signers, 90)`, with an unconfirmed/incomplete High penalized ~30 so a popular Medium can overtake it; ties broken oldest-first.
- [ ] Staff tier override is respected by the ordering (override changes the effective tier).
- [ ] Tiers always carry text + color (no color-only) — exposed so the UI can render accessibly.
- [ ] Unit-tested against the public interface with the demo-case fixture: High (4 signers) ranks above Medium (9 signers); a very popular Medium overtakes an unconfirmed High; Urgent leads regardless. Covers F4, case 10.
- [ ] `npm run lint && npm run test && npm run build` pass.
