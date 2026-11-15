# Journal archive: M10 Council of Governors

Moved from `docs/journal.md` on 2026-11-13, unchanged, during the M10 fixes of the QA fix round's review: the engine half (FLOW:
the journal stays under 400 lines). The other M10 entries (the UI half, the review fix round, the QA fix round and its
review) followed on 2026-11-14, unchanged, at M11's closing step.

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

## 2026-11-13 M10 Council of Governors, UI half (FR-297 to FR-301, FR-303, FR-304)

Size: L (a new screen, the store's overlay slice, the HUD, the news, the game-over screen, three e2e specs). One UI agent (Opus 5.5,
xhigh, no subagents, no advisor call), started by the M10 workflow after the engine half, on its API. Branch `claude/m10-council`,
not pushed.

Plan-lite:
- Change: store `councilShown` / `showCouncil` / `closeCouncil` (End Turn sets the turn's `council-met`, New game clears it);
  `CouncilModal.tsx` with `council/councilView.ts` (the report from the event alone) and `council/Council.module.css`;
  `eventText` / `newsItems` for `council-met` (`councilCountText`), the news line a button; the game-over line; the HUD's
  "Next Council" line; `CAPITOL_ART` in `art/inkArt.ts`; `UI_ICONS.council` (Game Icons `GiVote`).
- Consumers: the player after End Turn on turns 10, 20, 30, 40; the long e2e specs (FR-304).
- Tests: FR-297 `ui/gameText.test.ts`, `ui/newsPanel.test.tsx`; FR-298 `ui/councilDialog.test.tsx`, `ui/inkArt.test.ts`; FR-299
  `ui/councilDialog.test.tsx`; FR-300 `ui/scoreAndGameOver.test.tsx`; FR-301 `ui/warehouseAndHud.test.tsx`; FR-303
  `e2e/m10-council.spec.ts`; FR-304 `e2e/market-and-game-over.spec.ts`, `e2e/m4-1.spec.ts`; scans `ui/uiWritesOnlyOrders.test.ts`
  (the Council screen builds no order), `ui/dialogs.test.tsx` (on the shared Modal), `ui/icons.test.tsx`.
- Verify: the gate and `PORT=3160 npx playwright test --workers=1 --reporter=line`.
- Objection: the HUD at 1280x720 has no height to spare: FR-268's check (whole news lines above the fade) had about 1.5 px left,
  so a new HUD line had to take an existing line's place (decision 1). The next HUD addition needs a layout change of its own.

Red (tests first, `.gate/m10ui/red.txt`): `Test Files 9 failed (9)`, `Tests 13 failed | 176 passed (189)`; `Failed to resolve
import "@/components/CouncilModal"` (councilDialog, newsPanel), `Unable to find an element by: [data-testid="next-council"]` (3),
`[data-testid="game-over-council"]`, `expected null to be 'Council of Governors: Testland 5, Val…'` (3), the scans (Council screen
not found, no `council` icon, no `CAPITOL_ART`). The FR-301 "absent" rows and FR-300's "no line" row passed before (guards).

Decisions (defaults, nobody to ask):
1. FR-301's line could not be one more HUD line: the first try failed e2e/m8-qa.spec.ts (FR-268: the news list ended 22.5 px
   behind the fade at 1280x720). The turn and the date now share one line ("Turn: 11 of 40" left, "Fall 1817" right) and the
   Council line takes the date's old line (16 px), so the HUD is no taller; the turn indicator's text is unchanged
   ("Turn: 11 of 40 Fall 1817"), the line is a sibling (`next-council`) outside it. Objection: the date moved.
2. One dialog at a time after End Turn: Battle screens, then the Council screen (it waits while `battleQueue` has a report), then
   the game-over screen (it waits while `councilShown` is set). The Council overlay is z-index 77 (over the game-over 75, under
   the Attack 78, the Battle 79 and Accept Offer 85).
3. On a winning meeting "See the final scores", Escape and the backdrop also call `showGameOver`, so the screen reopened from
   the news after "Back to the map" brings the scores back too; a meeting without a winner (turn 40 included) has "Close".
4. A number cell of 0 reads "none" as its title and description; the description is a hidden element named by
   `aria-describedby` (the HUD line's too); the middle column's head is an empty cell.
5. The Playwright spec is `e2e/m10-council.spec.ts` as FR-303 names it (the workflow brief also said `e2e/m10.spec.ts`).

Decision cards for the progress page (defaults kept as drafted, from the engine half): Q50 meetings every 10 turns from turn 10;
Q51 9 of 12 (more than two thirds of all votes); Q52 a free minor votes for the nominee with more relation points if at least 50
and not at war; Q53 the turn-40 meeting uses the same rule; Q54 standing = score + 100 x provinces + 10 x military strength;
Q55 the scripted player does not court votes; Q56 the HUD shows the projected vote in a tooltip. Suggestion on each: keep.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the UI change | `npx vitest run` on the 9 UI files (`.gate/m10ui/red.txt`) | `Test Files 9 failed (9)`, `Tests 13 failed \| 176 passed (189)` |
| FR-297 to FR-301 | the same 9 files (`green1.txt`) | `Test Files 9 passed (9)`, `Tests 215 passed (215)` |
| FR-303, FR-304, FR-268 kept | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`pw-full2.txt`) | `37 passed (3.2m)`, `1 skipped` (the first run, before decision 1: `1 failed` e2e/m8-qa.spec.ts FR-268, `Expected: <= 406.5`, `Received: 429`) |
| Unit tests | `npm test` (`gate-test-final.txt`) | `Test Files 100 passed (100)`, `Tests 1975 passed (1975)` (+35 on 1940) |
| v1 and v2 baselines unchanged | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]`; FR-274 `[[1,21,22,305,0],[2,21,22,340,0],[3,21,22,276,0],[4,null,null,965,0]]` |
| Lint | `npm run lint` (`gate-lint-final.txt`) | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (`gate-build-final.txt`) | `✓ Compiled successfully in 6.2s`, `✓ Generating static pages (4/4)` |

How to see it: a new game, End Turn 10 times; on turn 11 the Council screen opens by itself (both nominees 4 and 4, the 4
minors abstaining); Close; the HUD reads "Next Council: turn 20 (Winter 1819)" (hover: the vote now); the news line "Council of
Governors: ... no winner (9 needed)." opens it again. A winning meeting is tested on a hand-built state only.

### Review fix round (2026-11-13)

Size: M (one fix round over both halves: 13 minor findings of the M10 review passes, all fixed; no blocker or major). One
agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the M10 workflow. Branch `claude/m10-council`, not pushed.

Red (behaviour fixes, on the code before each fix; `.gate/m10fix/`): R2 nomination ties `Tests 2 failed | 90 passed (92)`
(`turn 1, reversed: expected [ 'nation-2', 'nation-1' ] to deeply equal [ 'nation-1', 'nation-2' ]`; `red-r2-engine.txt`);
R1 news order `Tests 2 failed | 91 passed (93)` (`red-news.txt`) and the e2e `1 failed` (`Received string: "Army upkeep:
$100."`, the first news line; `red-e2e-news.txt`). Test-only rows against a mutation, each put back: minors forced to choose
at the last meeting fails only FR-308 and FR-305's 4-to-4 row (`Tests 2 failed | 73 passed (75)`, `mut-q53.txt`); the turn
indicator back to a block fails FR-307's e2e check (`Expected: <= 2`, `Received: 21`, `mut-e2e-layout.txt`). R4, R7 and E1
assert what the code already does (they passed at once).

| Finding | What changed | Test |
|---|---|---|
| R1 engine (FR-305) | none in code: the 4-to-4 claim is asserted, not only logged | engine/continentScore.test.ts: every meeting of the FR-260 games, each nominee Controlled 4 and nothing else, the 4 minors abstaining |
| R3 engine (Q53) | new FR-308 (the last meeting keeps the rules) | engine/council.test.ts: turn 40 of a new game, 4 abstentions, no winner; Sundmark at 49 and 30 abstains |
| R2 UI, R3 UI, E2 | FR-296 status: "its news line is FR-297" | none (docs) |
| R5, E3 | NR-011: "tested (FR-290 to FR-309)" | none (docs) |
| R6 | new FR-307 (turn and date on one line, the Council line under it) | e2e/m10-council.spec.ts on turns 1 and 11 |
| R7 | none in code (the branch kept) | ui/warehouseAndHud.test.tsx: Testland holding all 8 provinces, the line with no title, description or hidden text |
| R1 UI | `newsItems`: a `council-met` line first, before the player's own lines (new FR-306; FR-297's place replaced) | ui/gameText.test.ts, ui/newsPanel.test.tsx; e2e: first list item, list and HUD at the top, the line inside the list's visible box above the fade |
| R2 engine | `councilNominees` ranks ties in `intentOrder(state, state.turn)` (new FR-309; FR-291's tie part replaced) | engine/council.test.ts: the start tie on turns 1, 11, 2, 10 in both nation orders; 3 Great Powers tied for second on turns 1, 2, 3 with the same nominees, ballots and winner when reversed |
| R4 UI | Council.module.css comment: Accept Offer does not wait, it opens over the Council | ui/councilDialog.test.tsx: z-index 85 over 77 and the page order; Escape rejects and Enter accepts the offer, the Council stays, takes the focus back and closes next |
| E1 | none in code; FR-274's four games also collect the Council | engine/scriptedWar.test.ts: on the default partners market 4 meetings, no winner; seeds 1 to 3 Arvelia votes for Valdoria as Colonies at turns 30 and 40, seed 4 none |

Decisions (defaults, nobody to ask):
1. R1 UI: the Council line moves first rather than scrolling the list to it; the game-over line stays last. Objection: on a
   meeting turn the player's own lines start one line lower (FR-107 and FR-268 now have an exception).
2. R2: ties go in `intentOrder` of the state's turn (as FR-187). Objection: with two Great Powers every meeting is counted on
   an odd turn (11, 21, ...), so Testland takes every tie at a meeting; the HUD projection on turn 10 puts Valdoria first on
   a tie and the meeting then Testland. Only the column order changes on the continent.
3. New ids FR-306 to FR-309 by FLOW's rule (a changed requirement gets a new id), as M9 did (M9 fix round decision 3).
4. E1: the test reuses FR-274's four games (same setup: default market, Testland idle, Valdoria scripted) instead of playing
   four more in continentScore.test.ts; no extra test time.
5. Decision cards unchanged: Q53 is now FR-308's [NEEDS CLARIFICATION]; Q54's card adds "ties in the turn's order (FR-309)".

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the fixes | the new rows on the code before each fix (`.gate/m10fix/red-*.txt`) | `Tests 2 failed \| 90 passed (92)`, `Tests 2 failed \| 91 passed (93)`, e2e `1 failed` |
| Engine and UI rows | `npx vitest run` on the 5 engine and 4 UI files (`green-engine.txt`, `green-ui.txt`) | `Tests 116 passed (116)`; `Tests 130 passed (130)` |
| E1 numbers | `npm test` console (`gate-test.txt`) | `FR-302 Council per seed on the partners market ...: [[1,["t10 nation-2:4+0+0/nation-1:4+0+0","t20 nation-2:4+0+1/...","t30 nation-2:4+1+0/...","t40 nation-2:4+1+0/..."]], ...` |
| Unit tests | `npm test` (`gate-test.txt`) | `Test Files 100 passed (100)`, `Tests 1983 passed (1983)` (+8 on 1975) |
| v1 and v2 baselines unchanged | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]`; FR-274 `[[1,21,22,305,0],[2,21,22,340,0],[3,21,22,276,0],[4,null,null,965,0]]` |
| Lint | `npm run lint` (`gate-lint.txt`) | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (`gate-build.txt`) | `✓ Compiled successfully in 3.3s`, `✓ Generating static pages (4/4)` |
| e2e | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`pw-full.txt`) | `37 passed (1.6m)`, `1 skipped` |

Carried: decision 2's projection-versus-meeting column order on a tie (cosmetic); nothing else.

### QA fix round (2026-11-13)

Size: M (7 QA items on the Council screen and the HUD; one engine change). One agent (Opus 5.5, xhigh, no subagents, no
advisor call), started by the M10 workflow; not pushed. QA shots: m10-qa-council-turn10.png, m10-qa-hud-news.png,
m10-qa-council-turn40.png; after the fix: m10-qa-fix-council-turn10.png, m10-qa-fix-hud-game-over.png (`.gate/m10qa/shots.mjs`).

Red (on the code before the change, `.gate/m10qa/red-*.txt`): engine `Tests 10 failed | 40 passed (50)`; UI `Tests 22 failed |
28 passed (50)`; e2e `2 failed`: turn 1 `waiting for getByTestId('council-projection')`, game over `"inside": false`,
`"aboveButtons": false`, each date `Received: "Turn 10, Summer 1817"`. FR-317 with the old CSS rule: `line: "rgb(106, 101, 92)"`.

| Item | What changed | FR and test |
|---|---|---|
| 1 abstentions | engine: an abstaining ballot carries `abstention` (the minor's points and wars with each nominee, equal strength, a colony); screen: "Abstained: 4", one reason per province ("Arvelia: relation 30 of the 50 needed"), the rule line | FR-310 engine/council.test.ts; FR-311 ui/councilDialog.test.tsx, e2e/m10-council.spec.ts |
| 2 Other Great Powers | greyed row, "—" cells, note "(only two Great Powers in this world)"; the 0 stays in the data | FR-312 ui/councilDialog.test.tsx, e2e |
| 3 player first | the player's column first, "1st nominee" / "2nd nominee" under the names; first in the HUD projection | FR-313 ui/councilDialog.test.tsx, ui/warehouseAndHud.test.tsx, e2e |
| 4 projection | shown under the Next Council line, "If it met now: Testland 4, Valdoria 4, abstain 4 of 12; 9 needed", its description | FR-314 ui/warehouseAndHud.test.tsx, e2e (turns 1, 11) |
| 5 game-over news | no "No tile selected" line (41 px), game-over date line 16 px: the Council line whole above Final scores | FR-315 e2e/m10-qa.spec.ts (new), ui/warehouseAndHud.test.tsx |
| 6 date line | "Met at the end of turn 10 (Summer 1817)" | FR-316 ui/councilDialog, ui/newsPanel, e2e (all 4 meetings) |
| 7 colour | Next Council line and projection in the body text colour | FR-317 e2e/m10-council.spec.ts |

Decisions (defaults, nobody to ask):
1. Item 4 shows the projection (the brief's first option) instead of a button. The HUD had 5.5 px to spare (FR-268), so the
   "No tile selected" line went (it says nothing a click on a tile does not show): it pays for item 4 (32 px) and item 5.
   Spare now: 14.5 px on turn 11, 6.5 px at game over (`.gate/m10qa/measure.mjs`). Objection: the next HUD line has no room.
2. Item 5 keeps Final scores where it is; the room comes from the content above the news (decision 1, the 16 px date line).
3. Item 1's reason lives on the engine's ballot, so the screen still reads only the event; the FR-293 tests now assert it
   too (stricter). Objection: the reasons count relation points, the Diplomacy screen shows levels ("level 4 of 9").
4. Item 3 covers the screen and the HUD as named; the news line keeps the first nominee first (FR-297). Objection: on turn 11
   the news reads "Valdoria 4, Testland 4" under the HUD's "Testland 4, Valdoria 4". The carried tie item above is gone.
5. Item 5's test is a new spec, `e2e/m10-qa.spec.ts` (drawn scrollbars need a top-level `launchOptions`); the check is shared
   in `e2e/councilNews.ts`. The v2 plan entry moved to `docs/journal/archive-v2-plan.md` to keep this file under 400 lines.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the change | the new rows on the old code (`red-engine.txt`, `red-ui.txt`, `red-e2e.txt`) | `Tests 10 failed \| 40 passed (50)`; `Tests 22 failed \| 28 passed (50)`; `"inside": false` |
| Unit tests | `npm test` (`gate-test-final.txt`) | `Test Files 100 passed (100)`, `Tests 2000 passed (2000)` (+17 on 1983) |
| Baselines unchanged | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`, `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6); exit 0, no output |
| Build | `npm run build` (`gate-build.txt`) | `✓ Compiled successfully in 12.2s`, `✓ Generating static pages (4/4)` |
| e2e | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`gate-e2e.txt`) | `38 passed (12.0m)`, `1 skipped` |

Gate note: the first `npm test` failed tests/ui/newsPanel.test.tsx on the old date line (updated to FR-316) and once timed out
in tests/engine/lintGuard.test.ts (`Test timed out in 30000ms`, ESLint's start under load); both passed in the next full run.

### Review of the QA fix round (2026-11-13)

Size: S (two minor findings, both test coverage; no production code changed). One agent (Opus 5.5, xhigh, no subagents, no
advisor call), started by the M10 workflow; not pushed. The engine half moved to `docs/journal/archive-M10.md` (under 400 lines).

| Finding | What changed | Test |
|---|---|---|
| F1 FR-312's grey only in CSS | none in code | e2e/m10-council.spec.ts, turn 11: the Other Great Powers row's cells and name in the computed muted colour (both tokens read from a probe in the dialog), the Controlled numbers in the body colour |
| F2 FR-313's HUD fallback | none in code; `threePowers` and `N3` moved to tests/engine/armyFixtures.ts for the screen and the HUD (the engine test keeps its copy with Valdoria's colour slot, which FR-152's order reads) | ui/warehouseAndHud.test.tsx: Carthia's player, Valdoria holding Testland North-East, reads "If it met now: Valdoria 4, Testland 3, abstain 5 of 12; 9 needed" |

Both rows assert what the code already does, so they passed at once; each was run against a mutation, then put back (`.gate/m10f/`):
F1 with the row rule's `color` removed: `1 failed`, the two cells `rgb(59, 59, 59)` against the muted `rgb(106, 101, 92)`
(`mut-f1-e2e.txt`); F2 with `playerFirst` reversing the standing for a non-nominee: `Tests 1 failed | 16 passed (17)`, only the
new row, `Received: "If it met now: Testland 3, Valdoria 4, abstain 5 of 12; 9 needed"` (`mut-f2-hud.txt`).

| Claim | Command | Result (quoted) |
|---|---|---|
| The touched files | `npx vitest run` on the HUD, Council screen and council engine files (`green-ui.txt`) | `Test Files 3 passed (3)`, `Tests 102 passed (102)` |
| Unit tests | `npm test` (`gate-test.txt`) | `Test Files 100 passed (100)`, `Tests 2001 passed (2001)` (+1 on 2000) |
| Baselines unchanged | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`, `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6); exit 0, no output |
| Build | `npm run build` (`gate-build.txt`) | `✓ Compiled successfully in 14.6s`, `✓ Generating static pages (4/4)` |
| e2e | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`gate-e2e.txt`) | `38 passed (5.6m)`, `1 skipped` |

Carried: nothing.
