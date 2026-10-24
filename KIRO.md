# How we used Kiro — UniFix

**Track:** Civic Action — **Challenge V4: "Better college experiences"** (from the [Hackachusetts 2026 campus data portal](https://hackachusetts2026.vercel.app)) · **Live demo:** https://hackathon-pi-ebon.vercel.app/campus/mit · **Repo:** https://github.com/sewstie/hackathon

> Items marked **[team: confirm]** are things only the team can verify. Edit them before submitting.

## 1. Which Kiro tools we used, and how they differed

| Tool | What we used it for |
|---|---|
| **Kiro Crew** (dashboard agent) | The final polish pass: Roveia-style redesign, Ari helper + emergency takeover, onboarding tours, comments and staff ↔ student chat, the smarter classifier, the map, the submission write-up, the demo video, and deployment. Crew kept a memory of earlier sessions (installed skills, our "use `$` for skills" lesson) and verified each change in a real headless Chrome before reporting. |
| **Kiro CLI** | `ralph/once.sh` and `ralph/afk.sh` run an autonomous loop over `issues/`; `AGENT=kiro` drives `kiro-cli chat --non-interactive` headless, one ticket at a time. **[team: confirm which agent each track ran]** |
| **Kiro IDE** | **[team: confirm]** — e.g. Specs panel and hooks while building tracks A/B/C. |

Crew was best for long, multi-part changes that touch many files and need a browser check; the CLI loop was best for grinding through independent tickets in parallel.

## 2. Spec-driven development

1. **Grill → spec.** We used the `grilling` skill to stress-test the idea, then `to-spec` to write one PRD: [`issues/00-spec.md`](issues/00-spec.md) (problem, solution, 60+ user stories, implementation and testing decisions). Mirrored in [`.kiro/specs/unifix/requirements.md`](.kiro/specs/unifix/requirements.md).
2. **Spec → tickets.** `to-tickets` split it into **9 tracer-bullet tickets**, each with its blocking edges, plus a Gantt roadmap ([`issues/00-gantt-roadmap.md`](issues/00-gantt-roadmap.md)).
3. **Tickets → parallel build.** One shared foundation wave (`01-prefactor-shared-seams`), then **three tracks in parallel** on three machines — A (feed, map, onboarding), B (report flow, notifications, branding), C (private chat, seed, Ari). The git history shows each `feat(track-X): complete NN-….md` commit.

Compared with vibe coding: every agent run had a small, testable target with acceptance criteria, so three people (and their agents) could build at once without stepping on each other, and "done" meant tests passing, not "looks right".

## 3. Steering

- [`AGENTS.md`](AGENTS.md) and [`.kiro/steering/`](.kiro/steering) (`product.md`, `tech.md`, `structure.md`, all `inclusion: always`).
- The rules that made the biggest difference:
  - **Deep modules, entry points only** — enforced by `dependency-cruiser` so agents can't reach into another module's internals.
  - **Safety beats everything** — every agent kept the "instant 911 before AI" rule intact.
  - **Theme tokens only** and the Tailwind v4 `rounded-(--radius)` gotcha, written down after Crew found that `rounded-[--radius]` rendered every box square.
  - A strict **definition of done**: typecheck, boundaries, lint, test.

## 4. Agent hooks

Project hooks in [`.kiro/hooks/`](.kiro/hooks) (`PostFileSave`, command actions):

| Hook | What it automates |
|---|---|
| `test-on-save.json` | Runs the tests related to changed files after the agent edits `src/`. |
| `boundaries-on-save.json` | Re-checks deep-module boundaries after edits to `src/modules` or `src/packages`. |
| `safety-guard.json` | Re-runs the emergency + classifier tests whenever emergency detection changes. |

**[team: confirm]** any IDE hooks you used during the tracks.

## 5. MCP

Kiro Crew runs on its own MCP servers (`kirocrew-core`, `kirocrew-cron`): persistent **memory** and **lessons** across sessions, artifacts, sub-agents and scheduling. In practice that meant Crew remembered our setup (skills location, trigger prefix, "make changes in-app, not in a terminal") without re-explaining it each session. **[team: confirm]** other MCP servers you connected.

## 6. Property-based testing

[fast-check](https://fast-check.dev) properties run thousands of random inputs against rules that must always hold:
- [`src/modules/emergency/tests/emergency.property.test.ts`](src/modules/emergency/tests/emergency.property.test.ts) — an emergency phrase is caught **whatever text surrounds it, in any case**; detectors never throw; an emergency is never also a "hazard note".
- [`src/packages/priority/tests/priority.property.test.ts`](src/packages/priority/tests/priority.property.test.ts) — feed ordering is a permutation, **Urgent never ranks below non-Urgent**, ordering is deterministic, more co-signers never lowers a score.

Unit tests check examples we thought of; the properties check the invariants against inputs we didn't.

## 7. Kiro powers / skills

Installed in [`.kiro/skills/`](.kiro/skills): `grilling`, `to-spec`, `to-tickets`, `tdd`, `setup-ts-deep-modules`, `codebase-design`, `improve-codebase-architecture`, `loop-me`, `ship-keys`. They bundled our team's playbook (planning, red-green-refactor, deep-module architecture) and let Kiro set up `dependency-cruiser` and ship secrets to Vercel + Supabase **without any key ever being printed** (`./ship-keys`).

## 8. Numbers

- 300+ Vitest tests (unit, component, property-based), all green.
- 9 spec tickets + a final Crew polish pass, built by a team of three in parallel tracks.
