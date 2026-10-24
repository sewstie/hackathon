# 06: Names-a-person block (public path)

Status: OPEN
Track: A
Blocked By: 03-free-text-reporting.md
Files Touched: src/modules/reporting/ (names-person internals + tests), src/app/report/ (block dialog component)

**What to build:** the guard that keeps public reports from naming people — when a public report mentions a specific person it is blocked (nothing persisted) and the student is offered Rephrase or Send privately — so constraint 2 holds.

- [ ] Detection uses the AI classifier's `namesPerson` flag (02) backed by a keyword fallback (honorifics: Professor/Prof/Dr./Dean/Coach/RA/Mr./Ms./Mrs.; relationship/accusation phrases) so it works with AI off.
- [ ] On the public path, a flagged report is blocked with the exact copy ("Public reports can't name people. You can rephrase it, or send it privately to the right office.") and two actions: Rephrase (returns to the preserved text and re-validates) or Send privately (carries the text to the Private tab). Nothing is persisted on block — no public row, hidden or otherwise.
- [ ] The block applies only to the public path.
- [ ] Tested through the reporting module interface: a person-naming public submission is rejected and nothing is written; the keyword fallback catches "Professor Smith". Covers F8-block, case 5.
- [ ] `npm run lint && npm run test && npm run build` pass.
