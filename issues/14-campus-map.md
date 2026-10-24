# 14: Campus home map (pins + heat layer)

Status: OPEN
Track: C
Blocked By: 13-landing-impact-search.md
Files Touched: src/app/campus/[campusId]/ (campus home map section), src/components/map/ (client-only map, dynamic import)

**What to build:** the campus home map — tier-colored report pins and a 120-day density heat layer over free OpenStreetMap tiles — so students can see where problems cluster, with no map API key needed.

- [ ] Map uses react-leaflet + OpenStreetMap tiles (no API key/token), loaded client-only via `next/dynamic` with `{ ssr: false }` to avoid the App Router `window is not defined` error.
- [ ] Report pins are colored by tier (using the shared tier tokens); a `leaflet.heat` density layer covers the last 120 days of reports; private reports never appear on the map.
- [ ] Campus home also shows a Report button and an "open reports by priority" list (reading the priority-sorted data via the store).
- [ ] Tested where feasible (the pin/heat data-shaping is a testable pure transform through the campuses/map helper interface; the Leaflet render itself is excluded from unit tests). Covers F13, stories 75–76.
- [ ] `npm run lint && npm run test && npm run build` pass.
