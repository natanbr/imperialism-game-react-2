# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0 to M4 are merged into `main` (PR 9, 10, 12 to 15, 17); their entries are archived in
  `docs/journal/archive-M1.md` to `-M4.md`. Decisions Q5 to Q16 settled (NR-012 to NR-018).
- M4.1 (PR 18), M4.2 (PR 19) and M4.3 (PR 20, main 274ef62) are merged; entries archived in
  `docs/journal/archive-M4.1.md` to `-M4.3.md`. Q17, Q19 and Q20 answered as NR-029, NR-028, NR-027.
- 2026-11-12 M4.4 (NR-027, NR-028; FR-140 to FR-142) merged (PR 21, main e018d85; entry archived in
  `docs/journal/archive-M4.4.md`). Recruiting not built (probe in `scripts/probes/m4-4/`); decision card
  Q21 open, option (a) "no recruiting" taken meanwhile. v1 (M0 to M4.4) is complete.
- 2026-11-12 night shift (NR-030): v2 planning and implementation. Plan on branch `claude/v2-plan`
  (this worktree, the old docs worktree `imperialism-game-revival-fee36d`); one branch per milestone
  after it. The progress page files now live on these branches too (copied from the docs branch).
- 2026-11-13 M5 (FR-144 to FR-160, FR-235) merged (PR 23, main 0bfd870; entries archived in
  `docs/journal/archive-M5.md`). The app plays the continent. Card Q22 (the continent's tilt) still open.
- 2026-11-13 M6 Diplomacy (FR-161 to FR-181, FR-236 to FR-241) merged (PR 24, main 2a60a3b; entries archived in
  `docs/journal/archive-M6.md`). Decision card "who receives a grant" (M6 fix round decision 3) still to add.
- 2026-11-13 M7 Nation-to-nation trade (FR-183 to FR-198, FR-242 to FR-259) merged (PR 25, main d16afa7; entries archived in
  `docs/journal/archive-M7.md`). Card Q47 (the World market's greyed "−") still open.
- 2026-11-13 M8 Armies (FR-199 to FR-215, FR-260 to FR-271) merged (PR 26, main c91f2fd; entries archived in
  `docs/journal/archive-M8.md`). Nathan's art pack (NR-031) committed on top (4bd00eb).
- 2026-11-13 M9 War and the attack screen (FR-216 to FR-234, FR-272 to FR-281) merged (PR 27, main f817da2; entries archived
  in `docs/journal/archive-M9.md`).
- 2026-11-13 M10 Council of Governors (FR-290 to FR-317) merged (PR 28, main 69ed08b; engine half archived in
  `docs/journal/archive-M10.md`, the rest below). **v2 (M5 to M10) is complete.** Gate on 6fad1e0: 2001 unit tests,
  lint 0 errors, tsc and build clean, Playwright 38 passed and 1 skipped.
- Open decisions (defaults in force, all on the progress page): Q22 to Q59; the most important are Q51 (Council
  threshold), Q34 and Q35, and Q57 to Q59 (new from the M10 QA round: the removed "No tile selected" hint; the news
  line names the 1st nominee first while the screen puts the player first; abstention reasons in relation points
  while the Diplomacy screen shows levels). Also open: restyle the whole game with the ink-and-wash pack (NR-031)
  or keep it on the war screens only.
- Not verified yet: a winning Council vote on screen (unit tests only); Firefox and WebKit never run; seed 4's
  computer never campaigns. Possible flaky test: `tests/engine/lintGuard.test.ts` timed out once under load.
- Carried from M8: the FR-213 garrison threat-recruit asks for Regulars, which a real game can never raise. Next.js
  picks a lockfile two folders up as the project root (set `turbopack.root` / `outputFileTracingRoot` in `next.config`).
- Housekeeping waiting for Nathan's go-ahead: merged branches `claude/v2-plan`, `claude/m5-*` to `claude/m10-council`,
  the old `decisions` worktree.

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- UI: the cursors are still emoji. Not built from M3: Q15 (c) "repeat last turn's trades".
- The NR-016 list of other same-turn effects (archive-M4, part A entry) waits for a decision.
- M5 design item (M4 review note 5): partly settled by FR-115 (with a civilian selected elsewhere, a
  click on a tile's civilians is the selected civilian's order there); with none selected, a click on
  a tile's centre still selects its civilian, not the tile.
- M4.1 review note 5: the rail path search (`railPath` in `engine/ai/railPlan.ts`) treats a tile with
  a temporary job (prospecting, development) as blocked, so the engineer takes a longer route, or finds
  none, rather than waiting the few turns until the job ends.
- M4.1 review note 7 (decision 4): Expand, freight cars, training and sales can still cut a standing
  order without a refusal (as on main, now visible in the dialog), and an older dead order whose inputs
  come back takes its labour back the next turn, cutting a newer order. Not changed in M4.1.
- M4.3 review finding 4: `isDepotSite` checks only hills; it does not call `railTerrainAllowed`. Today a
  depot needs no rail on its own tile, so it does not matter; when technologies become lockable, a
  depot site SHALL also require `railTerrainAllowed` (the section into it is built on it).
- M4.3 review finding 5: `railPath` (`engine/ai/railPlan.ts`) finds the path with the fewest tiles, not
  the fewest missing sections, so it can ignore rail already built that a slightly longer path would reuse.
- M4.3 review finding 6 (hypothesis, not run): the score drop since M4.3 may come partly from
  `bestDepotSite`'s gain counting every gathered unit equally; weighing each unit by what the economy
  actually uses (food eaten, inputs of running buildings, what sells) may pick better sites.
- M4.4 review note 7: a stale store entry (an allocation in `transportAllocationsByNation` for a commodity
  that now has nothing to ship) flashes its group once per open, until the next slider move writes the
  clamped allocations back. The popup's local state clamps it right after the first render; the store keeps it.
- M4.4 review note 10: in the lever table the "free worker" rows add a worker who eats raw food, so what they
  lose is a freight car's load of inputs every turn, not the cost of recruiting. Only the guarded rows (a
  free worker after a labour-bound turn, R1, R2) support the conclusion that recruiting does not pay; the
  rows with a free worker every turn (sick and starved workers) say little about a policy.

## 2026-11-02 Revival setup

Size: L (process). Decisions: continue not restart; gold $200 / gems $500; delete superseded
branches and untrack old tool configs; v3 AI scripted and LLM behind one interface. Light
flow adopted from the work-repo SDD flow; reviews batched per milestone to cut cost.

## 2026-11-03 M1 headless core (archived)

Entries in `docs/journal/archive-M1.md`. Engine in `src/app/engine/` (Order, validate, apply,
resolveTurn, systems `(state, ctx)`, seeded RNG, scripted player); the store holds one
`GameState` plus UI state and the UI only submits orders. FR-001 to FR-026 tested; 280 unit
tests, Playwright 7 passed. Two objections went to M2: the job completion flags and the
`newGame` import of a test fixture (both settled in M2 part A).

## 2026-11-03 M2 economic loop (archived)

Entries in `docs/journal/archive-M2.md`. Production buildings with capacity and standing orders,
recipes, labour, food and sickness, training, migration, freight cars from lumber + steel + labour,
the Spring 1815 calendar, real job durations and costs; the engine owns the start world; capital
dialog, HUD date and food warning. FR-027 to FR-059 tested; 472 unit tests, Playwright 8 passed,
1 skipped. Merged as PR 13. Open: decision Q9 (freight cars count this turn; the rules say next turn).

## 2026-11-03 M3 money and score (archived)

Entries in `docs/journal/archive-M3.md`, with the decision cards Q10 to Q15. One world market
(sell, buy, cargo holds, price drift), the score (treasury + industry + development), game over after
40 turns, the market dialog, HUD score and game-over screen. FR-060 to FR-078 tested; 588 unit tests,
Playwright 10 passed, 1 skipped. Merged as PR 14 (review: merge, nothing must-fix; carried-forward list
in the archive's review entry).

## 2026-11-04 M3.5 small map and clean look (archived)

Entries in `docs/journal/archive-M3.5.md`. The rail line fix (FR-079), the 24x16 two-island start
world with island 2 kept for M4 (FR-080 to FR-083), Game Icons, faint terrain tints, the minimalist
palette and 42 px tiles (FR-084 to FR-090), and the review fix round (FR-091 to FR-096); 654 unit
tests, Playwright 15 passed, 1 skipped. Merged as PR 15; the carried-forward list is in "Resuming
here" and the archive's last entry.

## 2026-11-09 M4 second nation (archived)

Entries in `docs/journal/archive-M4.md`. Nation 2 "Valdoria" on island 2, played by the scripted player
at End Turn (FR-097 to FR-105); the score table, news per nation, Valdoria read-only, New game, 24 px
worker buttons and the tray (FR-106 to FR-111); review fix round. Merged as PR 17. Carried forward: the
list in "Resuming here".

## 2026-11-10 M4.1 play-test fixes (archived)

Entries in `docs/journal/archive-M4.1.md`, with its review fix round. Civilians share tiles, one job per
tile (FR-112 to FR-115); one production plan for the phase, the labour and the capital dialog (FR-116 to
FR-120); commodity icons in the market and capital (FR-121); a scripted engineer that builds depots and
joins them by the shortest rail path (FR-122 to FR-124). Merged as PR 18 (main b4d26ee).

## 2026-11-10 M4.2 scripted player score (archived)

Entries in `docs/journal/archive-M4.2.md`, with its review fix round. `engine/ai/economy.ts`: every
lumber + steel pair becomes capacity, goods fill the holds, pairs bought under $1,000, cheapest
development level first, depots only when they pay back (FR-125 to FR-132). Against the frozen M4 player,
seeds 1 to 4: turn 15 1.60 to 1.65 times, turn 25 1.76 to 1.81, turn 40 2.39 to 2.55. Merged as PR 19 (main a267a03).
## 2026-11-12 M4.3 transport popup and rail links (archived)

Entries in `docs/journal/archive-M4.3.md`, with its review fix round. The transport popup with icons, groups by
kind and columns (FR-133 to FR-135); rail links are only the sections built, the triangle bug (FR-136 to
FR-139); the scripted engineer orders sections. Lowest FR-125 ratio 1.60 to 1.55. Merged as PR 20 (main
274ef62).

## 2026-11-12 M4.4 Recruiting AI and empty groups (archived)

Entry in `docs/journal/archive-M4.4.md`, with its probe tables and review fix round. The transport popup lists only
what the network can carry and hides empty groups (FR-141, FR-142); the furniture bound counts 2 lumber (FR-140);
recruiting measured and not built (probe in `scripts/probes/m4-4/`, card Q21 option a). Merged as PR 21 (main e018d85).

## 2026-11-13 v2 plan (night shift, NR-030; archived)

Entry in `docs/journal/archive-v2-plan.md`. Plan in `docs/REVIVAL_PLAN.md` section 5b (M5 to M10, seven architecture
decisions); rules 01, 06, 07, 08 extended and 11-screens.md new; FR-144 to FR-234; decision cards Q22 to Q37.

## 2026-11-13 M5 World and seams for v2 (archived)

Entries in `docs/journal/archive-M5.md`: engine half, UI half, review fix round (19 findings), QA fix round (FR-235).
The continent world (two Great Power islands of 4 provinces each, Arvelia as the land bridge, Sundmark, Lorran and
Pellis on islands), minor nations apart from `nations`, `state.diplomacy` by pair, intents, `ctx.rngFor`, province and
minor borders on the map, the minor tile panel. FR-144 to FR-160 and FR-235 tested; 976 unit tests, Playwright 24
passed, 1 skipped; every v1 baseline unchanged on two-islands. Merged as PR 23 (main 0bfd870).

## 2026-11-13 M6 Diplomacy (archived)

Entries in `docs/journal/archive-M6.md`: engine half, UI half, review fix round (20 findings), QA fix round (FR-236 to FR-241)
and the fixes of its review. Five diplomacy order kinds stored as intents, the diplomacy phase before trade, relation points,
trade policies, the scripted answers and peace offers; the Diplomacy screen in two panes, Accept Offer and one shared Modal.
FR-161 to FR-181 and FR-236 to FR-241 tested; 1283 unit tests, Playwright 30 passed, 1 skipped; every v1 baseline unchanged.
Merged as PR 24 (main 2a60a3b). Open: the decision card "who receives a grant" (review fix round decision 3).

## 2026-11-13 M7 Nation-to-nation trade (archived)

Entries in `docs/journal/archive-M7.md`: engine half, UI half, review fix round (20 findings), QA fix round (FR-251 to FR-258) and
the review of the QA fix round (FR-259). The partners market on the continent (minors offer and buy, favourite partners, barriers),
the Board of Trade and the Deal Book, the scripted player trading through it, one money formatter. FR-183 to FR-198 and FR-242 to
FR-259 tested; 1458 unit tests, Playwright 32 passed, 1 skipped; every v1 baseline unchanged. Merged as PR 25 (main d16afa7).
Open: card Q47 (the World market's greyed "−").

## 2026-11-13 M8 Armies (archived)

Entries in `docs/journal/archive-M8.md`: engine half, UI half, review fix round (20 findings, FR-260 to FR-262), QA fix round (FR-263 to
FR-269) and the review of the QA fix round (FR-270, FR-271). Regiments, one army per country per province, recruit / march / disband
orders, upkeep and its forecast, the scripted garrison; the map markers and march arrows, the Army screen and the Armoury. FR-199 to
FR-215 and FR-260 to FR-271 tested; 1709 unit tests, Playwright 35 passed, 1 skipped; every v1 baseline unchanged. Merged as PR 26
(main c91f2fd). Open: decision 1 of the review fix round (the reserve step at turn 33) and decision 2 (warn, do not refuse) for Nathan.

## 2026-11-13 M9 War and the attack screen (archived)

Entries in `docs/journal/archive-M9.md`: engine half, UI half, review fix round (17 findings, FR-274, FR-275), QA fix round (FR-276 to
FR-280) and the review of the QA fix round (FR-281). Attacks as `moveArmy` intents, one battle per attacked province in the combat phase,
conquest, colonies and the conquest game over, the scripted war on minors; the Attack and Battle screens, the red attack arrow, the art pack
in the war screens. FR-216 to FR-228, FR-230 to FR-234, FR-272 to FR-281 tested; 1885 unit tests, Playwright 36 passed, 1 skipped; every
v1 baseline and FR-260 unchanged. Merged as PR 27 (main f817da2). Open: the cards of the M9 decisions (Attack button, crossing strikes, ramp).

## 2026-11-13 M10 Council of Governors, engine half (archived)

Entry in `docs/journal/archive-M10.md`: `engine/council/council.ts` (meeting turns, standing, nominees, one ballot per province,
the count, the winner), the `council-met` event and the Council game over in `resolveTurn`, the API the UI half builds on, and
the decision cards Q50 to Q56. FR-290 to FR-296, FR-302 and FR-305 tested; 1940 unit tests; every baseline unchanged.

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
