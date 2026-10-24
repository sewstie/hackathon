---
inclusion: always
---
# Structure

- `src/app/` — routes. Thin pages; interactive pieces are colocated client components.
- `src/modules/<feature>/` and `src/packages/<name>/` — **deep modules**: small public entry files at
  the root, implementation in `lib/`, tests in `tests/`. Import only through entry points;
  `dependency-cruiser` enforces it (`npm run lint:boundaries`). See `src/packages/README.md`.
- `src/components/ui/` — base primitives (Button, Card, Dialog, Tabs, Reveal…).
- `src/components/ari/` — Ari's robot, popup, helper and emergency takeover.
- `src/components/onboarding/` — demo welcome pop-up, guided report tour, spotlight tour.
- Test the public interface only; never test private helpers or mock internals.
- No pass-through wrappers and no many-tiny-file sprawl: group logic into deep modules.
