# UniFix — Feature Brief

**Hackachusetts 2026 · Track 4: Civic Action · Challenge V4 "Better college experiences"**
Deadline: 8pm, Saturday, October 24, 2026.

## 1. Summary

UniFix lets college students report what's broken on campus in plain language. AI classifies each report, asks only for the details that are missing, merges duplicates, ranks by real priority, and routes it to the right staff team. Students co-sign issues instead of re-posting them and get notified when they're fixed. A **Direct report** mode sends sensitive issues, including ones that name a person or a room, privately to the one office that handles them. **Ari**, a small robot assistant, shares history from past reports and safe quick fixes. In an emergency, Ari takes over the screen with a one-tap **Call 911** button.

**Pitch:** *Colleges are Massachusetts's biggest economic engine, and the students inside them have no good way to say what's broken.*

## 2. Starting state

- Empty Next.js app scaffold; no data, no features yet.
- One demo campus is fully seeded (Massachusetts Institute of Technology, Cambridge MA): ~12 buildings, demo users, ~40 historical reports, 2 direct reports, curated quick fixes.
- Other Massachusetts campuses come from the IPEDS directory and are selectable in search; only MIT has seeded demo content, others open empty-but-usable.
- No real login: a role switcher in the header picks a seeded user.

## 3. The problem

- Students see broken things daily (dead machines, broken heaters, Wi-Fi dead zones, unsafe stairs) but rarely report them, because they don't know **who** to tell and official forms are buried and slow.
- When something is reported, nothing visible happens, so students stop bothering.
- Staff get duplicates, vague reports without location, and no sense of what matters most.
- Sensitive issues (something happened in a room, a problem with a person) have no easy private path.

**Massachusetts context** (landing page and pitch): private nonprofit colleges alone account for $71.1B in economic impact, 321K+ jobs, and $2.4B in annual tax revenue (AICUM, 2025). Those 59 schools educate 285,000+ students and employ nearly 100,000 people. Boston-based members contribute $64B a year to the eastern Massachusetts economy. This excludes UMass and community colleges.

**Why not existing tools:** campus work-order forms are hard to find and give no updates; city 311 / SeeClickFix doesn't cover campus property; anonymous boards (Fizz) are venting, not routing; emailing "someone" requires knowing who. UniFix is the student-friendly front door that feeds existing campus systems, not a replacement.

## 4. Hard constraints (non-negotiable)

1. **Safety beats everything.** Emergencies trigger Ari's full-screen takeover with one-tap Call 911 and Campus Police, instantly, before any AI call finishes. Never auto-dial. Never show quick fixes on any safety issue.
2. **Public reports never name people.** Anything about a person goes through Direct reports.
3. **Private is not confidential.** Say so plainly before a direct report is sent, and link confidential counseling.
4. **Anonymous to students, visible to staff** for public reports.
5. **Priority, not popularity.** Sort by severity × reach, never by co-signs alone.
6. **Ask the fewest questions possible.** Max 3 follow-ups, location first, tap-chips over typing.
7. **Every report gets a visible ending.** Status changes notify the reporter and every co-signer.
8. **Least exposure.** Direct reports are seen by one office only, and every staff view is logged.
9. **The app never gets stuck because of the AI.** If AI fails or is slow, fall back to safe defaults and keep going.

## 5. Users and roles

- **Student:** files public or direct reports, co-signs, sees status, gets notifications, messages an office privately.
- **Responder (staff):** works one public team queue and, if assigned, one private office inbox.

**Public teams:** Facilities, Dining, Housing, IT, Grounds, Safety, plus City (handoff only, no queue).
**Private offices:** Facilities, Housing, Dean of Students, Title IX, Campus Police, Accessibility Services, IT Security.

**Demo users:** students Ana, Ben, Cam (plus ~40 background students used as co-signers); staff for each team; Dean of Students, Title IX Office, Accessibility Services.

## 6. Features

### F1 — Free-text reporting
Student describes the problem in their own words (up to 500 chars) with an optional photo. AI picks category, item, a neutral title, and severity tier; the student can change the category. While AI works, Ari shows "Reading your report…".

### F2 — Smart follow-ups
Only missing details are asked, one at a time, location first, max 3 questions, answered with tap-chips ("Use my location" and "Type instead" available). Required details per category:
- Facilities: building, floor, item, could someone get hurt
- Dining: dining hall, item
- Housing: residence hall, room
- IT: building, Wi-Fi or wired
- Grounds: building or landmark, item
- Safety: building, is anyone in danger right now

If details are still missing after 3 questions, the report is filed and flagged incomplete. Before posting, a confirmation card shows title, location, tier, and category, each editable.

### F3 — Duplicate detection and co-signing
Once the location is known, the system checks open reports in the same building and category. If it's likely the same issue, it asks "Is this the same issue?" showing title, location, signer count, and status. Co-signing adds the student as a backer instead of creating a new report. One co-sign per student; the reporter counts as signed.

### F4 — Severity tiers and priority
Tiers: Low, Medium, High, Urgent. Urgent always comes first; otherwise priority combines severity with the number of signers, so severity matters more than popularity, but a medium issue with many co-signs can pass an unconfirmed high one. Staff can override the tier. Tiers are always shown as text plus color.

### F5 — Emergencies: Ari takes over the screen
- **Emergency** (life-threatening now): fire, smoke, gas smell, medical emergency, unconscious, not breathing, overdose, seizure, heavy bleeding, violence, weapon, someone trapped. Triggers a full-screen red takeover with Ari, a one-line reason, a large Call 911 button, a Call Campus Police button, and "Not an emergency — continue my report".
- Detection is instant on submit (keyword check), and AI rating something urgent also triggers it. AI disagreeing never closes it.
- Continuing files the report to Safety as Urgent. Call taps are logged. Never auto-dials.
- **Safety hazard** (dangerous, not active): broken railing, exposed wiring, ice on stairs, broken lock, missing extinguisher, chirping smoke detector. Shows Ari's normal popup with a red safety note and the campus police number, and no quick fixes.

### F6 — Routing and city handoff
Each report goes to its team's queue; staff can reassign. Off-campus public issues (street pothole, public streetlight, sidewalk) are not posted; instead a City issue card is shown. The handoff destination is **campus-configured** (each campus carries its city's name, service URL, and phone). For the MIT demo campus it says "This looks like a City of Cambridge issue. Report it on Cambridge SeeClickFix." with a copy-text button, the Cambridge city line (617-349-4300), and a link to cambridgema.gov/SeeClickFix.

### F7 — Closed loop and notifications
Statuses: Received → Assigned → In progress → Fixed, or Won't fix (reason required). Every status change notifies the reporter and all co-signers ("[title] is now [status]"). A bell in the header shows unread notifications. Campus home shows a **Fixed this week** list.

### F8 — Anonymity
Students only see counts, never who filed or co-signed. Staff see reporter name and email. The report screen says "Anonymous to students. Staff can see who filed." A public report that names a person is blocked: "Public reports can't name people. You can rephrase it, or send it privately to the right office." with **Rephrase** / **Send privately instead**.

### F9 — Abuse protection
Max 5 reports per user per hour ("You've filed a lot in the last hour. Try again a bit later."). If "Use my location" puts the device more than 500 m from the chosen building, the report is flagged location unverified. Spam, abuse, and off-topic reports are rejected with a friendly reason, keeping the text.

### F10 — (removed)
QR quick reports are out of scope. The report flow is always free-text + follow-up chips; there is no QR deep link, QR seed data, or printable QR sheet.

### F11 — Ari: history and quick fixes
After classification (not in emergencies), Ari pops up with a one-line message, a history line ("9 similar reports this semester · usually fixed in ~3 days" or "First report like this here."), and up to 2 safe quick fixes. **That fixed it** logs a self-resolution and files nothing; **Still broken — file it** continues. No fixes for safety issues or private reports involving a person. Staff can promote their own fixes into the quick-fix list.

### F12 — Staff dashboard
Tabs for each public team plus a **Private inbox** (if the responder has an office). Queue sorted by priority, then oldest first, showing tier, title, location, signers, age, status, and flags (incomplete, location unverified). Opening a row shows full description, photo, reporter, status buttons, reassign, tier override, note, and Promote a quick fix. Filters by status and building.

### F13 — Campuses and map
Landing page search over Massachusetts institutions. Campus home shows a map with report pins colored by tier and a density heat layer of the last 120 days.

### F14 — Landing page
Pitch line, the Massachusetts impact numbers with sources, and a 3-step "How it works" (Report → Routed → Fixed).

### F15 — Direct (private) reports
- A **Private** tab on the report screen (and the redirect from F8). May name people, rooms, and times.
- AI picks one office. Unclear → Dean of Students. Sexual misconduct, harassment, discrimination → Title IX. Immediate danger → emergency takeover first, then Campus Police.
- Follow-ups only for missing location or time (max 3).
- Review screen: "Going to: [office]" with a dropdown to change it; toggle **"Don't share my name"** ("They won't be able to contact you directly."); exact notice: **"Private, not confidential. Only [office name] will see this. Staff may be required to act on what you report."** plus "Want to talk to someone confidentially? Counseling Center →".
- Never appears in the feed, map, Fixed this week, duplicates, co-signing, or Ari history.
- Private message thread between student and office. Statuses: Received → Reviewing → Resolved or Referred (note required). Status changes and office replies notify the student.
- Every staff view, reassign, and status change is logged. Reassigning removes the previous office's access. Responders from other offices are denied.

### F16 — Accessibility and responsiveness
Student screens are mobile-first (360 px+); staff dashboard is desktop-first but tablet-usable. Everything is keyboard-reachable, dialogs trap focus, the emergency takeover focuses Call 911. Respects reduced motion. Text contrast ≥ 4.5:1.

## 7. Screens

- **Landing:** pitch, impact numbers, How it works, school search.
- **Campus home:** Report button, map, open reports by priority, Fixed this week.
- **Report:** Public / Private tabs and the full report flow.
- **Report detail:** title, location, tier, status timeline, signer count, Co-sign button.
- **My reports:** my reports, ones I co-signed, my private reports.
- **Private report:** status and message thread.
- **Staff dashboard** and **staff private report** view.
- **Header everywhere:** logo, campus name, notification bell, role switcher ("Viewing as: Ana (student)").

## 8. User cases (demo scenarios)

1. "there's smoke coming from the 3rd floor lab" → takeover appears instantly, Call 911 focused, Campus Police number shown; "Not an emergency" files it to Safety as Urgent.
2. "smoke detector chirping in my room" → no takeover; safety hazard note, no quick fixes.
3. "ice cream machine broke again" → asks only which dining hall → finds the existing report (14 signers) → Co-sign → count goes to 15.
4. "wifi keeps dropping" → asks building, then Wi-Fi or wired → Ari shows history and the reconnect fix → "That fixed it" files nothing.
5. A public report naming "Professor Smith" → blocked → Send privately → routed to Dean of Students → exact privacy notice shown.
6. Private "my roommate keeps leaving the door unlocked" → Housing. "someone keeps making comments about my race" → Title IX.
7. "Don't share my name" → staff see no sender.
8. Staff opens a direct report → view is logged; staff from another office is denied.
9. Staff marks the ice cream report Fixed → every co-signer gets a bell notification.
10. Queue order: Urgent first; High "broken handrail" (4 signers) above Medium "Wi-Fi drops" (9 signers).
11. 6th report within an hour → rate-limit message.
12. "pothole on Mass Ave" → City issue card (Cambridge SeeClickFix); nothing posted.
13. No student-facing screen ever reveals who filed or co-signed.
14. At 360 px width there's no horizontal scroll and the takeover fits on screen.
15. With AI unavailable, reports still file using fallback classification.

## 9. Key copy

| Where | Text |
|---|---|
| Report box placeholder | "What's wrong? e.g. 'ice cream machine in Morgan is broken again'" |
| Anonymity line | "Anonymous to students. Staff can see who filed." |
| Ari thinking | "Reading your report…" |
| After posting | "Sent to {Team}. We'll let you know when it changes." |
| Co-signed | "You're on it. We'll notify you when it's fixed." |
| Rate limit | "You've filed a lot in the last hour. Try again a bit later." |
| Names-person block | "Public reports can't name people. You can rephrase it, or send it privately to the right office." |
| Direct notice | "Private, not confidential. Only {Office} will see this. Staff may be required to act on what you report." |
| City card | "This looks like a City of Cambridge issue. Report it on Cambridge SeeClickFix." |
| Coming-soon campus | "This campus isn't seeded yet — you can still file a report." |

## 10. Verified facts (demo campus: MIT)

- MIT Police: 617-253-1212 (emergency / 24-7 dispatch), 617-253-2996 (non-emergency).
- Counseling: MIT Health — Student Mental Health & Counseling, health.mit.edu/services/mental-health-counseling.
- MIT campus center ≈ 42.3601, -71.0942; building coordinates seeded per building.
- City handoff: Cambridge SeeClickFix (Commonwealth Connect), cambridgema.gov/SeeClickFix, city line 617-349-4300.
- IPEDS HD columns for search: INSTNM, CITY, STABBR, LATITUDE, LONGITUD.
