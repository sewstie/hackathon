# 07: Two-way direct chat on private reports

Status: DONE
Track: C
Blocked By: 01-prefactor-shared-seams.md
Files Touched: src/app/staff-private/staff-private-view.tsx, src/app/private/thread/ (reachability wiring)

**What to build:** make the direct (private) report a real two-way conversation. A student and the office currently holding the report exchange messages; the office can reply from where it already works, and the student sees those replies. Access stays office-scoped.

- [ ] From the staff-private workspace, office staff can post a reply to a private report via `postOfficeReply`; the reply appears in the thread and the student is notified (existing seam behavior).
- [ ] The student's private thread shows new office replies on refresh and lets the student post follow-ups (existing `postStudentMessage`).
- [ ] The thread is reachable from both sides: the student's private report and the staff office queue.
- [ ] Office-scoped access is preserved: staff from another office are denied the thread (no data). Covered by the existing `private-access-thread` tests; extend only if new behavior appears.
- [ ] `npm run lint && npm run test && npm run build` pass.
