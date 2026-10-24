# UniFix v1 — Demo Polish & Fix Pass

## Problem Statement

UniFix works end to end, but a judge opening the demo doesn't experience it that way. The front door is a marketing pitch page, not the thing a student would actually use, so there's no scrollable list of everyone's reports to browse and upvote — which is the single most important first screen for a student demo. "Open the MIT demo" breaks on click. The notification bell in the header does nothing. The map is a pile of overlapping dots that's hard to read. There's no way to upvote an issue, no way to delete a report, and the private "direct chat" doesn't feel wired on the staff side. The product looks unfinished — the overall styling is rough, the logo is a leftover placeholder, and photo attachment is a bare file input. A judge can't tell whether they're looking at the student view or the staff view, many staff queues are empty so there's little to show, and Ari's identity doesn't match the Ari project it's meant to be aligned with.

## Solution

A single coordinated polish-and-fix pass on the existing app that makes the demo land well:

- The **student view opens on a scrollable feed** of all public campus reports, each with a one-tap **upvote (co-sign)** control and signer count, and a persistent **"Report an issue"** button top-right. A compact **report map** sits above the feed. The marketing/pitch content moves to its own **About** page.
- Opening the demo drops the judge **straight into the student feed**, then a **small dismissible pop-up** explains "you're seeing the student view" and offers a switch to the **staff view**; a clear role indicator/switcher stays in the header. After a short delay, a **one-time nudge** invites the judge to try filing a report.
- The broken **MIT demo entry is fixed at the root cause** (hardened client-only map, guarded data, an error boundary so a map failure never blanks the page).
- The **map is made legible** with severity-aware marker clustering, a tier color legend, and a toned-down heat layer.
- The **notification bell opens a real dropdown** (list, mark-read, empty state); the **university name gets its own separated header slot** distinct from the logo.
- A **delete control** lets a student remove their own report and staff remove any report.
- The **private report thread becomes a working two-way chat** (student ↔ office), reachable from both sides.
- A **visual refresh** (token-driven, Wispr-Flow-style) lifts the whole app; the **UniFix logo and favicon** replace the placeholder; the **report flow gets a pretty tabbed structure** with a polished optional **photo step**.
- The **seed data is enriched** so every staff team and key office shows varied reports; non-MIT campuses stay empty-but-usable with graceful empty states.
- **Ari's persona** (name, small avatar, friendly voice/chat feel) is aligned with the referenced Ari project, keeping UniFix's existing Ari functions.

## User Stories

1. As a judge opening the demo, I want to land directly in the student view, so that I immediately see what a student would use rather than a marketing page.
2. As a student, I want the home screen to be a long, scrollable list of all the reports other students have posted, so that I can see what's broken around campus at a glance.
3. As a student, I want to scroll through many reports quickly, so that browsing campus issues feels effortless.
4. As a student, I want a one-tap upvote on each report, so that I can signal "I have this problem too" and push popular issues up.
5. As a student, I want to see how many people have upvoted/co-signed a report, so that I understand how widespread the issue is.
6. As a student, I want tapping upvote again to remove my upvote, so that I can change my mind.
7. As a student, I want upvoting to make an issue more or less prominent in the list, so that the most-wanted fixes rise to the top.
8. As a student, I want a clearly visible "Report an issue" button in the top-right at all times on the feed, so that I can start a report without hunting for it.
9. As a student, I want a compact map of where problems cluster at the top of the feed, so that I can see the spatial picture and the list together.
10. As a judge, I want a small pop-up shortly after landing that tells me I'm seeing the student view, so that I understand what I'm looking at.
11. As a judge, I want the pop-up to offer a clear way to switch to the staff view, so that I can explore both sides of the same product.
12. As a judge, I want an obvious role indicator in the header, so that I always know whether I'm in the student or staff view.
13. As a judge, I want to switch roles from the header at any time, so that I can move between student and staff freely.
14. As a judge, I want a one-time, dismissible nudge a little after opening the demo inviting me to file a report, so that I try the core flow myself.
15. As a judge, I want the welcome pop-up and the "try reporting" nudge to never stack on top of each other, so that the onboarding feels calm.
16. As a visitor, I want the marketing/pitch content (impact numbers, how-it-works) on its own About page, so that the demo itself stays focused on using the product.
17. As a visitor, I want "Open the MIT demo" to work reliably, so that the demo never breaks on the first click.
18. As a judge, I want a map rendering problem to degrade into a graceful fallback instead of a blank page, so that one bad data point never kills the demo.
19. As a student, I want the map's dense areas to collapse into clear numbered clusters, so that overlapping reports are readable.
20. As a student, I want clusters colored by the highest severity inside them, so that I can spot the worst spots at a glance.
21. As a student, I want a legend mapping colors to severity tiers, so that I can interpret the map without guessing.
22. As a student, I want the heat layer to sit quietly in the background, so that the clusters are the primary signal.
23. As any user, I want the notification bell to open a dropdown of my notifications, so that I can actually read updates.
24. As any user, I want opening the notifications dropdown to mark them read, so that the unread badge reflects reality.
25. As any user, I want a friendly empty state when I have no notifications, so that the dropdown never looks broken.
26. As any user, I want the university name shown in its own slot in the header, distinct from the logo, so that it reads clearly ("UniFix | MIT").
27. As a student, I want to delete a report I filed, so that I can remove a mistaken or resolved post.
28. As staff, I want to delete any report on my campus, so that I can remove spam or abuse.
29. As any user deleting a report, I want a confirmation step, so that I don't delete something by accident.
30. As a student filing a direct (private) report, I want to exchange messages with the office handling it, so that we can clarify the issue privately.
31. As office staff, I want to reply to a student's private report from the staff-private view, so that the conversation is two-way.
32. As a student, I want new office replies to appear in my private thread, so that I stay informed.
33. As office staff, I want the private thread reachable from my office queue, so that I can respond where I already work.
34. As a student from another office's scope, I want to be denied access to a private thread that isn't mine, so that sensitive reports stay office-scoped.
35. As any visitor, I want the app to look clean and modern, so that it feels trustworthy and finished.
36. As any visitor, I want consistent styling across the pages I see in the demo, so that the product feels cohesive.
37. As any visitor, I want the correct UniFix logo and favicon, so that there's no leftover placeholder branding.
38. As a student filing a report, I want a polished, clearly stepped flow, so that I always know where I am in the process.
39. As a student filing a report, I want an attractive "Add a photo" step, so that attaching evidence feels easy and optional.
40. As a student, I want to preview, replace, or remove a photo before posting, so that I control what I attach.
41. As a student, I want to file a report without a photo, so that attaching one is never required.
42. As a student offline/without cloud configured, I want the photo preview to still work locally, so that the demo works without Supabase.
43. As a judge exploring staff, I want every staff team and key office to have several varied reports, so that each queue shows real content.
44. As a judge, I want to see reports across different categories, severities, and statuses, so that the breadth of the product is visible.
45. As a judge, I want some reports already marked fixed this week, so that the "fixed" view isn't empty.
46. As a judge, I want some duplicate reports in the seed, so that the duplicate-merge/co-sign feature is demonstrable.
47. As a judge opening a non-MIT campus, I want it to be empty-but-usable rather than a "coming soon" wall, so that the campus-agnostic claim holds.
48. As a judge on a campus with no reports, I want a friendly empty state on the feed and a pinless centered map, so that nothing looks broken.
49. As a student, I want Ari to feel like a consistent, friendly named assistant with a small avatar, so that the help experience feels polished.
50. As a student, I want Ari to still show past history and safe quick fixes, so that its existing usefulness is preserved.
51. As a student in an emergency, I want Ari's one-tap Call 911 takeover to still fire before any AI runs, so that safety behavior is unchanged.

## Implementation Decisions

**Scope & process**
- This is one coordinated polish/fix pass on the current working branch — not new parallel A/B/C tickets. Definition of done remains `npm run lint && npm run test && npm run build`.

**Routing & onboarding**
- The student view's home becomes a **scrollable feed of all public reports** for the campus, with a top-right persistent "Report an issue" action and a compact map section above it. The existing `/campus/[campusId]` page (map + priority list) is reshaped into this feed; the demo entry point resolves to the student feed instead of the pitch page.
- The marketing/pitch content (AICUM impact numbers, "How it works") moves from the root to a dedicated **About** route.
- On first demo entry the judge lands **directly in the student feed**; a **small, dismissible welcome pop-up** then explains the student view and offers a switch to staff. Shown once per session; it does not block entry.
- A **one-time, dismissible nudge** appears after a short delay (~15–20s or after some scrolling) inviting the judge to file a report, linking to the report flow. It is sequenced after the welcome pop-up so the two never overlap.
- The header keeps a **visible role indicator + switcher** (reuse the existing `RoleSwitcher` / active-user context).

**Feed mechanics**
- **Upvote = co-sign.** One co-sign per user per report, toggleable, reusing the existing `Store` co-sign methods (`addCoSign`, `countSigners`, `listCoSigns`) and the existing severity × reach priority formula. The feed shows the signer count. **No dislike/downvote.** (Toggle-off requires removing a co-sign; if the store lacks a remove path it is added as a minimal extension to the existing co-sign surface rather than a new seam.)
- **Feed ordering** is a pure function (most-signed / recency blend consistent with the documented priority rule), folded into the existing `priority` package rather than a new module.

**Delete**
- New store method **`deleteReport(reportId): Promise<void>`** on the `Store` interface, implemented in both `InMemoryStore` and `SupabaseStore`. Hard delete of the report and its co-signs. A confirm-gated delete control is shown to the report owner (own reports) and to staff (any report on the campus). No co-signer notification in the demo.

**Map**
- Fix the MIT-demo break at the root cause: keep the Leaflet map strictly client-only (`ssr:false`), guard against empty/missing coordinates and heat points, and wrap the map in an **error boundary** so a render failure renders a fallback instead of blanking the page. The exact thrown error is to be reproduced by running the dev server before fixing.
- Add **severity-aware marker clustering**: nearby reports collapse into a numbered bubble whose color reflects the **highest-severity** report inside; expands on zoom/click. Add a **tier color legend**. Keep tier colors. Soften the heat layer to a background signal.
- The clustering/grouping logic is a **pure transform added inside the existing `campuses` package** (alongside `buildMapData`), so it is testable without Leaflet or the DOM.

**Header**
- The **notification bell** opens a dropdown listing the active user's notifications (reuse `listNotifications`), marks them read on open (reuse `markAllRead`), and shows an empty state. The unread badge already exists and continues to reflect `countUnread`.
- The **university name** moves out of the logo link into its own separated header element with a divider ("UniFix | MIT").

**Private / direct chat**
- "Direct chat" is the private-report message thread, made fully two-way. The `private/thread` package already exposes `loadThread`, `postStudentMessage`, and `postOfficeReply`; the work is wiring the **staff-private view** to post office replies and ensuring the thread is reachable from both the student private report and the staff-private office queue. Office-scoped access control stays enforced in the `Store`.

**Visual refresh & branding**
- Token-driven restyle: refresh the CSS-variable palette (neutral base, one accent), typographic scale, spacing, radii, and shadows in the global theme and the shared UI primitives (cards, buttons, badges, inputs), applied consistently. No hardcoded hex — styling stays on Tailwind theme tokens / CSS variables per AGENTS.md. Prioritize the demo-critical surfaces (student feed, report flow, staff dashboard, header).
- Wire `design/logo.png` as the header logo and `design/favicon.ico` as the site favicon (replacing the Next default). Grep and replace any leftover "CF"/placeholder brand text or mark with UniFix branding. If `design/logo.png` is byte-identical to the current `public/logo.png`, flag it and request the intended file rather than silently shipping the old mark.

**Report flow**
- Restructure the report flow with a **pretty, visible step/tab header** (Describe → Details → Photo → Review), keeping the existing phase logic (AI classify → follow-ups → confirm → file) underneath.
- The **photo step** is a polished, optional affordance (tap/drag upload, image preview, remove/replace). Persistence reuses the existing reporting-module photo uploader (Supabase Storage via the injected `PhotoUploader`), falling back to a local object-URL preview when cloud isn't configured. A photo is never required to submit.

**Seed data**
- Enrich and rebalance the MIT seed so every public team (Facilities, Dining, Housing, IT, Grounds, Safety) and the key private offices have several reports each, spanning categories, tiers (Low→Urgent), and statuses (Received→Fixed, with some In-progress and Won't-fix), with varied co-sign counts so the ranking visibly differs. Include some "fixed this week" items and some duplicates (to demonstrate merge/co-sign). Regenerate `supabase/seed.sql` from the same source as the in-memory seed so both stores stay in sync. MIT stays the demo campus.
- Non-MIT campuses remain empty-but-usable (existing `resolveCampusView` fallback). The feed and map degrade gracefully on zero reports: a friendly empty state on the feed and a centered, pinless map.

**Ari**
- Align Ari's persona/presentation (consistent name "Ari", a small friendly avatar, a voice/chat-style feel and tone) with the referenced Ari project, while keeping UniFix's existing Ari functionality (past history, safe quick-fixes, emergency 911 takeover). Do not port the ElevenLabs voice/avatar technology or the apprentice-workflow behavior.

## Testing Decisions

A good test here asserts **external behavior through a module's public interface**, never private helpers or implementation details, and runs without the cloud or a browser. The existing suites (e.g. `src/test/store.test.ts`, `src/packages/campuses/tests/campuses.test.ts`, `src/packages/private/tests/private-access-thread.test.ts`) are the prior art to match.

- **`Store` (via `InMemoryStore`)** — test the new `deleteReport`: filing a report then deleting it removes it from `listReports` and removes its co-signs; deleting a non-existent id is a no-op. Prior art: `src/test/store.test.ts`. The co-sign toggle-off path (if added) is tested the same way against the co-sign methods.
- **`campuses` package** — test the new **map clustering transform** as a pure function: overlapping/nearby report coordinates collapse into the expected clusters; each cluster reports the highest severity among its members; non-overlapping reports stay as individual pins; zero reports yields no pins and a usable centered view. Prior art: the existing `buildMapData`/`getCampusView` tests in `campuses.test.ts`. No Leaflet, no DOM.
- **`priority` package** — test the **feed-ordering** pure function: higher co-sign counts and higher severity rank earlier, consistent with the documented severity × reach rule; ties broken deterministically. Prior art: the existing priority tests.
- **`private/thread` package** — already covered by `private-access-thread.test.ts` (student posts, office reply, cross-office denial). Extend only if the office-reply wiring surfaces a new behavior; the direct-chat work is primarily UI wiring to this existing, tested seam.
- **Presentational work** (welcome pop-up, nudge, header dropdown, theme, logo, photo tab, report-flow tabs, Ari persona) is verified through `npm run lint && npm run test && npm run build` and manual demo walkthrough, consistent with how the current UI pages are handled — not new unit seams.

## Out of Scope

- A general-purpose chat system (direct chat is strictly the private-report thread).
- Porting the referenced Ari project's ElevenLabs voice/talking-head technology or its expert-apprentice workflow behavior; only persona/presentation alignment is in scope.
- Real school-email authentication (demo role switching stays as-is).
- Downvote/dislike mechanics and any new popularity model beyond the existing co-sign + priority.
- Rich seed data for non-MIT campuses (they stay empty-but-usable); only MIT is richly seeded.
- Co-signer notifications on deletion.
- Soft-delete / undo for deleted reports (hard delete only).
- New parallel A/B/C tickets and Ralph track splitting (this is a single branch pass).

## Further Notes

- Two items to confirm while building (not blockers): (1) the exact MIT-demo runtime error, which must be reproduced by running the dev server before the fix is finalized; (2) whether `design/logo.png` actually differs from the current `public/logo.png` — if identical, request the intended logo asset.
- Facts grounding this spec: the `Store` interface already provides co-signs, notifications, private messaging, and status/tier updates but has **no delete method** (the one net-new seam). The private thread package already exposes `loadThread` / `postStudentMessage` / `postOfficeReply`. The reporting module already uploads photos via an injected `PhotoUploader` (Supabase Storage). `MIT_CAMPUS_ID` is `"mit"` and `resolveCampusView` already renders non-seeded MA campuses empty-but-usable. The map is rendered by a client-only Leaflet component (`campus-map-inner.tsx`) that reads `window`/`getComputedStyle` and loads `leaflet.heat` — the most likely source of the demo break.
- Architecture guardrails (AGENTS.md): deep modules with small interfaces, no new shallow helper files, styling only via theme tokens / CSS variables, `dependency-cruiser` boundaries enforced. New logic goes **inside existing packages** (`campuses`, `priority`, `private`) rather than new modules wherever possible — keeping the number of seams minimal (ideal: one new store method).
