# 04: Entry routing, About page & onboarding pop-up/nudge

Status: DONE
Track: A
Blocked By: 03-clustered-map-mit-fix.md
Files Touched: src/app/(landing)/ (reshape: demo entry → student feed), src/app/about/ (new About route for the pitch content), src/components/onboarding/ (welcome pop-up + try-reporting nudge)

**What to build:** make the demo open on the thing a student actually uses, and gently orient the judge. Opening the demo drops straight into the student feed; a small, dismissible pop-up then explains "you're seeing the student view" and offers a switch to staff; a little later, a one-time nudge invites the judge to try filing a report. The marketing/pitch content lives on its own About page.

- [ ] The pitch/marketing content (AICUM impact numbers, "How it works") moves to a dedicated `/about` route; the demo entry point resolves to the student feed instead of the pitch page.
- [ ] A once-per-session, dismissible welcome pop-up explains the student view and offers a clear switch to the staff view. It does not block entry.
- [ ] A one-time, dismissible nudge appears after a short delay (~15–20s or after some scrolling) inviting the judge to file a report, linking to the report flow.
- [ ] The welcome pop-up and the nudge are sequenced so they never overlap on screen.
- [ ] `npm run lint && npm run test && npm run build` pass.
