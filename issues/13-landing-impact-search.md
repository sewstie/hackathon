# 13: Landing page + MA impact + school search

Status: DONE
Track: C
Blocked By: 01-shared-foundation.md
Files Touched: src/app/(landing)/ (landing page), src/modules/campuses/ (index.ts, internals, tests), src/data/ipeds-ma.* (IPEDS MA subset)

**What to build:** the front door — a pitch landing page with the Massachusetts impact numbers and a search over MA institutions that opens any campus — so visitors understand why this matters and can reach a campus home.

- [ ] Landing page shows the pitch line, the AICUM (2025) Massachusetts impact numbers verbatim with source citations, and a 3-step "How it works" (Report → Routed → Fixed).
- [ ] School search reads an IPEDS HD subset for MA institutions (INSTNM, CITY, STABBR, LATITUDE, LONGITUD); selecting any school opens its campus home centered on its coordinates. MIT is the seeded campus; others open empty-but-usable (no "Coming soon" wall).
- [ ] The campuses module exposes campus lookup + search used by the landing page and the map.
- [ ] Tested through the campuses module interface: search finds MIT and at least one other MA school; selecting a non-seeded school yields a usable empty campus. Covers F14 + F13-search, stories 73–74, 77.
- [ ] `npm run lint && npm run test && npm run build` pass.
