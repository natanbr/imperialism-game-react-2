# M18j — the Developer and overseas profit (2026-11-26)

Merged in pull request 59 at `c9ea9d7`. Spec `docs/specs/m18j-developer.md`, FR-629 to FR-642.

## Build
- T-01 to T-06: Claude Opus 5.5 xhigh, one task at a time, tests committed first.
- Two reviews by Claude Sonnet 5.5 xhigh (spec lens and adversarial lens), then one Opus fix agent (`eeea873`, `b688de7`).
- Main (M18i fixes, pull request 58) was merged in at `04678bc`. The rules chain is now `m18h` -> `m18i` -> `m18j`.

## Codex reviews
- Task 62 (`.gate/codex/62/report.md`): 4 blockers and 6 smaller findings, all reproduced. The blockers were historical replay inventing a Developer, a human embassy granting one turn early, Tile Info pricing an undiscovered seam, and the computer buying land in a country it declares war on. All were fixed in `bb476a7`..`b688c1b`.
- Task 63 (`.gate/codex/63/report-full.md`): 8 of 10 confirmed fixed. The stack-order fix had changed move and cancel for every revision, which broke the replay of a genuine Two islands save from `521a7b4`. It was removed, and move and cancel are main's again, pinned by two genuine 521a7b4 fixtures. The paid-embassy reserve was fixed (`131c819`, `cf872f0`).
- Task 64 (`.gate/codex/64/report.md`): no blockers. One wording fix (`b631063`).
- Deferred (pre-existing on main, FR-031): a cancelled move puts the worker last on its tile. Recorded in FR-632 for the owner.

## Guards (FR-642), base main `521a7b4`
- All 72 FR-597 records are byte-identical: 37,526 accepted computer Orders and 350 of 778 town deliveries.
- FR-545 is 15/24 (12 paid grants), FR-489 24/24, FR-546 16/24. FR-464 Two islands is unchanged.
- Re-recorded at the merge: two NR-038 seed-7 digests and the autosave marker `m18i` -> `m18j`.

## Gate 69
- `npm test`: 193 files, 3,745 passed, 2 skipped.
- Lint, tsc and the build passed.
- Playwright: 183 passed. 1 failed on a stale profit label, which was fixed in `c15c875`; the spec rerun gave 1 passed.
- Perf: 3 passed (FR-497 computerOrders p95 14.1 ms).
- Roadmap check: PASS.
- Logs are in `.gate/claude/69/`.
