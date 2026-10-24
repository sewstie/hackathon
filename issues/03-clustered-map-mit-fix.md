# 03: Legible clustered map + MIT-demo fix

Status: OPEN
Track: A
Blocked By: 02-feed-upvote-delete.md
Files Touched: src/components/map/ (campus-map.tsx, campus-map-inner.tsx, index.ts, error boundary), src/packages/campuses/map/ (clustering transform + tests)

**What to build:** make the report map readable and make "Open the MIT demo" work reliably. Dense areas collapse into numbered clusters colored by the worst issue inside them, with a legend explaining the tier colors and a quiet background heat layer. A compact map sits at the top of the student feed. A rendering failure degrades to a fallback instead of blanking the page, and the MIT-demo break is fixed at its root cause.

- [ ] Reproduce the actual MIT-demo runtime error by running the dev server, then fix the root cause (keep the Leaflet map strictly client-only `ssr:false`, guard against empty/missing coordinates and heat points).
- [ ] The map is wrapped in an error boundary so a render error shows a graceful fallback, never a blank page.
- [ ] A pure clustering transform is added inside the `campuses` map module: nearby reports collapse into a cluster whose color reflects the highest-severity member; non-overlapping reports stay individual pins; zero reports yields no pins and a usable centered view. Tested through the campuses package interface (no Leaflet, no DOM).
- [ ] The map renders those clusters (numbered, expand on zoom/click), a tier color legend, kept tier colors, and a softened heat layer as background. It sits as a compact section atop the feed.
- [ ] Opening MIT from the landing / entry point renders the feed + map cleanly end to end.
- [ ] `npm run lint && npm run test && npm run build` pass.
