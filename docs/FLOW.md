# How work runs here (light spec-driven flow)

Adapted on 2026-11-02 from the SDD flow used in Nathan's work repo, cut down for a hobby
project that agents run mostly alone. Kept: permanent requirement ids, one journal,
tests first, an evidence table, one review per milestone. Dropped: review panels, Codex/
Copilot passes, mutation testing, hooks, squash rituals, per-task pre-mortems.

Every agent working in this repo reads this file once per session. It is short on purpose.

## Files (one source of truth each)

| File | Holds | Who writes |
|---|---|---|
| `docs/REVIVAL_PLAN.md` | goals, milestones, decisions | orchestrator |
| `docs/requirements.md` | `FR-###` rows: WHEN … SHALL …, milestone, status | orchestrator at spec time |
| `docs/journal.md` | "Resuming here" (≤15 lines) + dated entries + evidence tables | every session |
| `docs/rules/` | rules of the original game, one topic per file | rules research only |
| `docs/ARCHITECTURE.md` | how the code is built | whoever changes the structure |
| `docs/report/roadmap.json` | data for the progress page | orchestrator at each checkpoint |

Rules for these files:
- Requirement ids are permanent. A changed requirement gets a new id; the old one is marked
  `replaced by FR-###`.
- Read only the rules topic file you need (`docs/rules/README.md` is the index).
- The journal stays under 400 lines. At each milestone end, move that milestone's entries to
  `docs/journal/archive-<milestone>.md` and keep a 5-line summary.
- A requirement stated by Nathan in chat goes into `docs/requirements.md` in the same turn.

## Task sizes

Each task picks a size and writes it in the journal as the first line of its entry.

| Size | Example | Stages |
|---|---|---|
| S: a diff you can describe in one sentence | rename, constant, copy fix | test (if behaviour) → change → gate |
| M: a feature or fix inside one system | new worker job, market price drift | spec rows → plan-lite → tests red → implement → gate |
| L: engine-wide or a milestone | M1 headless core | spec rows → plan → tests red → implement in tasks → gate → review → app check |

Plan-lite (5 lines in the journal): the change, who consumes it, the test rows (FR id → what
the test asserts), the verify command, and `Objection:` (the strongest reason this is wrong,
or "none").

## Stages

1. **Spec.** Write `FR-###` rows for the work from the plan and the rules files. Mark
   anything unknown `[NEEDS CLARIFICATION]` with a default you will use. A game-design choice
   the rules do not settle becomes a decision card for Nathan on the progress page (with your
   suggestion); continue with the suggestion and record it, never block on it.
2. **Plan.** Tasks of about 60 tool calls each, written as
   `T-01 [test|impl] [model:effort] [FR-012, FR-013] one-line goal`. Mark tasks that can run in
   parallel `[P]`. One row per FR in a test table: what the test asserts.
3. **Tests first.** Write the tests for the task's FRs and run them. They must fail for the
   expected reason before implementation starts. Paste the red summary into the journal.
4. **Implement.** Smallest change that turns the tests green. No refactor outside the files
   the task needs; any refactor started is finished in the same task.
5. **Gate** (scripts, no model tokens): `npm test`, `npm run lint`, `npx tsc --noEmit`,
   `npm run build`, and from M1 on the two-nation headless test. All must pass before a
   commit. Never skip hooks or tests to get green.
6. **Review** (once per L task or milestone, not per task). One reviewer agent reads the
   diff against `docs/requirements.md`: every FR has a test, every test cites an FR, no
   behaviour without an FR, plus a correctness pass. Findings get one fix round; the
   re-review checks only the delta. Reviews may be postponed to the milestone end, never
   dropped.
7. **App check.** The Playwright smoke suite runs headless (no model tokens). Then the
   orchestrator opens the app once in the browser and takes one screenshot of the new
   feature for the report.
8. **Checkpoint.** Journal evidence table filled (claim, command, quoted result). Update
   `docs/report/roadmap.json` and republish the progress page. Commit, push the branch,
   open or update the PR.

## Evidence table (journal)

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-012 covered | `npx vitest run tests/engine/orders.test.ts` | `Tests 14 passed (14)` |

A claim without a quoted result is not done. A bug fix also shows its new test failing on
the commit before the fix.

## Models (chosen for cost; see `docs/REVIVAL_PLAN.md` §6 for the reasons)

| Work | Model, effort |
|---|---|
| Orchestration, spec, plan, final judgement | the session model (Opus 5.5) |
| Engine, store, turn loop, any shared code | Opus 5.5 xhigh |
| Bounded implementation inside one system | Opus 5.5 high |
| UI wiring, CSS, copy | Sonnet 5.5 high |
| Tests | Sonnet 5.5 high |
| Milestone review | Sonnet 5.5 xhigh; Opus 5.5 high for M1 and any engine-wide change |
| Scans, greps, file moves, formatting | Haiku 5.5 or Sonnet 5.5 low |
| Fable | never by default; only one single-agent judgement Nathan approves |

Cost rules: name `model` and `effort` on every subagent call. One agent per task, no
fan-out panels, no `/code-review max`. No command that waits more than 4 minutes inside an
agent (the prompt cache expires). Long command output goes to a file; quote only the summary.
Subagents never call the advisor tool.

## Running alone

- Nobody answers questions during a run. Decide with the documented default, record the
  decision in the journal with `Objection:`, and put it on the progress page as a card.
- Stop and park a task (status `blocked` on the page) only when every default would be
  unsafe or the work would be useless if wrong.
- Protected: never force-push, never push to `main` directly, never delete branches or
  files outside the task, never skip tests or hooks.
- End of a run: a report of at most 7 bullets in Nathan's format (👤 🤖 ⚠️ 🧠), the evidence
  table, how to see the change in the running app, and the progress page link.

## Commands

- `/milestone <id>` runs a milestone through all stages and ends with a PR.
- `/fix <description>` runs an S or M bug fix: reproduce with a failing test, fix, gate.
