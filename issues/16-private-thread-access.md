# 16: Private thread + office access control + access log

Status: OPEN
Track: C
Blocked By: 15-private-report-routing.md
Files Touched: src/modules/private/ (access-control + thread internals + tests), src/app/private/ (student thread view), src/app/staff-private/ (staff private report view)

**What to build:** the least-exposure guarantees for private reports — office-scoped access, an audit log, and a two-way message thread — so a private report is seen by exactly one office and everything staff do is recorded.

- [ ] Access is enforced in the private module (not just the UI): every read/write takes the active actor (role + office) and is denied unless the actor's office equals the report's currentOffice; other-office staff are denied and get no data.
- [ ] Reassigning sets currentOffice to the new office, which removes the previous office's access; every view, reassign, and status change appends to an append-only access log (actor, action, timestamp, reportId).
- [ ] A two-way private_messages thread between student and current office; statuses Received → Reviewing → Resolved or Referred (Referred requires a note). Each office reply and every status change notifies the student (and student replies surface to the office); "Don't share my name" hides the student's identity from staff while keeping the thread working.
- [ ] Tested through the private module interface: an actor from office X is denied a report owned by office Y (no data returned) and a log row is written on view; reassign cuts old access; a status change notifies the student. Covers F15-access, case 8.
- [ ] `npm run lint && npm run test && npm run build` pass.
