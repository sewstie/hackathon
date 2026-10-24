# 17: Ari — history line + quick fixes

Status: OPEN
Track: C
Blocked By: 01-shared-foundation.md
Files Touched: src/modules/ari/ (index.ts, internals, tests), src/components/ari/ (popup behavior — not the shell)

**What to build:** Ari's helpful moment — after classification, a one-line message, a history line, and up to two safe quick fixes that can deflect a report entirely — so easy problems get solved without adding noise.

- [ ] After classification (never in an emergency, safety hazard, or private person-naming report), Ari pops up with a one-line message and a history line computed from seeded data: "{n} similar reports this semester · usually fixed in ~{d} days" or "First report like this here."
- [ ] Up to 2 curated quick fixes keyed by category (+item) are shown; quick fixes are curated rows (seeded + staff-promoted), never AI-generated; none are shown for safety issues or private reports involving a person.
- [ ] "That fixed it" logs a self-resolution and files nothing; "Still broken — file it" emits a "continue" signal the report flow consumes. The Ari popup is a self-contained C-owned component; mounting it into the report screen is Track A's concern.
- [ ] Tested through the Ari module interface: the Wi-Fi fixture yields "~9 similar · ~3 days" and the reconnect quick fix; "That fixed it" writes a self-resolution and creates no report; suppressed for safety/private-person. Covers F11, case 4.
- [ ] `npm run lint && npm run test && npm run build` pass.
