# 05: Emergency takeover + safety hazard note

Status: OPEN
Track: A
Blocked By: 03-free-text-reporting.md
Files Touched: src/modules/emergency/ (index.ts, internals, tests), src/app/report/ (emergency takeover + safety-note components)

**What to build:** the safety-beats-everything path — an instant full-screen takeover with one-tap Call 911, and a softer safety-hazard note — so a student in danger gets help before any AI runs, and the AI can never close an emergency.

- [ ] Pure `detectEmergency(text)` runs client-side the instant the user submits (before any network call); on match it renders a full-screen red takeover with Ari, a one-line reason, a large Call 911 button, a Call Campus Police button, and "Not an emergency — continue my report".
- [ ] The AI classifier (02) can independently raise an emergency (Urgent/life-safety), but the AI can never close one; only the explicit "Not an emergency" action dismisses it, which files the report to Safety as Urgent.
- [ ] Call 911 / Campus Police are `tel:` links the user must tap (never auto-dial); every tap is logged via the access-log/store.
- [ ] A separate pure `detectSafetyHazard(text)` (broken railing, exposed wiring, ice on stairs, broken lock, missing extinguisher, chirping detector) drives a non-takeover red safety note with the campus police number and suppresses quick fixes.
- [ ] Takeover is keyboard-operable: on mount focus moves to Call 911 and focus is trapped; fits at 360 px. Component-tested (Testing Library) plus unit tests of both pure detectors. Covers F5, cases 1, 2, 15.
- [ ] `npm run lint && npm run test && npm run build` pass.
