# 08: Duplicate detection + co-signing

Status: DONE
Track: B
Blocked By: 01-shared-foundation.md
Files Touched: src/modules/duplicates/ (index.ts, internals, tests), src/app/report-detail/ (co-sign UI), src/app/my-reports/ (my + co-signed lists)

**What to build:** the collapse-duplicates-into-demand flow — once a location is known the app finds an existing open match and lets the student co-sign instead of filing a new report — so staff see one prioritized ticket with a real signer count.

- [ ] Deterministic matcher (no AI): candidate set = open (not Fixed/Won't-fix) reports in the same building AND same category; match when the item matches after normalization (lowercase/trim/hyphen-tolerant); same floor/room preferred not required. Surfaces the single best candidate (highest priority, else newest).
- [ ] On a match, "Is this the same issue?" shows title, location, signer count, and status; co-signing adds the student as a backer (one co-sign per student; the reporter counts as signed); declining files a new report.
- [ ] Report-detail screen shows title, location, tier, status timeline, signer count, and a Co-sign button; co-signed copy "You're on it. We'll notify you when it's fixed." My-reports lists my reports and ones I co-signed (counts only, never who).
- [ ] Tested through the duplicates module interface: the seeded ice-cream report is found and co-signing takes 14 → 15; a second co-sign by the same user is rejected. Covers F3, case 3.
- [ ] `npm run lint && npm run test && npm run build` pass.
