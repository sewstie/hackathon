# Packages are deep modules

Every package under `src/packages/` is a **deep module**: a lot of behaviour behind a
small interface. A package's public surface is its **entry points** — the files at the
package root. Everything in its subfolders is private. `dependency-cruiser` enforces this;
run it with `npm run lint:boundaries` (it is also part of `npm run check`).

## Layout

```
src/packages/
  <name>/
    index.ts        ← an entry point (public). Import this from outside.
    client.ts       ← another entry point. A package may expose SEVERAL.
    lib/            ← implementation: hidden from outside, free to import each other.
    tests/          ← co-located tests + fixtures (a subfolder, so private).
```

Entry points are the package's **root files**, not one designated `index.ts`. By convention
implementation lives in `lib/` and tests in `tests/`, but the rule is general: *anything* in
*any* subfolder is private, so you never edit the config to add a folder. Packages are flat —
one tier of children under the root; a package may not contain another package.

**Import only through a package's entry points (its root files).** From app code or another
package, import `src/packages/<name>` or `src/packages/<name>/<entry>` — never a path that
reaches into a subfolder.

## Discourage barrel files

Do **not** funnel everything through one giant `index.ts` that re-exports a whole subtree.
Expose several small entry points instead (`index.ts`, `client.ts`, `server.ts`, …) and hide
implementation in `lib/`. Adding an entry point is just adding a root file — no barrel needed.

## The four rules

- **Entry-point boundary (outside → package).** Code outside a package (app code or another
  package) may import only that package's entry points (its root files), never anything in its
  subfolders.
- **Intra-package freedom.** A package's own files import each other freely, including its own
  `lib/` internals.
- **Tests through the entry points.** Files under `<pkg>/tests/` may import any package's entry
  points and their own `tests/` fixtures, but never any package's subfolder internals — not
  even their own. Integration tests across packages are fine; deep imports are not.
- **No cycles.** No dependency cycles anywhere.

## Copy-me template

`example/` is a starter template — copy it to a new `<name>/` or delete it. Its `index.ts`
exposes `greet`, which delegates to a hidden `lib/impl.ts`, and its `tests/` import only the
entry point.
