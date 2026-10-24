# 10: Routing + city handoff (campus-configured)

Status: DONE
Track: B
Blocked By: 01-shared-foundation.md
Files Touched: src/modules/routing/ (index.ts, internals, tests), src/components/city-handoff/ (city-handoff card component)

**What to build:** the "lands in the right queue, or bounces off-campus to the city" behavior — on-campus reports go to their team's queue; off-campus public issues are not posted and instead show the campus's city-handoff card — so nothing is misrouted and the app stays campus-agnostic.

- [ ] Each report is routed to its team's queue; staff can reassign to another team (reassign logic exposed through the module).
- [ ] Off-campus public issues (pothole, public streetlight, sidewalk) are detected and NOT posted; instead a City issue card is shown using the active campus's configured handoff (name, service URL, phone). For MIT it reads "This looks like a City of Cambridge issue. Report it on Cambridge SeeClickFix." with a copy-text button, 617-349-4300, and a link to cambridgema.gov/SeeClickFix.
- [ ] Tested through the routing module interface: on-campus report → correct team queue; off-campus report → city card returned, nothing persisted; the handoff text is driven by campus config (so a different campus yields different copy). Covers F6, case 12.
- [ ] `npm run lint && npm run test && npm run build` pass.
