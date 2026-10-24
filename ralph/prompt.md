You are running inside an automated Ralph loop for Track: __TRACK__.

1. **Pick ONE Task:** Inspect the issue files in `issues/` (ignore `00-spec.md` and `00-gantt-roadmap.md`).
   - Find the first issue with `Status: OPEN` and `Track: __TRACK__` (or any open issue if Track is `ALL`) whose `Blocked By` dependencies are all `Status: DONE`.
   - If NO matching open issues remain for Track `__TRACK__`, output `<promise>COMPLETE</promise>` and exit immediately.
2. **Implement with TDD:** Read `AGENTS.md`. Use the `tdd` skill (Red -> Green -> Refactor) to implement ONLY that single issue. Stay strictly within the files listed in the ticket.
3. **Verify Feedback Loops:** Run `npm run lint`, `npm run test`, and `npm run build` (or the verification commands in `AGENTS.md`). Fix any failures before committing.
4. **Mark Done & Commit:**
   - Change `Status: OPEN` to `Status: DONE` inside that issue file.
   - Commit all changes with `git commit -m "feat(track-__TRACK__): complete <issue-filename>"`.
   - Exit immediately after committing this ONE ticket so the next loop starts with a fresh 0-token context window.
