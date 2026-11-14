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
  the engine half (FR-216 to FR-228, FR-234; FR-229 replaced by FR-274; entry archived in `docs/journal/archive-M9.md`),
  the UI half (FR-230 to FR-233, FR-272, FR-273), the review fix round (all 17 findings; new FR-275), the QA fix round
  (Nathan's 5 items; FR-276 to FR-280) and the fixes of its review (3 minor; FR-281) are committed. Not pushed.

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

## 2026-11-13 M9 War and the attack screen, engine half (archived)

Entry in `docs/journal/archive-M9.md`, with its decisions (FR-229 tuned to Cuirassiers, now FR-274) and the API for the UI half.
The `attack` intent, one battle per attacked province in the combat phase (`army/combat.ts`), conquest, colonies and the
conquest game over (`army/conquest.ts`), the scripted war (`ai/scriptedWar.ts`). FR-216 to FR-229 and FR-234 tested; 1778 unit
tests; every v1 baseline and FR-260 unchanged.

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

### QA fix round (2026-11-13)

Size: M (two dialogs, the hand-over between the Army and Attack screens, the HUD's news heading). One fix agent (Opus 5.5, xhigh,
no subagents, no advisor call), started by the M9 workflow, on Nathan's QA of `m9-qa-attack.png`, `m9-qa-arrow.png`,
`m9-qa-battle.png` (as of 99e9f39); not pushed. Plan-lite: as in the table; consumers the player; verify the gate. Objection: the
store keeps one more UI field (`armyTargetId`, the "March to" entry the Army screen reopens on) for the hand-over back.
To make room (FLOW: under 400 lines) the engine half's entry moved unchanged to `docs/journal/archive-M9.md`.

| Item | What changed | Test |
|---|---|---|
| 1 FR-276 | the Battle screen's grid: each side a group with a visible heading ("Attackers: Testland", "Defenders: Arvelia") naming its list, the wall between the groups; one heading class (`sideHeading`) on both screens | ui/battleReplay (+3), e2e m9-war (headings above and over their columns) |
| 2 FR-277 | "Deployment" with the two forces by type ("Testland attacks: 2 Regulars, 1 Artillery", "Arvelia defends: 3 Minutemen"); "Round 1" while stepping; "Result: 7 rounds were fought" at the result, by stepping or Skip | ui/battleReplay (+4; 6 rows rewritten to FR-277/278), e2e m9-war |
| 3 FR-278 | under the estimate "Strength: each regiment's firepower times its health, added up; an entrenched defender's counts 1.25 times. Likely victory at 1.5 times theirs or more, uncertain at 0.75 or more." (from COMBAT and ESTIMATE, the cover of this province); "Entrenched: takes 20% less damage." under the defenders; "Destroyed" for "KIA"; "25 damage" | ui/attackDialog (+5), ui/battleReplay (+1), e2e m9-war |
| 4 FR-279 | `openAttack` closes the Army screen; a plan with `fromArmyScreen` gives it back on close (Cancel, Escape, backdrop, after Attack) with `armyTargetId`, so "Attack Arvelia" stays picked; the ticks are the store's selection; the focus back on "Attack…" | ui/attackDialog (+6; the plan row now has `fromArmyScreen`), e2e m9-war (one dialog, Cancel and back) |
| 5 FR-280 | "News from last turn (turn 2, Summer 1815)" (`dateText`) | ui/newsPanel (+2; FR-268's name row rewritten), e2e m9-war, play-turns, m5-hud-scroll, market-and-game-over |
| found on the shots | "Destroyed" (and already "Routed") ran past its token's right edge; `.tokenHealth` wraps the status under the bar | e2e m9-war (`statusesInsideTheirTokens`) |

Decisions (defaults, nobody to ask):
1. Item 2's "Round 1 of 7 only on the result view": the result view has no current round, so the total reads "Result: 7 rounds were
   fought" (the deployment's old words, moved to the result). Objection: not the literal "Round 7 of 7" form.
2. Item 3: the brief's example ("militia count less when not entrenched") is not what `battleEstimate` computes: militia defend at
   full strength (and never attack, FR-267); cover raises a defender's strength by 1 / (1 - R). The line says that, as "counts 1.25
   times" (1.43 behind a level-1 fort), rather than "divided by 0.8". "Entrenched" is one legend under the defenders (as FR-265's
   Arms legend), not repeated on each row.
3. Item 4: "Attack" also goes back to the Army screen (its rows read "Attacking Arvelia", as when it lay underneath); a screen
   opened from the map closes to the map; once the Army screen is closed, its next open starts at the first entry.
4. Item 1: "matching the Attack screen's headings" read as the same style; its "Our regiments" kept.
5. Rewritten rows assert the replacing requirement (FR-277, FR-278, FR-280), not a looser one; three FR-279 rows and two FR-278 rows
   held before (named in their statuses).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red: unit, before the change | `npx vitest run` on the 3 files (`.gate/m9qa/red.txt`) | `Test Files 3 failed (3)`, `Tests 24 failed \| 45 passed (69)`; `expected 'Deployment: 4 rounds were fought' to be 'Deployment'`, `expected 'Round 1 of 4' to be 'Round 1'`, `expected [ …(2) ] to have a length of 1 but got 2`, `Unable to find an element by: [data-testid="estimate-explanation"]`, `expected 'News, turn 2 (1815)' to be 'News from last turn (turn 2, Summer 1…'` |
| Red: e2e, before the change | `PORT=3160 npx playwright test e2e/m9-war.spec.ts e2e/play-turns.spec.ts` (`.gate/m9qa/e2e-red.txt`) | `2 failed`, `1 passed`; m9-war `Expected: 1 Received: 2` (dialogs); play-turns `Received string: "News, turn 1 (1815)…` |
| Red: the token status | m9-war on the dev server before the wrap (`.gate/m9qa/e2e-red-status.txt`) | `+   "Routed",` `+   "Destroyed",` (4 outside); after the wrap `1 passed (12.2s)` |
| FR-276 to FR-280 | the 3 unit files and the army, store files after (`.gate/m9qa/run2.txt`) | `Test Files 5 passed (5)`, `Tests 111 passed (111)` |
| Unit tests | `npm test` (`.gate/m9qa/gate-test-final.txt`) | `Test Files 98 passed (98)`, `Tests 1885 passed (1885)` (+21 on 1864) |
| Baselines unchanged (FR-234) | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]`; FR-274 `[[1,21,22,305,0],[2,21,22,340,0],[3,21,22,276,0],[4,null,null,965,0]]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6); tsc exit 0, no output |
| Build | `npm run build` (`.gate/m9qa/gate-build-final.txt`) | `✓ Compiled successfully in 8.1s`, `✓ Generating static pages (4/4)` |
| e2e suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`.gate/m9qa/gate-e2e.txt`) | `36 passed (4.0m)`, `1 skipped` (the old skip; 37 tests) |

In the app: shots `docs/journal/m9-qa-fix-attack.png` (the Attack screen alone, both explanations, the news heading) and
`m9-qa-fix-battle.png` (the side headings, "Round 1", "10 damage"); checked as well (`.gate/m9qa/`, git-ignored): the deployment
("Deployment", the two forces), the result ("Result: 7 rounds were fought", "Destroyed" inside the tokens), the Army screen after
Cancel (three ticks, "Attack Arvelia", "Attack…"). Script `.gate/m9qa/shots.mjs`; no page errors.

### Review of the QA fix round (2026-11-13)

Size: S (three minor findings: a CSS comment, one line's words, one test row; all fixed, none carried). One fix agent (Opus 5.5,
xhigh, no subagents, no advisor call), started by the M9 workflow; not pushed. Evidence in `.gate/m9qarev/`.

| Finding | What changed | Test |
|---|---|---|
| F1 | `War.module.css` header: the Attack screen opens in place of the Army screen (FR-279), never over it; its 78 is only a guard | none (comment) |
| F2 | new FR-281: "an entrenched defender counts 1.25 times as strong" ("behind the fort a defender counts 1.43 times as strong") | ui/attackDialog (2 rows), e2e m9-war |
| F3 | FR-278's numbers row reads the factor from the line on the screen and sets it against `battleEstimate` (entrenched, damaged, fort) | ui/attackDialog |

Decision: new words are a changed requirement, so a new id (FLOW); FR-281 replaces only FR-278's cover part, the other FR-278 rows keep it.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the change | `npx vitest run tests/ui/attackDialog.test.tsx` (`red.txt`) | `Tests 3 failed \| 30 passed (33)`; F3's row `"explained": null` against `"engine"` 1.25, 1.25, 1.43 |
| F3's row catches drift | the same, `-t "FR-278"`, the engine's divisor 1 / (1 - R/2) for one run, then put back (`mutation-f3.txt`) | `Tests 1 failed \| 4 passed \| 28 skipped (33)`: `"engine": 1.11` against `"explained": 1.25` |
| Green | the attack, battle and army UI files (`green.txt`) | `Test Files 3 passed (3)`, `Tests 95 passed (95)` |
| Unit tests, baselines | `npm test` (`gate-test.txt`) | `Test Files 98 passed (98)`, `Tests 1885 passed (1885)` (a row rewritten, none added); FR-125, FR-260, FR-274 lines as above |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6); tsc exit 0, no output |
| Build | `npm run build` (`gate-build.txt`) | `✓ Compiled successfully in 20.1s`, `✓ Generating static pages (4/4)` |
| e2e suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`gate-e2e.txt`) | `36 passed (11.9m)`, `1 skipped` (the old skip; 37 tests) |

In the app: `docs/journal/m9-qa-fix-attack.png` taken again with the new words (script `.gate/m9qarev/shot-attack.mjs`): one dialog,
the dialog 760x371 at 1280x720, the page does not scroll, no page errors.
