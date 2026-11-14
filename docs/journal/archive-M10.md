# Journal archive: M10 Council of Governors

Moved from `docs/journal.md` on 2026-11-13, unchanged, during the M10 fixes of the QA fix round's review: the engine half (FLOW:
the journal stays under 400 lines). The other M10 entries follow once M10 is merged, as M9's did.

## 2026-11-13 M10 Council of Governors, engine half (FR-290 to FR-296, FR-302, FR-305)

Size: L (engine-wide: a new end of the game in `resolveTurn`, a new event, the game-over record). One engine agent (Opus 5.5,
xhigh, no subagents, no advisor call), started by the M10 workflow. Branch `claude/m10-council` from main f817da2 (worktree
`imperialism-game-revival-fee36d`), not pushed. The UI agent builds FR-297 to FR-301, FR-303 and FR-304 next, on the API below.

Plan-lite:
- Change: `engine/council/council.ts` (pure: meeting turns, standing, nominees, one ballot per province, the count, the winner;
  numbers in `definisions/council.ts`, types in `types/Council.ts`); `resolveTurn` holds the meeting after `turn-ended` on the
  state after the clock, emits `council-met`, and a winner ends the game (`reason` "council", `council`); conquest first.
- Consumers: the Council screen, the news line, the game-over line and the HUD line (UI half); the store's event log.
- Tests: FR-290 to FR-294 `engine/council.test.ts`; FR-295 `council.test.ts`, `gameOver.test.ts`; FR-296 `council.test.ts`,
  `purity.test.ts`, `store/gameStore.test.ts`; FR-302 `continentScore.test.ts`, `purity.test.ts`; FR-305 `scriptedScore.test.ts`,
  `continentScore.test.ts`, `council.test.ts`.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Objection: in practice the Council can rarely decide on the continent: 9 of 12 needs a province of the other Great Power,
  Arvelia as a colony and all three island minors at 50 points or more; the FR-260 games read 4 to 4 at every meeting. Q51 and
  Q52 may need tuning once Nathan plays.

Red (tests first, before any engine change; `.gate/m10engine/red.txt`): `Test Files 5 failed | 1 passed (6)`, `Tests 6 failed |
107 passed (113)`; council.test.ts `Cannot find module '@/definisions/council'`; purity `ENOENT ... src\app\engine\council\council.ts`;
gameOver `expected undefined to match object { turn: 20, year: 1819, …(3) }`; store `expected [] to deeply equal [ [ 10, 1817, 12,
9 ] ]`; continentScore `expected [ [], [], [], [] ] to deeply equal [ [ [ 10, 1817, null ], …(3) ], …(3) ]`. The FR-302 orders row
and scriptedScore's two-islands FR-305 row passed before (they guard what must not change).

Decision cards (defaults kept as drafted in the rows, nobody to ask; for the progress page):
- Q50: the Council meets every 10 turns from turn 10 (10, 20, 30, 40). Suggestion: keep.
- Q51: a winner needs more than two thirds of all votes, abstentions included: 9 of 12. Suggestion: keep.
- Q52: a free minor votes for the nominee with more relation points if at least 50 and not at war (a tie abstains). Suggestion: keep.
- Q53: the turn-40 meeting uses the same rule (Imp1: at the last meeting every governor must choose). Suggestion: keep.
- Q54: standing = score + 100 x provinces + 10 x military strength (floored). Suggestion: keep.
- Q55: the scripted player does not court votes. Suggestion: keep for M10.
- Q56: the HUD shows the projected vote in a tooltip (UI half). Suggestion: keep.

Decisions of this half (defaults, recorded):
1. With a turn limit above 40 the meetings go on every 10 turns (50, 60, ...), as FR-290's formula reads; `nextCouncilTurn` does
   not ask whether two Great Powers still hold provinces (on the continent a lone one has already won by conquest).
2. A colony that still holds a province (only on a hand-built state) abstains; FR-292 names free minors only.
3. "Without the Council" (FR-295's other fields, FR-302's orders) is tested on a fresh engine copy whose `councilMeeting` never
   meets (`tests/engine/withoutCouncil.ts`, `vi.doMock`), not through a switch in production code.
4. `eventText` returns null for `council-met` until the UI half writes FR-297's line, so this half shows no news line.

API for the UI half (`@/engine`): event `council-met` (`CouncilMetEvent`): `{ turn, year, totalVotes, needed, nominees: [first,
second], ballots, winnerId? }`, a nominee `{ nationId, standing, controlled, colonies, otherGreatPowers, otherMinorNations, total }`,
a ballot `{ provinceId, forId?, row? }` (row `CouncilRow`: "controlled" | "colonies" | "otherGreatPowers" | "otherMinorNations"),
no `nationId`, after `turn-ended` and before `game-over`, in the store's `eventLog` under the meeting turn. `GameOver.reason`
"council" with `winnerId` and `council` (the vote); `game-over` carries the same fields. `councilVote(state)` (the FR-301
projection; undefined without two Great Powers holding provinces), `nextCouncilTurn(state)`, `isCouncilTurn(state, turn)` (turn 40
is the last when `isCouncilTurn(state, event.turn + COUNCIL.interval)` is false), `yearOfTurn(state, turn)` with `seasonOf(turn)`
for "Winter 1819", `councilCell(vote, nationId, row)` and `abstainedProvinces(vote)` (province ids, state order), `COUNCIL_ROWS`,
`votesNeeded`, `COUNCIL`. Not built: the store's `councilShown` / `showCouncil` / `closeCouncil` (FR-299).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the engine change | `npx vitest run` on the 6 files (`.gate/m10engine/red.txt`) | `Test Files 5 failed \| 1 passed (6)`, `Tests 6 failed \| 107 passed (113)` |
| FR-290 to FR-296 | `npx vitest run tests/engine/council.test.ts tests/engine/purity.test.ts tests/engine/gameOver.test.ts tests/store/gameStore.test.ts` (`run1.txt`) | `Test Files 4 passed (4)`, `Tests 96 passed (96)` |
| The rows catch a wrong rule | the same council file on three mutations, each put back (`mut1.txt` to `mut3.txt`) | vote on the state before the clock: `Tests 3 failed \| 42 passed (45)`; a declared war not counted: `1 failed \| 44 passed`; needed = ceil(2/3): `3 failed \| 42 passed` |
| FR-302, FR-305 | `npm test` console (`gate-test-final.txt`) | `FR-305 Council per seed ...: [[1,["t10 nation-2:4/nation-1:4","t20 nation-2:4/nation-1:4","t30 nation-2:4/nation-1:4","t40 nation-2:4/nation-1:4"]], ...` (the same on seeds 2 to 4) |
| Unit tests | `npm test` (`gate-test-final.txt`) | `Test Files 99 passed (99)`, `Tests 1940 passed (1940)` (+55 on 1885) |
| v1 and v2 baselines unchanged | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]`; FR-274 `[[1,21,22,305,0],[2,21,22,340,0],[3,21,22,276,0],[4,null,null,965,0]]` |
| Lint | `npm run lint` (`gate-lint-final.txt`) | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (`gate-build-final.txt`) | `✓ Compiled successfully in 5.7s`, `✓ Generating static pages (4/4)` |

Not run: Playwright (no screen changed; the UI half adds the Council screen, e2e/m10-council.spec.ts and the FR-304 steps).
