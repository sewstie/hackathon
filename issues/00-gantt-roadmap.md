# UniFix — Gantt Roadmap (3-Stream Parallel Plan)

Wave 1 (`01-shared-foundation.md`, `Track: SHARED`) is built on `main` and pushed before anyone
branches. Then Tracks A / B / C run in parallel on separate branches/laptops; each ticket is only
blocked by `01` or tickets in its own track. Integration merges the three branches at the end.

```mermaid
gantt
    title UniFix — 3-Stream Parallel Build
    dateFormat YYYY-MM-DD
    axisFormat %m-%d

    section Wave 1 (Shared Foundation)
    01 Shared foundation (schema, types, stores, UI, seed) :done_shared, 2026-10-24, 1d

    section Track A (Stream 1)
    02 AI classifier + fallback            :a2, after done_shared, 1d
    03 Free-text reporting + confirm card  :a3, after a2, 1d
    04 Smart follow-ups (chips, max 3)     :a4, after a3, 1d
    05 Emergency takeover + safety note    :a5, after a3, 1d
    06 Names-a-person block                :a6, after a3, 1d

    section Track B (Stream 2)
    07 Priority ordering                   :b7, after done_shared, 1d
    08 Duplicate detection + co-sign       :b8, after done_shared, 1d
    09 Status lifecycle + notifications     :b9, after done_shared, 1d
    10 Routing + city handoff              :b10, after done_shared, 1d
    11 Abuse protection (rate limit/spam)  :b11, after b8, 1d
    12 Staff dashboard                     :b12, after b7, 1d

    section Track C (Stream 3)
    13 Landing + MA impact + search        :c13, after done_shared, 1d
    14 Campus home map                     :c14, after c13, 1d
    15 Private report routing + review     :c15, after done_shared, 1d
    16 Private thread + access + log       :c16, after c15, 1d
    17 Ari history + quick fixes           :c17, after done_shared, 1d

    section Integration
    Merge A + B + C, verify lint/test/build :integ, after a4, 1d
```

## Track file ownership (strict isolation — no shared feature files)

| Track | Owns (folders / files) | Tickets |
| --- | --- | --- |
| **SHARED** | `supabase/`, `src/types/`, `src/lib/store/`, `src/lib/supabase/`, `src/components/ui/`, `src/components/layout/`, `src/components/ari/` (shell), `src/app/layout.tsx`, `src/app/globals.css`, `database.types.ts`, `.env.example`, `src/test/` | 01 |
| **A — intake / AI / safety** | `src/modules/ai/`, `src/modules/reporting/`, `src/modules/emergency/`, `src/app/report/`, `src/app/api/classify/` | 02–06 |
| **B — triage / staff / lifecycle** | `src/modules/priority/`, `src/modules/duplicates/`, `src/modules/notifications/`, `src/modules/routing/`, `src/modules/abuse/`, `src/modules/staff/`, `src/app/staff/`, `src/app/report-detail/`, `src/app/my-reports/`, `src/app/campus-home/`, `src/components/notifications/`, `src/components/city-handoff/` | 07–12 |
| **C — private / discovery / presentation** | `src/modules/private/`, `src/modules/campuses/`, `src/modules/ari/` (logic), `src/app/(landing)/`, `src/app/campus/[campusId]/`, `src/app/private/`, `src/app/staff-private/`, `src/components/map/`, `src/data/` | 13–17 |

> Track A owns `src/app/report/` (the report screen and its Public/Private entry point live there).
> Track C's private screens live at top-level routes `src/app/private/` and `src/app/staff-private/`
> so they never nest inside A's `src/app/report/` or B's `src/app/staff/`. If a real collision shows
> up during the build, fix it on `main` and have every track `git merge main` (per the README).

## Commands

```sh
# Wave 1 — PC #1 on main, before branching
TRACK=SHARED ./ralph/once.sh
npm run lint && npm run test && npm run build
git push origin main

# Wave 2+ — one track per PC
git checkout main && git pull && npm install
git checkout -b track-a   # (track-b / track-c on the other PCs)
TRACK=A ./ralph/once.sh   # watch the first ticket
TRACK=A ./ralph/afk.sh 10 # then let it loop   (TRACK=B / TRACK=C elsewhere)
git push -u origin track-a

# Integration — PC #1, stop loops ~1h before deadline
git checkout main && git pull
git merge origin/track-a && npm run lint && npm run test && npm run build
git merge origin/track-b && npm run lint && npm run test && npm run build
git merge origin/track-c && npm run lint && npm run test && npm run build
git push origin main
```
