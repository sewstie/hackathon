# 02: Student feed with upvote + delete

Status: DONE
Track: A
Blocked By: 01-prefactor-shared-seams.md
Files Touched: src/app/campus/[campusId]/ (reshape into the feed), src/packages/priority/ (feed ordering: index.ts, lib, tests)

**What to build:** turn the campus page into the student view's home — a long, scrollable feed of all public reports for the campus. Each report shows a one-tap upvote (co-sign) toggle with its signer count, and the most-wanted issues rise toward the top. A persistent "Report an issue" button sits top-right. The report's owner and staff can delete a report behind a confirm step. An empty campus shows a friendly "be the first" state instead of a blank page.

- [ ] `/campus/[campusId]` renders a scrollable feed of all public reports (private reports never appear), ordered by a feed-ordering pure function added to the `priority` package (severity × reach / recency blend, deterministic tie-break). Tested through the priority package interface.
- [ ] Each row has an upvote control that co-signs the report (one per user, toggleable) and shows the live signer count; co-signing changes the report's position per the ordering. Reuses the existing co-sign store methods; toggle-off removes the user's co-sign.
- [ ] A persistent top-right "Report an issue" action links to the report flow.
- [ ] A confirm-gated delete control appears for the report owner (their own reports) and for staff (any report), calling `deleteReport`; the row disappears on success.
- [ ] Zero reports renders a friendly empty state ("No reports here yet — be the first") with a link to report.
- [ ] `npm run lint && npm run test && npm run build` pass.
