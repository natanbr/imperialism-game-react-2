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
- 2026-11-13 M8 Armies in progress on `claude/m8-armies` (worktree `imperialism-game-revival-fee36d`): the engine half
  (FR-199 to FR-209, FR-213, FR-215), the UI half (FR-210 to FR-212, FR-214), the review fix round (20 findings,
  FR-260 to FR-262), the QA fix round (7 items, FR-263 to FR-269) and its review's fixes (3 findings, FR-270, FR-271) are
  committed; not pushed. The engine and UI halves' entries are in `docs/journal/archive-M8.md`. Next: the re-review, the PR.

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

## 2026-11-13 v2 plan (night shift, NR-030)

Size: L (plan). Branch `claude/v2-plan`. Ultracode workflow 1 (8 agents): code map (Sonnet 5.5 xhigh), four web
research lanes (Sonnet 5.5 xhigh: trade, diplomacy, army, combat; the combat lane stalled on a browser call and
was re-run with web pages only), rules writer (Sonnet 5.5 xhigh), spot-check (Sonnet 5.5 high), spec writer
(Opus 5.5 high: a spec others execute).

- Plan: `docs/REVIVAL_PLAN.md` section 5b (M5 to M10, seven architecture decisions).
- Rules: `docs/rules/01`, `06`, `07`, `08` extended, new `11-screens.md`; gaps updated (F12 to F19, H1 to H18).
  Main source: a Let's Play of Imperialism (1997) with screenshots (lparchive.org); every number tagged Imp1,
  Imp1 [?] or remake. Spot-check: 13 of 18 claims confirmed on the screenshots, 5 tagged [?]; the orchestrator
  opened Update 07 itself (text confirms the worker grades; costs are only on the screenshots).
- Requirements: FR-144 to FR-234 (M5 FR-144 to 160, M6 161 to 181, M7 182 to 198, M8 199 to 215, M9 216 to 234).
- Decision cards (defaults taken, nobody to ask; on the progress page): Q22 one land-bridge minor (Arvelia)
  and three island minors (option b, the spec writer's suggestion: neither capital province borders a minor);
  Q23 one province per minor; Q24 ten relation points a level, +1 a trade, +10 a pact, -40 a war; Q25 equal
  start relations; Q26 a consulate is needed to trade with a minor (plan rule; Imp1 needs none); Q27 a minor
  offers 1 unit per resource tile (at most 6) and buys 2 of each good; Q28 favourite partner = points +
  subsidy / 2, deals at the board price; Q29 the computer accepts alliance at level 7 and peace when losing;
  Q30 start army 2 Regulars, 1 Artillery, militia, fort on the capital; Q31 derived regiment costs, no
  Sappers; Q32 simple combat numbers (8 rounds, 70% hit); Q33 one army per country per province; Q34 a taken
  Great Power capital ends that nation, a taken minor capital makes a colony; Q35 the computer may attack the
  weakest minor from turn 10, never a Great Power; Q36 upkeep it cannot pay disbands the newest regiments;
  Q37 Join the Empire, rail and sea moves, generals and medals stay out of v2.
- Objection: one province per minor and one army per province make war short (one battle takes a minor);
  acceptable for a first playable war, revisit after Nathan plays.

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

## 2026-11-13 M8 Armies, engine half and UI half (archived)

Entries in `docs/journal/archive-M8.md`. Engine half (FR-199 to FR-209, FR-213, FR-215): `state.armies`, the regiment table, four
army orders, the upkeep, recruit and march steps of the turn, the scripted army and the start forces; nine decisions and the API for
the UI half; 1603 unit tests. UI half (FR-210 to FR-212, FR-214): the map markers, the Army screen, the Armoury and
e2e/m8-armies.spec.ts; six decisions; 1647 unit tests, Playwright 33 passed, 1 skipped.

## 2026-11-13 M8 Armies, review fix round (20 findings; FR-260 to FR-262)

Size: L (fix round over the engine and the screens). One fix agent (Opus 5.5, xhigh, no subagents, no advisor call), started by
the M8 workflow. Branch `claude/m8-armies`, not pushed. Every finding fixed; none carried. FR ids: the merged FR-157 is replaced
by FR-260 and FR-256 is extended by FR-262 (new ids, FLOW); M8's own rows are amended in place with a status note, as the M4.3
fix round did for FR-023 and FR-137; FR-261 is the new upkeep forecast.

| Finding | What changed | Test |
|---|---|---|
| R1 (FR-157) | FR-260 replaces FR-157: the start army's turn-40 scores 1419, 1451, 1441, 1469 and the bare-continent equality (1493, 1496, 1490, 1476) are asserted, not logged | `engine/continentScore.test.ts` FR-260 rows |
| R2, F3, E1 (FR-213, FR-247) | `upkeepReserve` (`ai/scriptedPlayer.ts`): two turns of upkeep, and in the last 8 turns the upkeep of every turn left (`SCRIPTED_GARRISON.endgameTurns`); v2Trade40 counts no-pay disbands and the capital's arms, pinned 0 and 4; seed 2's treasuries 0/2,176 become 150/2,376 | `engine/v2Trade40.test.ts` (baseline + garrison row), `engine/scriptedArmy.test.ts` FR-213 (a) rows |
| R3 (FR-213) | (a), (b), (c) written into FR-213's SHALL text; one test row each | (b): new steel row; (c): the world-market row renamed; each seen red with its rule off |
| R4, E4 (FR-200, FR-201) | the capital rule in FR-200; at End Turn a nation without its capital province gets its recruits' cost back (`withRecruiting`, shared with `setRecruitment`) and `recruits-refunded` | `engine/armies.test.ts`, `engine/validate.test.ts`, `ui/gameText.test.ts` |
| R5 (FR-256) | FR-262: `dealBook().recruits`; the Treasury table shows "1 Regulars recruited -$500", not "Other" | `ui/dealBookView.test.ts`, `ui/dealBook.test.tsx` |
| R6 (FR-170) | the grant row split: $1,000 to $5,000 exact with the upkeep; $10,000 asserts the forecast, the no-pay event (3) and no upkeep event | `engine/diplomacy.test.ts` |
| R7, F5 (FR-205) | new reason `attack-not-available` ("attacks are not possible yet") for a march into a country at war | `engine/validate.test.ts`, `ui/gameText.test.ts` |
| R8 (FR-204) | `movedOnTurn` in FR-204's shape; the shape test runs after a march too | `engine/armies.test.ts` |
| R9 (FR-204) | the helper test became an engine test of an army in another country's province: strength, upkeep, its own army, healing | `engine/armies.test.ts` |
| R10 | "(14)" corrected to "(13)" in the engine half's plan-lite | none (text) |
| F1 (FR-211) | no row to tick: "Militia defend their province: they cannot march or be disbanded." or "Every regiment here already has an order this turn." | `ui/armyDialog.test.tsx` (2 rows) |
| F2 (FR-202) | FR-261: `upkeepForecast` (disbands ordered, standing locked grants); "Army upkeep at End Turn: $100" in the Army screen and the Armoury; the short warning there and in the HUD | `engine/upkeep.test.ts` (5), `ui/armyDialog.test.tsx`, `ui/armouryDialog.test.tsx`, `ui/warehouseAndHud.test.tsx` |
| F4 (FR-207, FR-211) | new order `cancelDisband`; "Cancel disband" on a disband-ordered row | `engine/armies.test.ts`, `engine/validate.test.ts` (7 rows), `ui/armyDialog.test.tsx` |
| F6 | `counterparty = (id` spacing restored in `market/dealBook.ts` | none (format) |
| E2 (FR-204) | `strength` sums FPN x health and divides by 100 once | `engine/armies.test.ts` (12 at 10 + 12 at 20 = 12 at 30 = 3.6) |
| E3 (FR-213) | `SCRIPTED_GARRISON.capitalArms` asserted by the FR-213 ten-turn war, FR-247 and FR-260 tests | as named |

Decisions (defaults, nobody to ask):
1. E1, the reserve rule, by measurement (`scripts/probes/m8/`, rules "upkeepTurns:endgameTurns"; seeds 1 to 10, partners =
   FR-247's game, 20 nation-games): 2:1 (before) lost the field army in 6 of 20; a flat 4 turns in 1 of 8 (seeds 1 to 4); a flat 5
   in 1 of 20; 6 and 8 in none but about 100 points lower at turn 40 (1221 to 1359 against 1311 to 1391); 4:10 in none but moves
   FR-260's world games; 2:8 in none and leaves FR-260's world games as they were (1419, 1451, 1441, 1469). Taken: 2:8.
   Objection: the reserve steps from $200 to $800 at turn 33, so a nation that spends down on turn 32 and then sells nothing for 8
   turns still loses regiments; not seen on seeds 1 to 10.
2. F2: warn, do not refuse. No order is refused for leaving less than the upkeep (it would refuse grants, bids and development by
   an army rule; Imp1 goes into debt instead, Q36). Card for the page: "Refuse orders that leave less than the army upkeep?",
   suggestion: no, keep the warning. The forecast ignores this turn's sales (they only add) and a war declared this turn that
   ends a grant (it warns a little early, never late).
3. R4: refund rather than lose the recruits. M9 ends a nation whose capital is taken (Q34), so the refund matters only for the
   step between; it keeps "nothing vanishes without a news line".
4. F4: a new order `cancelDisband`, not a wider `cancelArmyMove`: the order names say what they cancel.
5. FR-261's header line is the whole army's upkeep, not the province's, so it reads the same in every province.

Plan-lite: change as in the table; consumers the scripted player, the Army screen, the Armoury, the HUD, the Deal Book, M9 (the
attack replaces `attack-not-available`); verify the gate and the e2e suite; Objection: decision 1's step.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red: E1 (the old rule, `endgameTurns: 1`) | `npx vitest run tests/engine/v2Trade40.test.ts` (`.gate/m8fix/red-e1.txt`) | `Tests 2 failed \| 7 passed (9)`; `"noPay":[3,0],"capitalArms":[0,4]` (seed 2), `"noPay":[0,3]` (seed 4) |
| Red: FR-213 (a), (b), (c), each rule off | `npx vitest run tests/engine/scriptedArmy.test.ts` (`red-213a/b/c.txt`) | (a) `expected 600 to be greater than or equal to 800`; (b) `expected 0 to be greater than or equal to 4`; (c) `expected [ { kind: 'sellCommodity', …(3) } ] to deeply equal []` |
| Red: E2 (the float sum) | `npx vitest run tests/engine/armies.test.ts -t E2` | `expected 3.5999999999999996 to be 3.6` |
| Red: the 14 changed test files on the source of 9ee1e44 | `npx vitest run` on them (`.gate/m8fix/red-all.txt`) | `Test Files 13 failed \| 1 passed (14)`, `Tests 30 failed \| 482 passed (512)` (the one file passing is continentScore: R1 pins numbers that did not move) |
| Unit tests | `npm test` (`.gate/m8fix/gate-test.txt`) | `Test Files 90 passed (90)`, `Tests 1688 passed (1688)` (+41 on 1647) |
| v1 baselines unchanged (FR-159) | `npm test` console; `git diff --stat d16afa7 --` the FR-159 files | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` as on main; the diff is empty |
| FR-260, FR-247 | `npm test` console | `[[1,1419,1493,1493],[2,1451,1496,1496],[3,1441,1490,1490],[4,1469,1476,1476]]`; seed 2 `"treasury":[150,2376],"noPay":[0,0],"capitalArms":[4,4]` |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 6.0s`, `✓ Generating static pages (4/4)` |
| e2e suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`.gate/m8fix/e2e.txt`) | `33 passed (4.2m)`, `1 skipped` (the old skip) |

Carried: none of the findings. Decision 1's step and decision 2's card wait for Nathan.

In the app: New game; Open the Army screen from the capital marker: "Army upkeep at End Turn: $100" beside "Force Size: 4"; the
North-West marker's screen says "Militia defend their province: they cannot march or be disbanded."; disband a regiment and
"Cancel disband" brings it back. Spend the treasury below $100 (bids, grants): the HUD, the Army screen and the Armoury show
"Cash is short of the army upkeep: ...".

## 2026-11-13 M8 Armies, QA fix round (7 items; FR-263 to FR-269)

Size: M (map, two dialogs, HUD). One fix agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the M8 workflow, on Nathan's QA
of `m8-armoury.png`, `m8-army.png`, `m8-map.png` (as of 744d755; re-taken in the next entry); not pushed. Plan-lite: as in the table; consumers the player and M9 (`marchArrows`);
verify the gate. Objection: three Armoury cards a row, so below 1280x720 its card area scrolls sooner (at 1280x720 it fits, checked).

| Item | What changed | Test |
|---|---|---|
| 1 FR-263 | `pendingArmyOrders`; a dashed arrow per pair of provinces with its count (`marchArrows`, own SVG overlay at z-index 4), named "Testland North-West: 1 regiment marching in from Testland South-West"; "−1" on a marker with a disband; ", 1 marching out / in, 1 to disband" in our markers' names | engine/armyReads, ui/armyMarkers (+5), e2e m8-armies |
| 2 FR-264 | `beforeRecruiting`; "Armaments: 1 in warehouse, 1 reserved by this order" (", 1 reserved by other recruits" on the other cards); short only with none of the type ordered; "1 armament"; three cards a row in 1248 px, each cost on one line | engine/armyReads, ui/armouryDialog (+3, 4 rows changed), e2e m8-armies |
| 3 FR-265 | the Arms legend under the table, the head's description and title; `scope="col"` on the heads | ui/armyDialog, e2e m8-armies |
| 4 FR-266 | `upkeepIn`; "Upkeep here: $50 a turn" beside Force Size, "Army upkeep at End Turn: $100 for all provinces" under it | engine/armyReads, ui/armyDialog (+2, 1 changed), e2e |
| 5 FR-267 | militia only: no "March to", March or Disband; the reason once | ui/armyDialog (F1 row replaced, +1) |
| 6 FR-268 | `.hud-content` a flex column; the news list its own scroll region of whole 20 px lines in the height left above the fade, named by its heading, Tab | ui/newsPanel (2), e2e m8-qa |
| 7 FR-269 | a $10,000 grant on turn 1, the HUD warning on screen, `docs/journal/m8-qa-upkeep-warning.png` | e2e m8-qa |

Decisions (defaults, nobody to ask): (1) item 2's two sentences clash on the QA case (the recruit worked, the next cannot be paid): "short"
only while none of the type is ordered; the "+" note says what stops the next (Objection: with one ordered, only the note shows it). (2) No
amount was ever cut (`nowrap`); "$1,000 on one line" read as each cost on one line, which needs three cards a row (Light Artillery about 280
px); the note moved beside the title so 3 rows fit 720 px. (3) "Arms" kept with the legend; other nations' intents never drawn; news: the
scroll option in whole lines (`round(down, 100cqh, 20px)`); the fade kept `flex: none` (it collapsed to 0 px). (4) Changed tests assert the replacing rows.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red: unit, before the change | `npx vitest run` on the 5 files (`.gate/m8qa/red.txt`) | `Test Files 5 failed (5)`, `Tests 22 failed \| 48 passed (70)`; `(0 , pendingArmyOrders) is not a function`, `Unable to find an element by: [data-testid="army-upkeep-here"]`, `expected [ '4 untrained workers', …(2) ] to deeply equal [ 'Untrained workers: 4 free', …(2) ]`; FR-268's own-lines-first row passed (FR-107 held) |
| Red: e2e on the source of 744d755 | `PORT=3160 npx playwright test e2e/m8-armies.spec.ts e2e/m8-qa.spec.ts` (`.gate/m8qa/e2e-red.txt`) | `2 failed`, `1 passed` (FR-214's at hand; FR-268 finds no news list; FR-269's warning held before) |
| Unit tests | `npm test` (`.gate/m8qa/gate-test.txt`) | `Test Files 92 passed (92)`, `Tests 1708 passed (1708)` (+20 on 1688) |
| Baselines unchanged | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)`; FR-260 `[[1,1419],[2,1451],[3,1441],[4,1469]]`; FR-247 seed 2 `"treasury":[150,2376],"noPay":[0,0],"capitalArms":[4,4]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6); tsc exit 0, no output |
| Build | `npm run build` (`.gate/m8qa/gate-build.txt`) | `✓ Compiled successfully in 8.5s`, `✓ Generating static pages (4/4)` |
| e2e suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`.gate/m8qa/gate-e2e.txt`) | `35 passed (5.1m)`, `1 skipped` (the old skip; +2 on 33, e2e/m8-qa.spec.ts) |

In the app: Armoury "1 reserved by this order"; March draws a dashed arrow with "1"; Disband "−1". Shots: `docs/journal/m8-qa-armoury.png`, `m8-qa-army.png`, `m8-qa-upkeep-warning.png`.

## 2026-11-13 M8 Armies, review of the QA fix round (3 findings; FR-270, FR-271)

Size: S (one view function, one e2e spec, the shots). One fix agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the M8
workflow; not pushed. All three findings (minor) fixed; none carried. Plan-lite: `marchArrows` keeps an arrow with an opposite one 10 px
to its own right (`OPPOSED_OFFSET`); e2e/m8-armies.spec.ts measures the arrows against the drawn markers (`expectArrowOnMarkers`) and
orders marches both ways and a disband on turn 4; consumers the player and M9's attack arrows; verify the gate. Objection: the spec copies
15 px and 10 px from armyView.ts, so a deliberate change of either changes the spec too. The engine and UI halves moved to archive-M8.md.

| Finding | What changed | Test |
|---|---|---|
| F1 FR-270 | marches both ways between two provinces: each arrow 10 px to its own right, so the count badges (r 8) lie 20 px apart; a lone arrow stays on the line between the markers | ui/armyMarkers (+1), e2e m8-armies (turn 4) |
| F2 FR-271 | the e2e reads each marker's box in the browser and the arrow's line and tip in map pixels (`getScreenCTM`): 15 px along, 0 or 10 px to the right, within 1.5 px, for 3 arrows; the `MARKER_CENTRE` comment names the check | e2e m8-armies |
| F3 FR-271 | the spec saves and attaches m8-qa-map.png on turn 4: arrows "2" and "1" side by side, "−1", turn 3's news in whole lines; m8-armoury.png, m8-army.png, m8-map.png re-taken from this code (Nathan's QA input stays at 744d755) | e2e m8-armies |

| Claim | Command | Result (quoted) |
|---|---|---|
| Red: F1, unit | `npx vitest run tests/ui/armyMarkers.test.tsx` (`.gate/m8qa2/red-unit.txt`) | `Tests 1 failed \| 14 passed (15)`; `expected -0.019156525704419086 to be greater than or equal to 8` |
| Red: F1, e2e on the old armyView.ts | `PORT=3160 npx playwright test e2e/m8-armies.spec.ts --workers=1` (`e2e-red-f1.txt`) | `1 failed`; `count badges [{"x":128.75,"y":285.25,"width":17.5,"height":17.5},{"x":128.75,"y":285.25,...}] share no pixel` |
| F2 catches drift: `.armies` top 9 to 14 px | same (`e2e-red-css.txt`), the CSS restored after | `1 failed`; `the line starts 20.5 px on from the source marker's centre` |
| FR-270, FR-271 | same, with SCREENSHOT_DIR (`e2e-target.txt`) | `1 passed (43.6s)` |
| Unit tests | `npm test` (`.gate/m8qa2/gate-test.txt`) | `Test Files 92 passed (92)`, `Tests 1709 passed (1709)` (+1 on 1708) |
| Baselines unchanged | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58)`; FR-260 `[[1,1419],[2,1451],[3,1441],[4,1469]]`; FR-247 seed 2 `"treasury":[150,2376],"noPay":[0,0],"capitalArms":[4,4]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6); tsc exit 0, no output |
| Build | `npm run build` (`gate-build.txt`) | `✓ Compiled successfully in 15.4s`, `✓ Generating static pages (4/4)` |
| e2e suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`gate-e2e.txt`) | `35 passed (7.1m)`, `1 skipped` (the old skip; the same 36 tests as the QA fix round) |

In the app: on turn 4 march 3rd Regulars from North-West to South-West and 1st, 2nd Regulars the other way: two dashed arrows side by
side with "1" and "2". Shot: `docs/journal/m8-qa-map.png`.
