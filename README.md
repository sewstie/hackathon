# hackathon

A 3-person hackathon starter for **Kiro CLI** or **Claude Code**. We plan together on one laptop,
split the work into 3 non-overlapping tracks, then each person runs a **Ralph loop** (an AI agent
that implements one ticket per fresh context, commits, and repeats) on their own laptop. At the
end we merge the 3 branches.

```
 STEP 1 + 2: PC #1, all 3 together          STEP 3: each PC                   STEP 4: together
 ──────────────────────────────────────     ─────────────────────────────     ────────────────
 scaffold → grill → spec → tickets →        PC #1  track-a  TRACK=A  ──┐
 build Wave 1 (Track SHARED) → push         PC #2  track-b  TRACK=B  ──┼──►  merge → demo
                                            PC #3  track-c  TRACK=C  ──┘
```

## What's in the repo

| Path | What it is |
| --- | --- |
| `AGENTS.md` | Project rules every agent reads (`CLAUDE.md` just imports it). **Fill in the Stack + Summary.** |
| `feature-brief.md` | Short brief: starting state, user cases, hard constraints. Fill it in before grilling. |
| `.agents/skills/` | The skills. `.claude/skills/` and `.kiro/skills/` are symlinks to it, so both tools see the same set. |
| `ralph/once.sh` | Runs **one** ticket for `$TRACK` with `$AGENT` (`kiro`, the default, or `claude` / `codex`). |
| `ralph/afk.sh` | Runs `once.sh` in a loop (default 8) until the track prints `<promise>COMPLETE</promise>`. |
| `ship-keys` / `tools/ship-keys.mjs` | Puts the app live: moves keys from `.env.local` into Vercel + Supabase and deploys, never showing a key. See Step 5. |
| `ralph/prompt.md` | What Ralph is told: pick the first unblocked `Status: OPEN` ticket for the track, TDD it, lint/test/build, mark it `DONE`, commit. |
| `issues/` | Created by `/to-spec` and `/to-tickets`. Holds `00-spec.md`, `00-gantt-roadmap.md`, `01-shared-foundation.md`, `NN-*.md`. |

### Skills

| Skill | Use it for |
| --- | --- |
| `grilling` | Stress-test the idea. One round of numbered questions at a time, each with a recommended answer. |
| `to-spec` | Turn the conversation into `issues/00-spec.md` (user stories, modules, testing decisions). |
| `to-tickets` | Turn the spec into tracer-bullet tickets split into Track SHARED / A / B / C, plus a Gantt chart. |
| `tdd` | Red → green → refactor. Ralph uses it on every ticket. |
| `codebase-design` | Deep-module vocabulary (module, interface, seam, depth). Other skills pull it in. |
| `setup-ts-deep-modules` | Installs dependency-cruiser so code can only import a module's root files. |
| `ship-keys` | Go live: find missing keys, move them into Vercel + Supabase, run the schema, deploy. |
| `improve-codebase-architecture` | After the hackathon (or between waves): find shallow modules worth deepening. |

How to call one: in Claude Code or Kiro type `/to-spec`.

---

## Step 0

1. Install and log in:
   - Kiro: `kiro-cli login`, then `kiro-cli chat --list-models`.
     Choose a model: in `kiro-cli chat` run `/model`, then `/model set-current-as-default`.
   - Claude Code (optional): run `claude` once and log in.
   - Node 20+, `git`, `gh auth login`.
2. Clone the repo and confirm the skills load:
   ```sh
   git clone https://github.com/sewstie/hackathon.git && cd hackathon
   kiro-cli chat --no-interactive "Without using tools, list the skills you have and the first heading of AGENTS.md"
   ```
   You should get 9 skills and `# Project Rules & Architecture`.
   > Windows: the skill folders are symlinks. Use WSL, or run `git config --global core.symlinks true` before cloning.

---

## Step 1: Mob planning together

All 3 of you sit around one laptop, so everyone agrees on the architecture and features.
Work on `main` in an interactive session (`kiro-cli chat` or `claude`).

**1a. Scaffold the app (do it first, ~5 min).** Ralph only counts a ticket as done when
`npm run lint && npm run test && npm run build` pass, so those scripts have to exist.

```sh
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --use-npm
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react
npm pkg set scripts.test="vitest run"
```
- Add `node_modules/`, `.next/`, `dist/`, `.env*` to `.gitignore`.
- Optional: run **`setup-ts-deep-modules`**. When it asks for the packages root, answer **`src/modules`**.
- Check that `npm run lint && npm run test && npm run build` pass, then commit.

**1b. Write `AGENTS.md` and `feature-brief.md`.** Fill in Stack + App Summary in `AGENTS.md`.
Fill in the hackathon prompt, user cases and hard constraints in `feature-brief.md`.

**1c. Run `/grilling`.** Prompt: *"Read feature-brief.md and use the grilling skill on our idea."*
Answer the AI's questions together as a team. Push back on scope: it's a hackathon.

**1d. Run `/to-spec`.** This generates `issues/00-spec.md`. Read it together and fix anything that's wrong.

**1e. Run `/to-tickets issues/00-spec.md`.** This generates:
- `issues/01-shared-foundation.md` (`Track: SHARED`)
- the feature tickets, split across `Track: A`, `Track: B`, `Track: C`
- `issues/00-gantt-roadmap.md`

It shows you the breakdown first. Before you approve it, check:
- [ ] `01-shared-foundation.md` holds **all** shared types, DB schema, store interfaces, UI primitives and layout/nav.
- [ ] Tracks A / B / C are about the same size, and each owns **different folders** (`Files Touched`).
- [ ] A/B/C tickets are only `Blocked By` the shared foundation or tickets in **their own** track.
- [ ] Every ticket starts with `Status: OPEN`, `Track: X`, `Blocked By: ...`, `Files Touched: ...`.

Commit the `issues/` folder.

> In Kiro, ask for a skill by name ("use the to-spec skill"). In Claude Code, type `/to-spec`.

---

## Step 2: Build Wave 1 (`01-shared-foundation.md`) on PC #1 and push to GitHub

Still on PC #1, build the shared foundation first, so the database schema, shared TypeScript types
and global store interfaces exist before anyone branches.

```sh
TRACK=SHARED ./ralph/once.sh           # Kiro (default); or: AGENT=claude TRACK=SHARED ./ralph/once.sh
```
- Make sure Ralph marked `01-shared-foundation.md` as `Status: DONE` and committed it.
- Then check and push:

```sh
npm run lint && npm run test && npm run build
git push origin main
```

---

## Step 3: Parallel Ralph (one track per PC)

| PC | Branch | Command |
| --- | --- | --- |
| #1 | `track-a` | `TRACK=A ./ralph/afk.sh 10` |
| #2 | `track-b` | `TRACK=B ./ralph/afk.sh 10` |
| #3 | `track-c` | `TRACK=C ./ralph/afk.sh 10` |

```sh
git checkout main && git pull
npm install
git checkout -b track-a                    # your track
TRACK=A ./ralph/once.sh                    # watch the first ticket
TRACK=A ./ralph/afk.sh 10                  # then let it loop
# AGENT=claude TRACK=A ./ralph/afk.sh 10   # Claude Code instead of Kiro
```

- Each iteration does one ticket in a fresh context and commits `feat(track-A): complete NN-....md`.
- **Push often** (`git push -u origin track-a`) so nothing gets lost and teammates can see your progress.
- While it runs: review commits, try the app (`npm run dev`), and work on the demo and pitch.
- If Ralph gets stuck: stop it (Ctrl-C), fix the ticket text or code by hand, commit, and rerun.
- If you need a change in shared code, **don't** make it on your branch. Make it on `main`, push,
  and everyone runs `git merge main`.
- Finished early? Add more `Status: OPEN` tickets for your own track and rerun.

---

## Step 4: Merge + demo (together, last ~60 min)

Stop the loops at least an hour before the deadline. Merge on PC #1:

```sh
git checkout main && git pull
git merge origin/track-a && npm run lint && npm run test && npm run build
git merge origin/track-b && npm run lint && npm run test && npm run build
git merge origin/track-c && npm run lint && npm run test && npm run build
git push origin main
```
- If there are conflicts, they'll almost always be in shared files (nav, routes list, `package.json`). Fix them together.
- Optional: write an "Integration" ticket and run `TRACK=ALL ./ralph/once.sh` to wire the features together.
- Click through the user stories in `00-spec.md` end to end, then do the demo.

---

## Step 5: Ship it (PC #1, after the merge)

Only the person who owns the Vercel + Supabase accounts does this. `./ship-keys` reads the keys from
`.env.local` and hands them straight to Vercel and Supabase through their official tools. Every line
it prints has the values blanked out (`••••`), so no key ever shows on screen or in an AI chat.
Needs Node 20+; the Vercel and Supabase CLIs download themselves the first time.

| Step | Command | What happens |
| --- | --- | --- |
| 1. What's missing | `./ship-keys check` | Table of every key the code uses: on this laptop? on Vercel? Names only. The agent can run this one. |
| 2. Log in (once per laptop) | `./ship-keys login` | Browser opens for Vercel (click Allow, pick/create the project), then for Supabase. |
| 3. Supabase values | `./ship-keys supabase` | Fetches the project URL + keys from Supabase into `.env.local` under the right names. |
| 4. Other API keys | `./ship-keys add OPENAI_API_KEY` | Paste the key from the dashboard; it stays hidden. `--vercel-only` = never saved on the laptop. |
| 5. Send to Vercel | `./ship-keys push` | Every key goes to Vercel (private ones locked). `--dry-run` shows the plan first. |
| 6. Database | `./ship-keys schema` | Runs `supabase/schema.sql` on the real database. Asks first. |
| 7. Go live | `./ship-keys deploy` | Builds on Vercel and prints the live link. |

Or steps 3, 5 and 7 in one go: `./ship-keys go`. In Kiro, say *"use the ship-keys skill"*: it runs
`check`, tells you what's missing and where to get it, and you run the rest yourself (login and the
hidden pastes need your terminal). It's safe by default: it adds `.env*` to `.gitignore`, refuses to
push if a keys file was ever committed, and adds a `.vercelignore` so `.env.local` isn't uploaded.

---

## Cheat sheet

```sh
TRACK=SHARED ./ralph/once.sh       # Wave 1, PC #1 on main
TRACK=A ./ralph/once.sh            # one ticket
TRACK=A ./ralph/afk.sh 10          # up to 10 tickets
AGENT=claude TRACK=B ./ralph/afk.sh
grep -l "Status: OPEN" issues/*.md # what's left
./ship-keys check                  # which keys the live site still needs
```
