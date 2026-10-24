# UniFix — Spec

> Hackachusetts 2026 · Track 4 Civic Action · Challenge V4 "Better college experiences".
> Demo campus: **MIT** (Cambridge, MA). Product is campus-agnostic.
> This file is synthesis for `/to-tickets`; Ralph ignores it.

## Problem Statement

Students see broken things on campus every day — dead vending and ice-cream machines, broken
heaters, Wi-Fi dead zones, unsafe stairs, broken door openers — but rarely report them. They
don't know **who** to tell, official work-order forms are buried and slow, and when something
is reported nothing visible happens, so students stop bothering. Staff, on the other end, get
duplicates, vague reports with no location, and no sense of what actually matters most.
Sensitive situations — something that happened in a room, a problem involving a specific
person, harassment or discrimination — have no easy, private path at all, and in a genuine
emergency a reporting form is exactly the wrong thing to put in front of someone.

Existing tools don't fit: campus work-order forms are hard to find and give no updates;
Boston's BOS:311 (and Cambridge's SeeClickFix) don't cover campus property; anonymous boards
like Fizz are venting, not routing; emailing "someone" requires already knowing who.

## Solution

UniFix is the student-friendly front door to campus repairs that feeds existing campus
systems instead of replacing them. A student describes the problem in plain language. AI
classifies it (category, item, a neutral title, a severity tier), asks only for the few
details still missing — location first, tap-chips over typing, never more than three
questions — then routes it to the right staff team. If the same thing is already reported,
the student **co-signs** instead of filing a duplicate, so staff see one prioritized ticket
with real demand behind it. Every report has a visible status from Received to Fixed, and the
reporter and all co-signers are notified on every change.

A small robot assistant, **Ari**, shows past history for similar issues and up to two safe
quick fixes before a report is even filed. In an emergency, Ari takes over the whole screen
with a one-tap Call 911 button, instantly, before any AI runs. For anything sensitive — a
report that names a person, harassment, discrimination, something that happened in a room — a
**Direct (private) report** sends it to exactly one office, with a plain-language "private, not
confidential" notice and a link to confidential counseling.

Priority is driven by severity and reach, never popularity. Accessibility-affecting and
life-safety issues rise. The whole thing is campus-agnostic; MIT is the richly-seeded demo
campus.

## User Stories

### Reporting (public)
1. As a student, I want to describe a problem in my own words (up to 500 chars) with an optional photo, so that I don't have to navigate a rigid form.
2. As a student, I want AI to pick the category, item, a neutral title, and a severity tier for me, so that I don't have to understand campus org charts.
3. As a student, I want to change the AI's category if it's wrong, so that I stay in control of my report.
4. As a student, I want to be asked only the details that are actually missing, so that filing is fast.
5. As a student, I want to be asked location first and at most three follow-ups, one at a time, so that I'm never interrogated.
6. As a student, I want to answer with tap-chips drawn from my campus's real buildings, floors, dining halls and items, so that I rarely have to type.
7. As a student, I want a "Use my location" option that checks me against the building I picked, so that my report is trusted.
8. As a student, I want "Type instead" always available, so that I can report even when chips don't fit.
9. As a student, I want a confirmation card showing title, location, tier, and category — each editable — before posting, so that I can correct mistakes.
10. As a student, I want my report filed (and flagged incomplete) even if details are still missing after three questions, so that the app never traps me.
11. As a student, I want the app to keep working and still file my report even when the AI is slow or down, so that I'm never blocked by the AI.

### Duplicates & co-signing
12. As a student, once my location is known, I want the app to check for an existing open report of the same issue in the same building and category, so that I don't create a duplicate.
13. As a student, I want to be shown the matching report (title, location, signer count, status) and asked "Is this the same issue?", so that I can decide to co-sign.
14. As a student, I want to co-sign an existing report instead of filing a new one, so that my voice adds weight without adding noise.
15. As a student, I want to co-sign only once per report (and count as signed when I'm the reporter), so that counts are honest.
16. As a staff member, I want duplicates collapsed into one ticket with a real signer count, so that I see true demand.

### Severity & priority
17. As a staff member, I want tiers of Low, Medium, High, and Urgent, so that I can triage.
18. As a staff member, I want Urgent to always come first, so that the worst problems are never buried.
19. As a staff member, I want non-urgent priority to combine severity with signer count — severity weighted more than popularity — so that a serious issue outranks a merely popular one.
20. As a staff member, I want a very popular Medium to be able to overtake an unconfirmed/incomplete High, so that real demand can correct an uncertain rating.
21. As a staff member, I want to override the AI's tier, so that staff judgment is final.
22. As a student, I want tiers shown as text plus color (never color alone), so that they're readable regardless of vision.

### Emergencies & safety (safety beats everything)
23. As a student in danger, I want a full-screen red takeover with a one-line reason and a large Call 911 button the instant I submit something life-threatening, so that I get help immediately.
24. As a student in danger, I want a Call Campus Police button alongside Call 911, so that I can reach the right responder.
25. As a student, I want emergency detection to happen instantly on submit (keyword check) before any AI runs, so that the AI is never on the critical path for my safety.
26. As a student, I want the AI to be able to *raise* an emergency but never to *close* one, so that a wrong AI judgment can't put me at risk.
27. As a student, I want a clear "Not an emergency — continue my report" button, so that I can proceed when it's a false alarm (which then files to Safety as Urgent).
28. As a student, I never want the app to auto-dial; I want to tap Call myself, so that I stay in control.
29. As a student reporting a non-active hazard (broken railing, exposed wiring, ice on stairs, broken lock, missing extinguisher, chirping detector), I want a red safety note with the campus police number and no quick fixes, so that I'm warned without false alarm.
30. As the system, I want every Call 911 / Call Campus Police tap logged, so that there's an audit trail.

### Routing & city handoff
31. As a staff member, I want each report to land in its team's queue, so that the right people see it.
32. As a staff member, I want to reassign a report to another team, so that misrouted reports still get handled.
33. As a student reporting an off-campus public issue (pothole, public streetlight, sidewalk), I want a City handoff card with the correct city service, a copy-text button, a phone number, and a link — and nothing posted to UniFix — so that I'm pointed to the right place.
34. As a student on the MIT demo campus, I want the City card to reference **Cambridge SeeClickFix**, not Boston BOS:311, so that it's geographically correct.

### Closed loop & notifications
35. As a student, I want statuses of Received → Assigned → In progress → Fixed, or Won't fix (with a required reason), so that I always know where my report stands.
36. As a reporter or co-signer, I want a notification on every status change ("[title] is now [status]"), so that I'm never left wondering.
37. As a student, I want a bell in the header showing my unread notifications, so that updates find me.
38. As a student, I want a "Fixed this week" list on the campus home, so that I can see the app works.

### Anonymity
39. As a student, I want to see only counts, never who filed or co-signed, so that reporting is safe.
40. As a staff member, I want to see the reporter's name and email on public reports, so that I can follow up.
41. As a student, I want the report screen to say "Anonymous to students. Staff can see who filed.", so that I know exactly who sees what.
42. As a student, when my public report names a specific person, I want it blocked with a message that it can't be reported publicly and the options to **Rephrase** or **Send privately**, so that I don't accidentally expose someone.

### Abuse protection
43. As the system, I want a max of 5 reports per user per hour with a friendly message on the 6th, so that spam is throttled (co-signs don't count; emergencies are exempt).
44. As the system, I want a report flagged "location unverified" when "Use my location" puts the device more than 500 m from the chosen building, so that staff can weigh trust.
45. As the system, I want spam, abuse, and off-topic reports rejected with a friendly reason while keeping the student's text, so that honest mistakes are easy to fix.

### Ari: history & quick fixes
46. As a student, after classification (never in an emergency, safety hazard, or person-naming private report), I want Ari to pop up with a one-line message, so that the app feels responsive and human.
47. As a student, I want a history line ("9 similar reports this semester · usually fixed in ~3 days" or "First report like this here."), so that I know what to expect.
48. As a student, I want up to two safe quick fixes, so that I can solve it myself if it's easy.
49. As a student, I want a "That fixed it" button that logs a self-resolution and files nothing, so that I don't create noise for a solved problem.
50. As a student, I want a "Still broken — file it" button, so that I can continue when the fix didn't work.
51. As a staff member, I want to promote my own fix into the quick-fix list, so that students can self-serve next time.
52. As a student, I never want quick fixes shown for safety issues or private reports involving a person, so that I'm not given a band-aid for something serious.

### Staff dashboard
53. As a responder, I want a tab for my public team's queue, so that I work one focused list.
54. As a responder with an office, I want a Private inbox tab, so that I can handle sensitive reports routed to me.
55. As a responder, I want the queue sorted by priority then oldest-first, showing tier, title, location, signers, age, status, and flags (incomplete, location unverified), so that I know what to do next.
56. As a responder, I want to open a row and see the full description, photo, and reporter, so that I have context.
57. As a responder, I want status buttons, reassign, tier override, a note, and "Promote a quick fix" on the detail view, so that I can act.
58. As a responder, I want to filter by status and building, so that I can focus the queue.

### Direct (private) reports
59. As a student, I want a Private tab on the report screen (and to be redirected there when a public report names a person), so that sensitive issues have a path.
60. As a student, I want a private report to be allowed to name people, rooms, and times, so that I can describe what actually happened.
61. As a student, I want AI to pick one office, defaulting to Dean of Students when unclear, so that I don't have to know who handles what.
62. As a student reporting sexual misconduct, harassment, or discrimination, I want it routed to Title IX regardless of AI, so that it reaches the right office.
63. As a student in immediate danger, I want the emergency takeover first, then Campus Police, so that safety comes before paperwork.
64. As a student, I want to change the chosen office via a dropdown on the review screen, so that no AI mistake is final.
65. As a student, I want a "Don't share my name" toggle ("They won't be able to contact you directly."), so that I can stay anonymous to the office.
66. As a student, I want the exact notice "Private, not confidential. Only [office name] will see this. Staff may be required to act on what you report." plus a link to the Counseling Center, so that I'm not misled about confidentiality.
67. As a student, I want private reports to never appear in the feed, map, Fixed this week, duplicates, co-signing, or Ari history, so that they stay private.
68. As a student, I want a private message thread with the office and statuses Received → Reviewing → Resolved or Referred (note required), so that we can communicate and I see progress.
69. As a student, I want notifications on office replies and status changes, so that I don't have to check back.
70. As a staff member, I want every view, reassign, and status change on a private report logged, so that access is auditable.
71. As a staff member, I want reassigning a private report to remove the previous office's access, so that least-exposure holds.
72. As a staff member from another office, I want to be denied access to a private report that isn't mine, so that students are protected.

### Campuses, map, landing
73. As a visitor, I want a landing page with the pitch line, the Massachusetts economic-impact numbers with sources, and a 3-step "How it works" (Report → Routed → Fixed), so that I understand why this matters.
74. As a visitor, I want to search Massachusetts institutions and open any one of them, so that the product clearly works for any campus.
75. As a student, I want the campus home to show a Report button, a map, open reports by priority, and Fixed this week, so that it's my hub.
76. As a student, I want a map with report pins colored by tier and a density heat layer of the last 120 days, so that I can see where problems cluster.
77. As a student on an unseeded campus, I want to still be able to file (location falls back to free text), so that the product is genuinely campus-agnostic.

### Identity & roles (demo)
78. As a demo operator, I want a header role switcher ("Viewing as: Ana (student)") instead of real login, so that I can show every perspective quickly.
79. As the product (future), I want login by school email, so that real students and staff are authenticated — this is wired but disabled for the demo.

### Accessibility & responsiveness
80. As a student on a 360 px phone, I want no horizontal scroll and the emergency takeover to fit on screen, so that it works on real devices.
81. As a keyboard user, I want every control reachable and dialogs to trap focus, so that I can use the app without a mouse.
82. As a keyboard user, I want the emergency takeover to focus Call 911 on open, so that help is one keystroke away.
83. As a motion-sensitive user, I want animations suppressed when I ask for reduced motion, so that the app is comfortable.
84. As a low-vision user, I want text contrast of at least 4.5:1, so that I can read everything.

## Implementation Decisions

### Platform & data
- **Real Supabase** (Postgres + Storage): one shared cloud project used by all laptops at runtime/demo. The Supabase anon key is a client key (safe in `NEXT_PUBLIC_*`); the only true server secret is the AI key.
- Database **schema**, `seed.sql`, and generated `database.types.ts` are produced in **Wave 1 / Track SHARED** and committed before any feature track branches.
- Every store/data-access module has **two implementations behind one interface**: a Supabase-backed one for runtime, and a deterministic in-memory/seed-backed one used by tests (no cloud in tests).

### AI classification
- **One server-side `generateObject` call** (Vercel AI SDK `ai`, provider `@ai-sdk/anthropic`) against a single Zod schema returns the whole classification at once: `category`, `item`, `title`, `tier`, `missingDetails[]`, `namesPerson`, `rejected` (+reason), and, in private mode, `suggestedOffice`.
- The call is **bounded** with `abortSignal: AbortSignal.timeout(...)` (~6 s). On timeout, error, or missing key it falls through to a **pure keyword fallback classifier** (safe default category + Medium tier, report flagged). The app never blocks on the AI.
- The AI key (`ANTHROPIC_API_KEY`) and model (`AI_MODEL`, default a Claude Haiku-class model) live only in `.env.local`, server-side; never shipped to the browser.

### Emergency & safety (pure, client-first)
- `detectEmergency(text)` is a **pure function** running **client-side the instant the user submits**, before any network call; a match renders the full-screen takeover immediately.
- AI may **independently raise** an emergency (via `emergency`/Urgent on a life-safety category) but **can never lower** one. The only dismissal is the explicit "Not an emergency — continue" action, which files to **Safety as Urgent**.
- `detectSafetyHazard(text)` is a separate, lower-severity pure function driving the non-takeover red note (campus police number, no quick fixes).
- Call 911 / Campus Police render as `tel:` links the user must tap; **never auto-dial**; every tap is logged.

### Priority (pure function)
- Urgent tier always sorts above all non-Urgent.
- Otherwise `score = severityWeight + min(signers, 90)` with `Low=0, Medium=100, High=200`; an **unconfirmed/incomplete High is penalized ~30** so a popular Medium can overtake it. Ties broken **oldest-first**.
- Example from prototype reasoning that encodes the rule: `High(200)+4 = 204` beats `Medium(100)+9 = 109`; an incomplete `High(200−30)=170` can be passed by a popular `Medium(100+90)=190`.

### Duplicate detection (pure, no AI)
- Candidate set = open (not Fixed/Won't-fix) reports in the **same building AND same category**.
- Match when the **item matches after normalization** (lowercase, trim, hyphen/synonym-tolerant); same floor/room preferred, not required. Surface the single best candidate (highest priority, else newest). Co-sign attaches; decline files new.

### Names-a-person (public only)
- `namesPerson` comes from the AI call, backed by a **keyword fallback** (honorifics — Professor/Prof/Dr./Dean/Coach/RA/Mr./Ms./Mrs. — and relationship/accusation phrases like "my roommate", "someone keeps…").
- On the **public** path a flagged report is **blocked and never persisted** (nothing stored, hidden or otherwise); the text stays in the client form; **Rephrase** re-validates, **Send privately** carries the text into the Private tab. The private path is explicitly allowed to name people.

### Private reports & office-scoped access
- AI suggests `suggestedOffice` from a fixed list (Facilities, Housing, Dean of Students, Title IX, Campus Police, Accessibility Services, IT Security). **Deterministic hard rules override**: harassment/discrimination/protected-class → **Title IX**; immediate danger → **emergency takeover then Campus Police**. Unclear/AI-off → **Dean of Students**. Student can override via a dropdown.
- Access control is enforced **in the private-reports module**, not only in the UI: each read/write takes the active actor (role + office) and is **denied unless the actor's office equals the report's `currentOffice`**.
- Reassignment sets `currentOffice` to the new office, which by construction removes the previous office's access.
- An **append-only access log** records actor, action (view/reassign/status-change), timestamp, reportId.
- Private **message thread** = office-scoped `private_messages` ({reportId, authorRole, authorId, body, createdAt}); two-way; each reply and every status change (Received → Reviewing → Resolved/Referred, Referred requires a note) writes a notification to the other side. "Don't share my name" hides the student's identity from staff while keeping the thread working.

### Identity (demo)
- Designed for **school-email login, disabled for the demo**; a header **role switcher** selects a seeded user. Switching re-reads that user's notifications and office-scoped access.
- `users`: `id, name, email (@mit.edu), role (student | responder), publicTeam?, privateOffice?`. Real Supabase Auth is a drop-in later resolving to the same row by email — no schema change.
- Switcher roster (grouped Students/Staff, defaults to **Ana**): students Ana/Ben/Cam; one responder per public team (Facilities, Dining, Housing, IT, Grounds, Safety); private-office staff for the offices the scenarios touch (Dean of Students, Title IX, Housing, Accessibility, Campus Police, IT Security). ~40 background co-signer students exist in data only.

### Notifications
- Persisted `notifications` rows, one per recipient, with a `read` flag. The header bell reads unread for the active user and **refetches on role-switch / navigation / short interval** (no Supabase Realtime for the demo).

### Follow-ups
- Chips are generated from **seeded campus data** (buildings/floors/dining halls/items); unseeded campuses fall back to free-text "Type instead". Location-first, one-at-a-time, **hard cap of 3**; still-missing → file + **incomplete flag**.
- "Use my location" reads the browser Geolocation API and compares to the chosen building's **seeded coordinates**; >500 m → **location-unverified flag**. Confirmation card (title/location/tier/category, each editable) precedes posting.

### Abuse protection
- Rate limit **5 reports/user/hour** (rolling 60-min window, co-signs excluded, **emergencies exempt**) enforced in the reporting module; threshold is a tunable constant so the demo can trigger it. Exact copy on the 6th.
- Spam/abuse/off-topic from the AI `rejected` field + keyword fallback; rejection shows a friendly reason, **keeps the text**, persists nothing.

### Ari
- History line is a **pure computation** over seeded reports (same-campus + same-category/item count this semester and average fix time of Fixed ones; else "First report like this here.").
- Quick fixes are **curated rows** `{campusId, category, item?, text}` (seeded + staff-promoted via the dashboard), **never AI-generated**; up to 2 shown; suppressed for emergency/safety/private-person. "That fixed it" writes a self-resolution and files nothing; "Still broken" proceeds.

### Staff dashboard
- Scoped to the active responder: their own **public-team tab** + a **Private inbox** only if they hold an office. Queue sorted by the priority rule then oldest-first with the specced row fields and flags. Detail view wires status → notifications, tier override → priority, reassign → access rules. Status + building filters client-side. Private inbox is office-scoped and logs every view.

### Campus, city handoff, map
- Product is **campus-agnostic**; **MIT** is the single richly-seeded demo campus (buildings, dining halls, demo users, ~40 historical reports, 2 direct reports, curated quick fixes). MIT facts: MIT Police 617-253-1212 (non-emergency 617-253-2996); counseling at MIT Health Mental Health & Counseling (health.mit.edu); campus center ≈ 42.3601, -71.0942.
- **City handoff is campus-configured** (each campus carries city name + service URL + phone). MIT shows **Cambridge SeeClickFix** (cambridgema.gov/SeeClickFix, 617-349-4300), not BOS:311. Off-campus detection (pothole/streetlight/sidewalk) stays; only the destination is campus-driven.
- **Map**: `react-leaflet` + **OpenStreetMap tiles** (no API key), tier-colored pins + `leaflet.heat` density layer over the last 120 days, loaded **client-only** via `next/dynamic` `{ ssr: false }`. Landing search reads an **IPEDS HD** subset (`INSTNM, CITY, STABBR, LATITUDE, LONGITUD`) for MA institutions; any school opens its campus home (MIT seeded, others empty-but-usable).

### Scripted seed
- `seed.sql` is authored to the demo beats: an open Dining ice-cream-machine report at **14 signers**; a **High broken-handrail (4 signers)** and a **Medium Wi-Fi-drops (9 signers)** for queue order; enough Wi-Fi history for Ari's "9 similar · ~3 days"; **2 direct reports** (Housing + Title IX); curated quick fixes; named demo users with `@mit.edu`; background reports to fill map/heat/Fixed-this-week.

### Tracks (3-way parallel safety)
- **SHARED (Wave 1, `01-shared-foundation.md`)**: schema + `seed.sql` + `database.types.ts`; store interfaces **and** working implementations (Supabase + in-memory-for-tests) for reports, users, notifications, access-log, campuses, private-messages; shared domain types/enums (Report, Tier, Category, Office, Status, User); `components/ui` primitives (shadcn, accessible by default); app layout, header (campus name, bell, role switcher), nav, tier color tokens, routing skeleton; Ari shell component.
- **Track A — intake/AI/safety**: F1 free-text, F2 follow-ups, F5 emergency + safety hazard, F8 names-a-person block, F16 report-screen a11y; the bounded `generateObject` call + keyword fallback.
- **Track B — triage/staff/lifecycle**: F3 dedupe/co-sign, F4 tiers/priority, F6 routing + city handoff, F7 status lifecycle + notifications + Fixed-this-week, F9 abuse/rate-limit, F12 staff dashboard.
- **Track C — private/discovery/presentation**: F15 private reports + access control + thread, F11 Ari history & quick fixes, F13 map, F14 landing + MA impact, IPEDS campus search.
- Each track owns disjoint `src/modules/*` and route folders; cross-track needs go through SHARED interfaces only.

### Removed from scope
- **F10 QR quick reports is removed entirely** — no QR deep links, seed rows, printable sheet, QR-image library, or QR-sheet screen. Demo case #13 is dropped. The report flow is always free-text + follow-up chips.

## Testing Decisions

- **What makes a good test here:** it asserts externally observable behavior through a deep
  module's public `index.ts` interface — never private helpers, never mocked internals. The
  interface is the test surface (AGENTS.md §2).
- **Seams (prefer the fewest; the design uses two):**
  1. **The store interface** — tests run against the in-memory/seed-backed store implementation
     instead of Supabase, so data behavior is deterministic and offline.
  2. **The language-model boundary** — tests inject `MockLanguageModelV4` from `ai/test` instead
     of calling Anthropic, so classification is deterministic and offline.
  No other seams are introduced; everything else is tested as a pure function or through the
  module interface over those two seams.
- **Modules tested (through their interface):** reporting, ai/classification (+ fallback),
  emergency/safety detection, duplicates, priority, routing, notifications, private (access
  control + thread), abuse/rate-limit, Ari history/quick-fixes, campuses.
- **Pure-rule unit tests mapped to demo cases:** priority ordering (case 10), duplicate match
  (case 3), `detectEmergency`/`detectSafetyHazard` (cases 1, 2), names-a-person block (case 5),
  private routing (case 6), office-scoped access denied (case 8), rate limit (case 11), Ari
  history line (case 4), AI-unavailable fallback (case 16).
- **Component tests (Vitest + jsdom + Testing Library):** reserved for requirement-bearing UI —
  chiefly the emergency takeover focusing Call 911 and trapping focus (constraint 1, case 15).
- **Prior art:** none yet (greenfield). SHARED establishes the first interface-level test as the
  pattern every track follows; each ticket is TDD'd red → green → refactor.
- **Gate:** `npm run lint && npm run test && npm run build` must pass before any commit; tests
  require no secrets or network.

## Out of Scope

- **QR quick reports (former F10)** — removed entirely.
- **Real authentication** — login is designed for school email but disabled for the demo; the
  role switcher stands in. No password/SSO flows are built.
- **Supabase Realtime / websocket push** — notifications are polled/refetched, not live-pushed.
- **Production-grade security** — office-scoped access + access log are demo-grade enforcement at
  the module boundary (no RLS, shared anon key). Production would add Supabase RLS.
- **Rich seeding of non-MIT campuses** — any MA school is selectable and opens an empty-but-usable
  campus; only MIT has demo content.
- **Image processing beyond a basic client-side type/size guard**; photos are stored as URLs.
- **Fact-checking or altering the AICUM impact numbers** — used verbatim with the given citation.
- **Native mobile apps**; this is a responsive web app (mobile-first student, desktop-first staff).

## Further Notes

- Safety precedence is absolute: emergency detection is client-side and instant, AI can only
  raise never lower, nothing auto-dials, and quick fixes never show for safety or person-naming
  private reports.
- "Private, not confidential" must be stated before a direct report is sent, with a counseling
  link — this is a hard constraint, not a nicety.
- The brief's Boston/BOS:311 copy was corrected to Cambridge SeeClickFix because the demo campus
  is MIT (Cambridge); the City handoff is campus-configured so the app stays campus-agnostic.
- Facts verified for the demo: MIT Police 617-253-1212 / non-emergency 617-253-2996; MIT Health
  Mental Health & Counseling (health.mit.edu); MIT center ≈ 42.3601, -71.0942; Cambridge
  SeeClickFix (cambridgema.gov/SeeClickFix, 617-349-4300); IPEDS HD columns INSTNM/CITY/STABBR/
  LATITUDE/LONGITUD; react-leaflet + OSM needs no key; Vercel AI SDK `generateObject` + Zod with
  `abortSignal` timeout and `MockLanguageModelV4` for tests.
- Next steps after this spec: run `/to-tickets issues/00-spec.md` to generate
  `01-shared-foundation.md`, the A/B/C feature tickets, and `00-gantt-roadmap.md`; and update
  `feature-brief.md` / `AGENTS.md` to reflect the MIT demo campus, Cambridge city handoff, and QR
  removal before Wave 1 begins.
