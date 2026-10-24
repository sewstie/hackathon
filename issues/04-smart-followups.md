# 04: Smart follow-ups (chips, location-first, max 3, Use my location)

Status: DONE
Track: A
Blocked By: 03-free-text-reporting.md
Files Touched: src/modules/reporting/ (follow-ups internals + tests), src/app/report/ (follow-up step components)

**What to build:** the "ask the fewest questions" flow — only missing details, location first, tap-chips, capped at three — so filing stays fast and reports arrive with a trusted location.

- [ ] Only missing details are asked, one at a time, location first, hard cap of 3 questions; chips are generated from seeded campus data (buildings/floors/dining halls/items), with "Use my location" and "Type instead" always available; unseeded campuses fall back to free-text.
- [ ] Required details per category match the brief (Facilities/Dining/Housing/IT/Grounds/Safety).
- [ ] "Use my location" reads browser geolocation and compares to the chosen building's seeded coordinates; >500 m sets the location-unverified flag.
- [ ] If details are still missing after 3 questions, the report is filed and flagged incomplete.
- [ ] Tested through the reporting module interface: question selection, the 3-question cap + incomplete flag, and the 500 m unverified flag (deterministic coordinates). Covers F2 and F9-location.
- [ ] `npm run lint && npm run test && npm run build` pass.
