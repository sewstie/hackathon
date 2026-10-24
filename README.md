# UniFix — report what's broken on campus, and watch it get fixed

**Hackachusetts · Sundai 2026 · Civic Action**

| | |
|---|---|
| **Live website** | https://hackathon-pi-ebon.vercel.app |
| **Demo campus** (no login) | https://hackathon-pi-ebon.vercel.app/campus/mit |
| **Team** | Vladislav Hushcha · Nicolas Nabhan · Guillermo |

## What it does

UniFix lets college students report what's broken on campus in plain language. You type what you
see — *"my wifi is down"*, *"the third-floor bathroom is flooded"* — and the app does the rest:

- **AI triage.** Each report is classified by category, severity and reach, then the app asks only
  the few details still missing (max 3 questions, location first, tap-chips over typing, with a
  "No specific place" option always available).
- **Smart routing.** The ticket is sent to the **one staff team** that actually fixes it (IT,
  Facilities, Safety, …). Each staff member only sees reports for their own area.
- **Severity × reach ranking.** Reports are prioritized by how bad and how widespread the issue is,
  never by upvotes alone.
- **Duplicate merging.** Similar reports collapse into a single co-signed ticket, so staff see one
  item and every co-signer gets notified on each status change (Received → … → Fixed).
- **Ari, a small robot helper.** Ari shows how often an issue has happened before, how fast it
  usually gets fixed, and safe quick fixes that might resolve the problem without a ticket.
- **Safety beats everything.** Emergency wording ("someone collapsed", "smells like gas") instantly
  shows **Call 911** and **Campus Police** — before any AI runs. Self-harm wording adds **988**.
  The app never auto-dials.
- **Private reports.** Issues that name a person go privately to exactly one office with a two-way
  staff ↔ reporter thread.
- **Comments + chat.** Public comments for everyone, plus a direct staff ↔ reporter chat;
  notifications open the conversation. Staff can **Mark solved** or **Dismiss** with a reason.
- **Live campus map.** Leaflet map with severity clusters; click a cluster to list its reports.
- **Junk stays out.** Spam, jokes and prize/money claims are rejected; public posts can't name people.
- **Any campus.** Every Massachusetts school from the challenge's IPEDS directory opens instantly,
  with MIT (Cambridge, MA) as the richly-seeded demo campus.

## Try it (no login needed)

1. Open the [live demo](https://hackathon-pi-ebon.vercel.app/campus/mit) — you start in the
   **student view**.
2. Click **Report**, type `my wifi is not working` → pick **No specific place** → see Ari's history
   and quick fixes → **Still broken — file it** → it routes to the **IT** team.
3. Type `somebody collapsed in the library` to see the emergency screen (it never dials).
4. Type `I won a million dollars` — it's rejected as not a real report.
5. **Switch to staff view** (banner). Pick a staff member — each sees only their own team. Open a
   report → **Message the reporter** → **Mark solved**.
6. Switch back to the student, open the bell, click the notification → you land in the chat.

## Tech stack

- **Next.js 16** (App Router, React 19) + **TypeScript** (strict, no `any`)
- **Tailwind v4** with theme tokens + shadcn-style UI primitives
- **Supabase** (Postgres + Storage) with a deterministic in-memory store + seed so the app works
  fully offline for the demo and tests
- **Vercel AI SDK** `generateObject` + **Zod** schema, Anthropic model (default `claude-opus-5-5`),
  server-only key, with a keyword fallback and timeout on every AI call
- **Leaflet** map (client-only) with severity heat clusters
- **Vitest** + Testing Library, including property-based tests with **fast-check**
- Deployed on **Vercel**

## Architecture

The codebase is organized as **deep modules** — big blocks of logic behind tiny public interfaces —
with `dependency-cruiser` enforcing that you can only import a package through its entry point.

- `src/app/` — routes (thin pages; interactive pieces are colocated client components)
- `src/modules/` — `ai` (classification), `reporting` (report flow), `emergency` (safety detection)
- `src/packages/` — deep modules: `priority`, `routing`, `duplicates`, `staff`, `private`,
  `notifications`, `comments`, `abuse`, `ari`, `campuses`
- `src/lib/store/` — the data seam (`getStore()` → Supabase when configured, else in-memory + seed)
- `src/components/` — UI primitives, layout/nav, the Leaflet map, Ari's robot, and onboarding tours

## Run it locally

```sh
npm install
npm run dev          # http://localhost:3000 — works offline with the in-memory MIT demo
npm run check        # typecheck + module boundaries + lint + tests + build
```

The app works without any keys (a keyword fallback sorts reports). To turn on the real AI, add an
Anthropic key and restart:

```sh
./ship-keys add ANTHROPIC_API_KEY
npm run ai:check     # every line should say [ai]
```

## Deploy

Shipping (Supabase + Vercel) is automated by `./ship-keys`, which moves keys from `.env.local` into
Vercel and Supabase and deploys — without ever printing a key value on screen. Run `./ship-keys go`
to create any missing projects, push the keys, run the schema, and deploy.

---

Built at **Hackachusetts (Sundai) 2026** for the Civic Action challenge by **Vladislav Hushcha**,
**Nicolas Nabhan**, and **Guillermo**.
