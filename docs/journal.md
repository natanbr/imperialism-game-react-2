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
- 2026-11-13 M9 War and the attack screen in progress on `claude/m9-war` (worktree `imperialism-game-revival-fee36d`):
  the engine half (FR-216 to FR-228, FR-234; FR-229 replaced by FR-274), the UI half (FR-230 to FR-233, FR-272, FR-273)
  and the review fix round (all 17 findings; new FR-275) are committed; next the re-review of the fix delta. Not pushed.

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

## 2026-11-13 M9 War and the attack screen, engine half (FR-216 to FR-229, FR-234)

Size: L (engine-wide: a new intent kind, the battle step of the combat phase, conquest, colonies, the conquest game over, the
scripted war). One engine agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the M9 workflow. Branch `claude/m9-war`
(worktree `imperialism-game-revival-fee36d`), not pushed. The UI agent builds FR-230 to FR-233 and the art (NR-031) next, on the API below.

Plan-lite:
- Change: `moveArmy` into a country at war stores an `attack` intent; `combatSystem` fights one battle per attacked province after the
  marches (`army/combat.ts` `fightBattle`, `definisions/combatRules.ts`), emits `battle-resolved` and applies `army/conquest.ts`
  (`takeProvince`: FR-222, the fall FR-223, the colony FR-224); `resolveTurn` ends the game on conquest; `ai/scriptedWar.ts` (FR-228, FR-229).
- Consumers: the Army screen ("Attack Arvelia", the attacking status), the attack screen, the battle screen, the news, the map's red
  arrows, the Diplomacy screen ("Colony"), the scripted player.
- Tests: FR-216 to FR-221, FR-225 to FR-227 `engine/combat.test.ts` (FR-216 also `engine/validate.test.ts`, FR-225 also
  `store/gameStore.test.ts`); FR-222 to FR-224 `engine/conquest.test.ts` (FR-223 also `ui/scoreAndGameOver.test.tsx`, FR-224 also
  `engine/partnerMarket.test.ts`); FR-228, FR-229 `engine/scriptedWar.test.ts` (with the 4-seed acceptance); FR-234 rows in combat and
  scriptedWar, and FR-159 / FR-260 unchanged.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Objection: FR-229's documented "1 Regulars a turn" can never fire in a real game (decision 1), so the rule is tuned; a campaign that
  cannot finish (seed 4) leaves its regiments idle, paying upkeep, to the end.

Red (tests first, before any engine change): `npx vitest run` on the 3 new and 3 changed files (`.gate/m9/red.txt`): `Test Files 6 failed
(6)`, `Tests 4 failed | 333 passed (337)`; the new suites fail to load (`Cannot find module '@/engine/army/combat'`, `'@/engine/army/conquest'`,
`'@/engine/ai/scriptedWar'`); `expected { ok: false, …(1) } to deeply equal { ok: true }` (FR-216), `expected {} to deeply equal { clothing: 2,
furniture: 2, …(1) }` (FR-224), `expected [ 'unknown-nation', …(25) ] to not include 'attack-not-available'`.

Decisions (defaults, nobody to ask; cards for the progress page):
1. FR-229 tuned, the acceptance kept. With the documented Regulars no seed declared war: the economy trains every untrained worker by turn
   4 (FR-130), so from turn 10 a Regulars can never be raised (probe `scripts/probes/m9/campaign.probe.ts`). The campaign now raises
   Cuirassiers (`SCRIPTED_WAR.regiment`: a trained worker, 1 of the 4 start horses, $500, FPN 15; 3 make 45, twice Arvelia's 18.75) and
   wants arms only while it has a horse and a healthy trained worker (on the world market the economy sells its horses before turn 10;
   without this rule it made and held 2 armaments for nothing and FR-260 fell to 1416, 1421, 1407, 1441). Per seed (default partners
   continent, Testland idle), war declared / Arvelia taken / lowest treasury: Regulars: none / none / $143, $16, $312, $32 on seeds 1 to 4;
   Cuirassiers: seed 1 turn 21 / 22 / $1, seed 2 21 / 22 / $142, seed 3 21 / 22 / $2, seed 4 none (2 raised, its trained workers became
   experts) / $965: 3 of 4, as FR-229 asks. Card: "The scripted campaign raises Cuirassiers, since no untrained worker is ever free.
   Keep, or let the economy keep untrained workers for Regulars?" Suggestion: keep; revisit with migrant recruiting (Q21). Objection: the
   same holds for FR-213's threat recruit (Regulars), which therefore never fires in a real game either; not changed (M8's rule).
2. An attack is its own intent kind (`attack`, `targetId` the owner), so FR-169's peace drop (M6) works unchanged; `cancelArmyMove` takes
   back both kinds.
3. A regiment leaving a battlefield (an attacker going home, a routed defender) is placed after the last battle of the turn, so no regiment
   fights twice a turn and battles in id order do not favour the lower ids. One with no province of its owner to go to surrenders.
4. With several attacking countries only the winner's survivors stay; the others go home as from a failed attack. `battleOutcome` reads
   "attack-failed" for them.
5. The report's `damage` is the health the shot took (at most the health left), so the shots add up to the end healths without a clamp;
   the estimate's verdict is a code the screen words ("likely-victory").
6. Land changes hands now: the test fixtures' world invariants (FR-157, `worldViolations`) accept a province owner and `colonyOf`
   changed by conquest only (to a Great Power; a colony's owner holds its capital) and keep every other check; FR-249's empty colony
   demand is replaced by FR-224 (its test row rewritten to the new rule); FR-213's ten-turn peace row ends at turn 9 on the continent.
7. FR-247's measured baseline moves on purpose and is re-pinned (both nations raise Cuirassiers for Arvelia; Valdoria takes it on turn 22
   in seeds 1, 3, 4; Testland's 1 or 2 stay in its capital). FR-260 and every v1 baseline are unchanged.
8. The news lines of FR-232 (`gameText.ts`: "Battle at Arvelia: Province Taken!", "... taken from ...", "... has fallen.", "... is now
   our colony.") and FR-223's game-over line ("Testland has conquered Valdoria.") are in, as TypeScript needs a line for every event;
   FR-232's tests and the rest of its behaviour stay with the UI agent.

API for the UI half (all from `@/engine`): `attackTargets(state, nationId, provinceId)` (bordering foreign provinces, for "Attack
Arvelia"); `attackStatus(...)` "ready" / "war-starts-next-turn" / "not-at-war" / "own-province"; `battleEstimate(state, regimentIds,
provinceId)` `{ attack, defence, ratio, verdict }`; `defendersOf(state, provinceId)` `[{ regiment, ownerId, protection: { kind: "none" |
"entrenched" | "fort", level?, percent } }]`; `fortLevelOf`; `regimentStatus` kind "attacking" `{ toProvinceId, targetId }` (armyView's
default still reads "Defending" for it); `pendingArmyOrders(...).attacks` (the red arrows); events `battle-resolved` (`BattleReport` in
`types/Battle.ts`), `province-taken`, `nation-fallen`, `minor-colonised`; `battleFrames(report)` (frame 0 = start, then one per round, the
last with the fates), `battleOutcome(report, countryId)` "province-taken" / "attack-failed" / "province-lost" / "enemy-beaten-back",
`battlesFoughtBy(events, countryId)`; `MinorNation.colonyOf`; `GameOver.reason` "conquest" and `winnerId`; `COMBAT`, `ESTIMATE`.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the engine change | `npx vitest run` on the 6 files (`.gate/m9/red.txt`) | `Test Files 6 failed (6)`, `Tests 4 failed \| 333 passed (337)` |
| FR-216 to FR-221, FR-225 to FR-227 | `npx vitest run tests/engine/combat.test.ts tests/engine/conquest.test.ts` (`.gate/m9/run2.txt`) | `Test Files 2 passed (2)`, `Tests 50 passed (50)` |
| FR-228, FR-229 and the acceptance | `npx vitest run tests/engine/continentScore.test.ts tests/engine/scriptedWar.test.ts` (`.gate/m9/baselines2.txt`) | `FR-229 per seed (declared, colonised, lowest treasury): [[1,21,22,1],[2,21,22,142],[3,21,22,2],[4,null,null,965]]`; `Tests 40 passed (40)` |
| FR-229 with the documented Regulars | `npx vitest run tests/engine/scriptedWar.test.ts`, before the tuning (`.gate/m9/run3.txt`) | `[[1,null,null,143],[2,null,null,16],[3,null,null,312],[4,null,null,32]]`; `Tests 1 failed \| 14 passed (15)` |
| FR-247 re-measured | `npx vitest run tests/engine/v2Trade40.test.ts` (`.gate/m9/fr247.txt`) | `"minorDeals":[60,60] ... "capitalArms":[5,4]` (seed 1); after the re-pin `Tests 9 passed (9)` |
| Unit tests | `npm test` (`.gate/m9/gate-final-test.txt`) | `Test Files 95 passed (95)`, `Tests 1778 passed (1778)` (+69 on 1709) |
| v1 and v2 baselines unchanged (FR-234) | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` as in M8; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (`.gate/m9/gate-final-build.txt`) | `✓ Compiled successfully in 6.4s`, `✓ Generating static pages (4/4)` |

Carried: decision 1's card; FR-213's Regulars never raisable (objection of decision 1); idle campaign regiments keep costing upkeep.
Not run: Playwright (no screen changed beyond the game-over line; the UI half adds e2e/m9-war.spec.ts).

## 2026-11-13 M9 War and the attack screen, UI half (FR-230 to FR-233, FR-272, FR-273)

Size: L (the UI half of the milestone: two new dialogs, the Army screen, the map, the news, the store, the art pack). One UI
agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the M9 workflow, on the engine half's API. Branch
`claude/m9-war` (worktree `imperialism-game-revival-fee36d`), not pushed.

Plan-lite:
- Change: the Attack screen (`AttackModal.tsx`, `army/attackView.ts`) from the Army screen's "Attack Arvelia" and from a map
  click with regiments selected; the Battle screen (`BattleModal.tsx`, `army/battleView.ts`) replaying a report, opened by
  itself after End Turn and from the news (`newsItems`); "Colony" in Diplomacy; the art pack (one table `art/inkArt.ts`)
  in the Army screen, the Armoury, both new screens; the map's red attack arrow and green marches.
- Consumers: the player; the store keeps `armySelection`, `attackPlan`, `battleQueue` (UI state only).
- Tests: FR-230 `ui/attackDialog.test.tsx` (+ `ui/armyDialog.test.tsx`); FR-231 `ui/battleReplay.test.tsx`; FR-232
  `ui/battleReplay.test.tsx`, `ui/gameText.test.ts`; FR-233 `e2e/m9-war.spec.ts` (+ `ui/diplomacyDialog.test.tsx` for the
  chip); FR-272 `ui/inkArt.test.ts` and the picture rows of the Army, Armoury, Attack and Battle tests; FR-273
  `ui/armyMarkers.test.tsx`, `ui/inkArt.test.ts`; FR-022 `ui/uiWritesOnlyOrders.test.ts` scans both new dialogs.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `PORT=3160 npx playwright test --workers=1`.
- Objection: the selection kept on the map is a little hidden (tick in the Army screen, close it, click the enemy land);
  the marker's ring and ", 3 selected" are its only signs. The Army screen's "Attack…" is the main way.

Red (tests first, before any UI change; `.gate/m9ui/red.txt`): `Test Files 9 failed (9)`, `Tests 10 failed | 185 passed
(195)`; four suites fail to load (`Cannot find module '@/components/art/inkArt'`, `AttackModal`, `BattleModal`, `attackArrows`),
`expected [ 'Consulate' ] to deeply equal [ 'Colony', 'Consulate' ]`, `expected 'Arvelia taken from Arvelia.' to be 'Arvelia
taken.'`, the Army and Armoury picture rows `expected [] to deeply equal [ [ …(2) ], …]`.

Decisions (defaults, nobody to ask; cards for the progress page):
1. FR-230's "picks Attack Arvelia" opens the dialog through the button beside the select: picking "Attack Arvelia" turns
   "March" into "Attack…", and that opens the Attack screen. A select that opens a dialog on change opens it on every
   arrow key (WCAG 3.2.2 On Input). Card: "Open the Attack screen on the pick itself?" Suggestion: keep the button.
2. "Our chosen regiments" are the ticked ones. The ticks live in the store as the army selection: kept when the Army
   screen closes, so a click on a bordering enemy province opens the Attack screen with them (FR-230's map path); the
   marker wears the accent ring and its name ends ", 3 selected"; End Turn and a click on any other tile drop it.
3. NR-031's arrows (new FR-273, replacing FR-263's nation colour and dashes): an attack is the pack's own red arrow,
   scaled and turned as one onto the two markers; a march keeps its straight measured line and head (FR-270's arrows both
   ways side by side, FR-271's browser measure unchanged) in the pack's movement green with its ink outline. The FR-263
   test's colour lines now assert FR-273's green (a changed requirement, not a looser test). The colours are 4 new tokens,
   checked against the SVG files.
4. FR-211's row "no bordering province of ours: the select is empty" no longer holds on the continent's South-West alone
   (FR-230 lists the attacks there); it is rewritten to the attack entries, and the empty select is tested on an island
   province (Sundmark given to Testland).
5. The era-1 art: the pack draws three eras per Imp1 line, so Light Artillery is `horse-artillery.png` and Artillery
   `heavy-artillery.png` (heavy line: heavy, siege, railroad gun); Minutemen are `militia.png`, Skirmishers
   `light-infantry.png`. Pictures are plain `<img>` (one `eslint-disable` in `art/ArtPicture.tsx`): Next's optimiser would
   re-encode files NR-031 keeps as supplied. Fort pictures show on the Attack screen and as the Battle screen's wall; the
   map draws no fort yet, so none there.
6. A minor's one province bears its name: "Arvelia taken." instead of "Arvelia taken from Arvelia."; a battle the player
   fought is its own news line from its side (the engine left "Province Lost!" to do).
7. The Battle screen lies above every dialog, the game-over screen included, so a conquest's last battle is seen first.
8. FR-233 names `e2e/m9-war.spec.ts` (the brief said `e2e/m9.spec.ts`); the FR's name is kept, as the engine half's notes did.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the UI change | `npx vitest run` on the 9 new and changed UI files (`.gate/m9ui/red.txt`) | `Test Files 9 failed (9)`, `Tests 10 failed \| 185 passed (195)` |
| FR-230 to FR-232, FR-272, FR-273, the colony chip | the same 9 files after (`.gate/m9ui/run2.txt`) | `Test Files 9 passed (9)`, `Tests 265 passed (265)` |
| Unit tests | `npm test` (`.gate/m9ui/gate-test.txt`) | `Test Files 98 passed (98)`, `Tests 1848 passed (1848)` (+70 on 1778) |
| v1 and v2 baselines unchanged (FR-234) | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint | `npm run lint` (`.gate/m9ui/gate-lint.txt`) | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (`.gate/m9ui/gate-build.txt`) | `✓ Compiled successfully in 7.4s`, `✓ Generating static pages (4/4)` |
| FR-233 and the screens in the app | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`.gate/m9ui/pw-final.txt`) | `36 passed (5.8m)`, `1 skipped` (37 tests; m9-war.spec.ts new, m8-armies.spec.ts unchanged and green with the pictures) |

Seen in the app (screenshots under `.gate/m9ui/shots/`, git-ignored; `m9-battle.png` is attached to the spec's report): the Attack
screen over the Army screen at 1280x720, the red arrow from Testland North-East into Arvelia, the Battle screen's result with
"Province Taken!", Arvelia inside Testland's border after the conquest, the Armoury cards and Army rows with their pictures.

Carried: decision 1's card (the button, not the pick); the Imp1 defender prompt and the red crossed-swords cursor over enemy
land are not built; the map draws no fort; the rest of the art pack (terrain, goods, workers, buildings) waits for NR-031's
separate decision.

### Review fix round (2026-11-13)

Size: M (one fix round over both halves: 5 major and 12 minor findings of the two M9 review passes, all fixed). One agent
(Opus 5.5, xhigh, no subagents, no advisor call), started by the M9 workflow. Branch `claude/m9-war`, not pushed.

Red (each behaviour fix's new rows run on the code before it, the fixed files put back from HEAD for the run): F1, E2, E1
`Tests 4 failed | 55 passed (59)` (`expected 'nation-2' to be 'nation-1'`, the crossing outcome, the conquest game over;
`.gate/m9fix/red-engine.txt`); R1 `Tests 3 failed | 40 passed (43)` (`expected [ [ 1, 4 ], [ 2, +0 ], [ 3, 6 ], …(1) ] to
deeply equal [ [ 1, +0 ], …`; `red-r1.txt`); F2 `Tests 2 failed | 64 passed (66)` (`red-f2.txt`). The test-only rows were
checked against a mutation instead, each failing its new row: R8 engineers first in `FIRING_ORDER`, E3 combat reading
`ctx.rng`, R2 the queue filled with every battle.

| Finding | What changed | Test |
|---|---|---|
| F1, E2 (major) | `combatSystem`: every battle is fought before any capital falls; the falls apply after the last battle in the winners' `intentOrder` (`fallCapital`), void when the capital is back with its owner; the paths that could no longer run (`entering`, a war ended mid-phase, `gone`) removed | engine/combat.test.ts: crossing strikes, turn 1 Testland wins, turn 2 Valdoria; the game ends on that turn |
| E1 (major) | `takeProvince`: a colony passes with its capital province (`makeColony`: treaties of the others end, points 89, `minor-colonised`); `fallNation` gives the fallen's colonies to the winner | engine/conquest.test.ts: 2 rows with `settledTradeBarrier` and `worldViolations` |
| R1 (major) | new FR-275: with a field army the upkeep reserve is max(2, 16 - turns left) turns before the last 8, so it no longer steps from 2 to 8 at turn 33 | engine/scriptedArmy.test.ts (turns kept); FR-274's acceptance counts no-pay disbands: [4, 0, 6, 0] before, [0, 0, 0, 0] now; FR-247 re-pinned |
| R2 (major) | none in code | ui/battleReplay.test.tsx: only Valdoria fights, nothing queued; each fights its own battle, Testland's alone queued |
| R3 (major), F3 | FR-221 status; the overclaiming title split | engine/combat.test.ts: home lost, retreat to South-West; home lost and nowhere to go, surrender; moved after ordering, no attack; a fallen nation's regiment leaving a battle surrenders |
| R4, F4 | FR-229 replaced by FR-274 (Cuirassiers, the horse and trained-worker gate, no-pay in the acceptance); FR-213's status gives the 5/6 capital arms | scriptedWar.test.ts titles cite FR-274 |
| R5 | FR-167 and FR-174 statuses | none (docs) |
| R6 | e2e takes the red arrow file's tail and tip through the image's transform onto the markers (1.5 px) and checks the SVG is served | e2e/m9-war.spec.ts |
| R7 | `data-nation-id` on the territory outline; e2e: Testland's outline (`var(--color-nation-1)`) stops west of Arvelia's capital tile on turn 1 and runs east of it after the conquest | e2e/m9-war.spec.ts |
| R8, R9 | none in code | combat.test.ts: Sappers fire after the artillery; conquest.test.ts: prospecting and construction jobs end, civilians removed with no capital tile |
| R10 | the claim narrowed to what holds: above the game-over screen (79 over 75), not above Accept Offer (85); the CSS comment fixed | ui/battleReplay.test.tsx reads both overlay rules and the page's render order |
| F2 | new refusal "colony": no overture, grant or trade policy toward a colony; the Diplomacy screen disables them with "it is a colony, ruled by its owner" | conquest.test.ts, ui/diplomacyDialog.test.tsx |
| E3 | the FR-227 test replaced: after a battle the shared and the diplomacy streams give the same next draws as after none | combat.test.ts |

Decisions (defaults, nobody to ask; cards for the progress page):
1. R1: the ramp only for a nation with a field army (regiments beyond its capital keep). Measured with a temporary hook (not
   committed; `.gate/m9fix/ramp-shapes.txt`), FR-274 no-pay per seed / FR-260 scores: no ramp [4,0,6,0] / 1419, 1451, 1441,
   1469; every nation 3 turns at turn 31 and 4 at turn 32 [0,0,0,0] / 1417, 1439, 1437, 1469; every nation 3 to 7 from turn
   28 [0,0,0,0] / 1417, 1444, 1420, 1466; field army only, 3 to 7 from turn 28 (taken) [0,0,0,0] / 1419, 1451, 1441, 1469.
   FR-234 protects FR-260, so no every-nation ramp. Card: "A nation with a field army keeps more cash from turn 28 so it
   pays its army to the end. Keep, or ramp every nation (FR-260 moves by up to 21 points)?" Suggestion: keep. Objection: a
   nation with its garrison only keeps M8's step (M8 decision 1, still open), and "a field army" stands in for "upkeep above
   the income".
2. F1: crossing strikes on both capitals go to the first in `intentOrder` (the review's suggestion; the same fairness as
   FR-222's several attackers). Card: "Both capitals taken in one turn: the first in turn order wins. Keep?" Suggestion: keep.
3. R4: FR-229 gets a new id (FR-274) by FLOW's rule although M9 is not merged; FR-275 extends FR-213 (a) rather than replace it.
4. F2: refused, not hidden: the Diplomacy screen keeps the buttons, disabled with the reason, as for every refusal (FR-237).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the fixes | the new rows on the code before each fix (`.gate/m9fix/red-*.txt`) | `Tests 4 failed \| 55 passed (59)`, `Tests 3 failed \| 40 passed (43)`, `Tests 2 failed \| 64 passed (66)` |
| FR-274, FR-275 | `npm test` console (`.gate/m9fix/gate-test.txt`) | `FR-274 per seed (declared, colonised, lowest treasury, no-pay disbands): [[1,21,22,305,0],[2,21,22,340,0],[3,21,22,276,0],[4,null,null,965,0]]` |
| Unit tests | `npm test` (`.gate/m9fix/gate-test.txt`) | `Test Files 98 passed (98)`, `Tests 1864 passed (1864)` (+16 on 1848) |
| v1 and v2 baselines (FR-234) | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)` as before; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint | `npm run lint` (`.gate/m9fix/gate-lint.txt`) | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (`.gate/m9fix/gate-build.txt`) | `✓ Compiled successfully in 8.8s`, `✓ Generating static pages (4/4)` |
| e2e | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`.gate/m9fix/pw-final.txt`) | `36 passed (6.1m)`, `1 skipped` (37 tests; m9-war.spec.ts with the arrow measure and the outline check) |

Carried: M8 decision 1 (the reserve step for a nation without a field army) and decision 1 above; the Armoury's pictures are
still not checked as loaded in the browser (e2e/m8-armies.spec.ts; FR-272's status says so); the Battle screen lies under
Accept Offer when both open at a turn's start.
