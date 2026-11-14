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
- 2026-11-13 M10 Council of Governors (FR-290 to FR-305) in progress on `claude/m10-council` (worktree
  `imperialism-game-revival-fee36d`): engine half and UI half committed, every FR-290 to FR-305 tested; next the milestone
  review, the app check and the PR. Not pushed. Cards Q50 to Q56 to put on the progress page.

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
