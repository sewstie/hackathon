# 09: Status lifecycle + notifications + bell + Fixed this week

Status: OPEN
Track: B
Blocked By: 01-shared-foundation.md
Files Touched: src/modules/notifications/ (index.ts, internals, tests), src/app/campus-home/ (Fixed this week list), src/components/notifications/ (bell dropdown wiring)

**What to build:** the closed loop — every report moves through visible statuses and every change notifies the reporter and all co-signers via the header bell — so students are never left wondering.

- [ ] Status transitions Received → Assigned → In progress → Fixed, or Won't fix (reason required); each change writes a notification row per recipient (reporter + all co-signers) with body "[title] is now [status]".
- [ ] The header bell reads unread notifications for the active user and refetches on role-switch / navigation / short interval (no Realtime); a "Fixed this week" list renders on campus home.
- [ ] Tested through the notifications module interface: marking the seeded ice-cream report Fixed produces one notification per co-signer and the bell unread count reflects it for each recipient. Covers F7, case 9.
- [ ] `npm run lint && npm run test && npm run build` pass.
