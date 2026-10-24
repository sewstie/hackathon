# 15: Direct (private) report — routing, review, notice, file

Status: OPEN
Track: C
Blocked By: 01-shared-foundation.md
Files Touched: src/modules/private/ (index.ts, routing internals, tests), src/app/private/ (Private report screen + review screen)

**What to build:** the sensitive-issue path — a Private tab that routes to one office, lets the student confirm or change it, states the privacy terms plainly, and files privately — so sensitive reports have a safe, honest home.

- [ ] A dedicated Private report screen (the destination of the public-path "Send privately" redirect) accepts text that may name people, rooms, and times; follow-ups only for missing location or time (max 3). (The Public/Private entry point on the report screen itself is wired by Track A; this ticket owns the private screen and flow.)
- [ ] Office is chosen by the classifier's suggestedOffice, overridden by deterministic hard rules: sexual misconduct/harassment/discrimination/protected-class → Title IX; immediate danger → emergency takeover first, then Campus Police; unclear/AI-off → Dean of Students. These hard rules run even with AI off.
- [ ] Review screen: "Going to: [office]" with a dropdown to change it; a "Don't share my name" toggle ("They won't be able to contact you directly."); the exact notice "Private, not confidential. Only [office name] will see this. Staff may be required to act on what you report." plus a "Want to talk to someone confidentially? Counseling Center →" link.
- [ ] Filing creates a private report via the store; private reports never appear in the feed, map, Fixed this week, duplicates, co-signing, or Ari history.
- [ ] Tested through the private module interface: "roommate leaves door unlocked" → Housing; "comments about my race" → Title IX (hard rule, AI off); default Dean of Students when unclear; override via dropdown respected. Covers F15-routing, case 6.
- [ ] `npm run lint && npm run test && npm run build` pass.
