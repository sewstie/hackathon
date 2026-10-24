# 12: Staff dashboard (team queue + private inbox)

Status: OPEN
Track: B
Blocked By: 07-priority-ordering.md, 09-status-notifications.md
Files Touched: src/app/staff/ (dashboard + detail view), src/modules/staff/ (index.ts, internals, tests)

**What to build:** the responder's workspace — a priority-sorted queue for their team (and a private inbox if they hold an office), with a detail view that can act on a report — so staff can triage and close the loop.

- [ ] The active responder sees a tab for their own public team queue, plus a Private inbox tab only if they hold an office. They do not see other teams' tabs.
- [ ] Each queue is sorted by the priority rule (07) then oldest-first, showing tier (text + color), title, location, signers, age, status, and flags (incomplete, location unverified); filters by status and building.
- [ ] Opening a row shows the full description, photo, and reporter (name + email); actions: status buttons (driving notifications via 09), reassign, tier override, add a note, and "Promote a quick fix". Won't fix requires a reason.
- [ ] The Private inbox lists only the active office's private reports; opening one logs a view; staff from another office are denied (consumes the private module's access rules via the store — read-only here, enforcement lives in Track C's private module/schema).
- [ ] Tested through the staff module interface: queue ordering uses 07; marking Fixed triggers 09 notifications; filters narrow the list. Covers F12.
- [ ] `npm run lint && npm run test && npm run build` pass.
