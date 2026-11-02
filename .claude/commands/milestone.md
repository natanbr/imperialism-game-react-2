Run milestone $ARGUMENTS of the Imperialism revival through the light spec flow, unattended.

Read first, in this order and nothing more until needed: `docs/FLOW.md`, the milestone's
paragraph in `docs/REVIVAL_PLAN.md`, the "Resuming here" block of `docs/journal.md`, the
milestone's rows in `docs/requirements.md` (if any), and only the `docs/rules/` topic files
the milestone touches (index: `docs/rules/README.md`).

Then follow `docs/FLOW.md` stages 1 to 8 with size L:
1. Write or complete the milestone's `FR-###` rows. Unknowns get a default and a decision
   card in `docs/report/roadmap.json`; do not stop for them.
2. Plan in the journal: tasks of about 60 tool calls with `[model:effort]` from the model table.
3. For each task: a subagent writes the tests (seen red), another implements. Name `model`
   and `effort` on every subagent; tell each one not to call the advisor tool.
4. Gate after every task; commit small and topical when green.
5. One review at the end (model per the table), one fix round, delta-only re-check.
6. Playwright smoke suite, then one browser look and one screenshot.
7. Evidence table in the journal, roadmap.json updated, progress page republished, branch
   pushed, PR opened against `main`. Do not merge.

End with the ≤7-bullet report described in `docs/FLOW.md` "Running alone".
