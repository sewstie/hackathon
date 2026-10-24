# 11: Abuse protection (rate limit + spam rejection)

Status: OPEN
Track: B
Blocked By: 08-duplicates-cosign.md
Files Touched: src/modules/abuse/ (index.ts, internals, tests)

**What to build:** the friendly throttle — a per-user hourly cap and spam/off-topic rejection that always keeps the student's text — so the queue stays clean without punishing honest reporters.

- [ ] Rate limit of 5 reports per user per rolling hour, enforced in the module against the active user's recent report timestamps; co-signs do NOT count; emergencies are exempt. The 6th within the hour returns the exact copy "You've filed a lot in the last hour. Try again a bit later." The threshold is a tunable constant.
- [ ] Spam/abuse/off-topic uses the AI classifier's `rejected` flag + reason (02 is Track A, but the flag lives on the shared classification result consumed via the store/types) with a keyword fallback; on reject, show the friendly reason and keep the entered text; nothing is persisted.
- [ ] Tested through the abuse module interface: 5 reports allowed, 6th blocked with the exact copy; co-signs don't count; an emergency bypasses the limit; a spam text is rejected with text preserved. Covers F9, case 11.
- [ ] `npm run lint && npm run test && npm run build` pass.
