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
- 2026-11-13 M5 on `claude/m5-world`: engine half (FR-144 to FR-152, FR-156 engine, FR-157 to FR-159) and UI half
  (FR-153 to FR-156, FR-160) tested; the app plays the continent. Next: the milestone review.

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
- M4.3 review finding 7: the transport popup's dialog uses `aria-label` where `aria-labelledby` (its
  visible title) fits; no `aria-modal`, no focus moved into it on open or back on close, and Escape
  does not close it. Accessibility pass in M5.
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

## 2026-11-13 M5 World and seams for v2, engine half (FR-144 to FR-152, FR-156 engine, FR-157 to FR-159)

Size: L (engine-wide: state shape, new world, turn context). One engine agent (Opus 5.5, xhigh, no subagents,
no advisor call), started by the M5 workflow; ultracode is the workflow's own setting. Branch `claude/m5-world`
(worktree `imperialism-game-revival-fee36d`) from main c378816. The UI agent builds FR-153 to FR-156 (UI) and
FR-160 next, against the API below.

Plan-lite:
- Change: `newGame` gets a `world` (registry `WORLDS`: "two-islands" stays the engine default, "continent" the
  store's); the continent's minor nations, provinces, diplomacy state and intents enter `GameState`; the old
  relation, treaty, policy, grant and `Nation.provinces` fields go; `ctx.rngFor(name)` for new systems.
- Consumers: the store (`startNewGame({ world })`), the UI agent (map borders, minor tiles, tile panel), M6 to
  M9 (diplomacy, trade, armies, war write into `diplomacy`, `intents`, `provinces` and draw from `rngFor`).
- Tests: FR-144 `engine/worlds.test.ts`, `store/gameStore.test.ts`; FR-145 `engine/continentWorld.test.ts`;
  FR-146, FR-149, FR-156 `engine/minorNations.test.ts`; FR-147, FR-148 `engine/provinces.test.ts` (+ the
  FR-042 rows of `engine/industry.test.ts`); FR-149 `engine/validate.test.ts`; FR-150 `engine/rngStreams.test.ts`
  and the scan in `engine/purity.test.ts`; FR-151 `engine/diplomacyState.test.ts`; FR-152
  `engine/intents.test.ts`; FR-157, FR-158 `engine/continentScore.test.ts`; FR-159 the eight v1 files, unchanged.
- Verify: the gate (`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`).
- Objection: the store now starts the continent while the screens still name a minor's tile "Unclaimed" and
  draw no province or minor border; until the UI half lands, the app shows the new land without its names
  (checked: the page renders on a continent game, 3 turns end, no error).

Red before green (all new tests written first, then run against main's code):
`npx vitest run` of the 12 M5 files gave `Test Files 10 failed | 2 passed (12)`, `Tests 18 failed | 200 passed
(218)`. Five files failed to load for the missing modules (`Cannot find module '@/engine/world/worlds'`,
`world/countries`, `world/provinces`, `diplomacy/relations`, `turn/intents`); rngStreams 7 of 8 failed
(`rngFor` and `fnv1a32` missing); continentWorld 2 failed (the minor land was sea); validate 6 FR-149 rows
failed (the targets were sea, so `invalid-target`, not `not-owner`); industry 1 (the 8-province row); the store
2 (the store built two-islands). The two passing files: the FR-150 scan in purity.test.ts (a guard: main
already read `ctx.rng` in the two systems only) and continentScore.test.ts (the world option was ignored, so
both "worlds" were two-islands; it compares only after the continent exists).

Decisions (defaults taken, nobody to ask):
1. The continent founds the Great Powers on the two-island map, then adds the minor land: `settleIsland`
   claims an island by flooding over land, and Arvelia would hand both islands and itself to nation 1.
   Objection: the continent's start depends on the two-island builder; a change there changes both worlds
   (intended: FR-145 asks the islands to be identical).
2. `GameState.worldId` is optional (absent on a hand-built test state); `minorNations`, `provinces`,
   `diplomacy` and `intents` are required, so the 21 hand-built test states (fixtures and system tests) got setup lines (empty lists, and
   `startDiplomacy` in the two-nation fixture); no assertion changed. Objection: none.
3. `ctx.rngFor(name)` seeds with the turn being resolved (`ctx.turn`), as FR-150 says; `ctx.rng` keeps its
   `turn + 1` from before M1. One stream per name and context, so a second call goes on. Objection: two
   conventions side by side; changing `ctx.rng` would move every v1 baseline.
4. `Intent.kind` is a string until M6 narrows it to its union; `addIntent` gives ids "intent-<turn>-<n>".
5. `transferProvince` moves ownership only (the province's `ownerId`, the tiles' `ownerNationId`); rail,
   civilians and jobs on the land are M9's. It throws on an unknown province or country.
6. `countryOfTile` answers the province owner first, then `ownerNationId` (two-islands has no provinces).
   `relationLevel` is undefined for two minors (no entry).
7. The FR-105 store test now calls `startNewGame({ seed: 12, world: "two-islands" })` (the FR-160 rule for a
   store test that pins the engine default), so its assertion is unchanged.
8. `migrantCap(state, nationId)` replaced `migrantCap(nation)`; the capital dialog's `labourView(state, nation)`
   and `CapitalModal` changed one line each to pass the state (UI files touched only for this signature).

Notes for the UI agent and M6 to M9 (seams found, nothing changed for them):
- On the continent 9-4, 14-4 and 14-5 are no longer next to the sea, so they stop being port sites (Arvelia's
  land is there). No player builds ports, and FR-158 shows nation 2 unchanged.
- `isDepotSite` treats any Capital tile as a gathering tile, a minor's capital included; in M5 no Great Power
  tile is next to a minor capital, so it does not matter until land changes hands (M9).
- The tile panel shows a minor tile as "Owner: Unclaimed" until FR-155.

Engine API for the UI half (all from `@/engine`): `WORLDS`, `DEFAULT_WORLD`, type `WorldId`; `countryName(state,
id)`, `isGreatPower`, `isMinorNation`, `minorNationById`, `countryOfTile(state, tile)`, `minorNationAt(state,
tile)`; `provinceOf(state, tileId)`, `provinceById`, `provincesOf(state, countryId)`, `adjacentProvinces`,
`transferProvince`; `pairKey`, `relationOf`, `relationLevel`, `RELATION_SWATCHES`; `intentOrder`,
`byIntentOrder`, `addIntent`; `RNG_STREAMS`; types `CountryId`, `MinorNation`, `Province`, `PairDiplomacy`,
`DiplomacyState`, `Intent`. Tiles carry `provinceId`; a minor's tiles have no `ownerNationId`; minor capitals
are Capital tiles with no `cityId`. Store: `startNewGame({ seed, turnLimit, world })`, `createGameStore({ world })`,
`APP_WORLD` = "continent".

| Claim | Command | Result (quoted) |
|---|---|---|
| Red run, 12 M5 files | `npx vitest run tests/engine/worlds.test.ts ... tests/store/gameStore.test.ts` (12 files) | `Test Files 10 failed \| 2 passed (12)`, `Tests 18 failed \| 200 passed (218)` |
| FR-144 to FR-152, FR-156 engine, FR-157, FR-158 | `npx vitest run` of the 12 files + `tests/store/computerNations.test.ts` | `Test Files 13 passed (13)`, `Tests 278 passed (278)` |
| FR-157 | same run, console | `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]` (the two-islands FR-125 numbers) |
| FR-159 v1 baselines | `npx vitest run tests/engine/scriptedScore.test.ts tests/engine/twoNations.test.ts tests/engine/startWorld.test.ts tests/engine/newGame.test.ts tests/engine/secondNation.test.ts tests/engine/determinism.test.ts tests/engine/railSections.test.ts tests/engine/scriptedRail.test.ts` | `Test Files 8 passed (8)`, `Tests 125 passed (125)`; `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` as in M4.4 |
| FR-159 files unchanged | `git diff --stat c378816 HEAD -- <the eight files> tests/engine/m4ScriptedPlayer.ts` | no output |
| Unit tests | `npm test` | `Test Files 66 passed (66)`, `Tests 932 passed (932)` (+87 on 845) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3 as on main) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 9.1s`, `✓ Generating static pages (4/4)` |
| Engine commit alone | store files at main, then `npx tsc --noEmit` and `npm test` | exit 0; `Test Files 66 passed (66)`, `Tests 929 passed (929)` |

Not run here: the Playwright smoke suite (not in this agent's gate). e2e specs that pin two-island facts of the
app's default game (for example `e2e/islands.spec.ts`) are FR-160's, with the UI half.

How to see it in the app: `npm run dev`; a new game is the continent: land in the channel between the islands
(Arvelia in the north joins them, three small islands elsewhere). The minors' names, province borders and the
tile panel text come with the UI half.

## 2026-11-13 M5 World and seams for v2, UI half (FR-153 to FR-156, FR-160)

Size: M (map overlay, tile names, tile panel, click policy; e2e on the new default). One UI agent (Opus 5.5, xhigh,
no subagents, no advisor call), started by the M5 workflow after the engine half; same branch and worktree.

Plan-lite:
- Change: MapView draws dotted province lines, the Great Power borders and dashed minor borders
  (`territoryBorders.ts`); a minor capital shows the minor's name (`Tile/TileName.tsx`); tile names, the click and
  the tile panel ask `countryOfTile`, so a minor's tile is "owned by Arvelia", only viewed, and the panel shows
  "Arvelia (minor nation)" and the province; two tokens `--color-minor`, `--color-province-border`.
- Consumers: the player on the continent default; M6 to M9 (the Diplomacy screen and armies reuse the minor
  colour, the province lines and the `countryOfTile` click rule).
- Tests: FR-153 `ui/provinceMap.test.tsx`; FR-154 `ui/palette.test.ts`; FR-155 `ui/accessibleNames.test.tsx`,
  `ui/minorTiles.test.tsx`; FR-156 `ui/watchNation.test.tsx`; FR-160 `store/computerNations.test.ts` (flag reset
  guard), `e2e/m5-world.spec.ts` and three e2e specs moved to the continent.
- Verify: the gate and `PORT=3160 npx playwright test --workers=1 --reporter=line`.
- Objection: the minor border lies on the same line as a Great Power's where Arvelia meets it, so that edge shows
  slate dashes over the nation colour rather than two separate lines (accepted: it reads as a shared border).

Red before green: the five new or extended UI files and the store file before any source change gave
`Test Files 4 failed | 2 passed (6)`, `Tests 10 failed | 55 passed (65)`: `provinceBorderSegments is not a function`
(provinceMap), `undefined --color-minor` (palette, 4), `'Hardwood forest, timber, level 1, not owned'`
(accessibleNames), `'Owner: Unclaimed'` for Arvelia and Sundmark, the engineer's click on minor land sending
`moveWorker` orders, no `tile-province` (minorTiles, 5). The FR-156 UI rows and the FR-160 flag guard passed at
once (guards: the HUD and the game-over screen already iterate `state.nations` only). The three e2e specs as on
main, run on the continent: `3 failed`, `1 skipped`, `8 passed (48.7s)`: capitals `Expected: 2 Received: 6`
(islands), land tiles `Expected: 200 Received: 226` (look), prospect cursor `Received string: "auto"` (cursor-icons:
the first barren hills in page order is now Lorran's 13-1).

Decisions (defaults taken, nobody to ask):
1. Colours (FR-154, searched over the RGB cube against the test's own formulas): `--color-minor` #788098, a neutral
   slate: dE 30.9 or more from both nation colours and "bad", 22.8 or more under deuteranopia and protanopia, 2.7:1
   on the land. A warm ochre failed against "bad" under deuteranopia (7); every colour with more margin is near
   black or a loud blue. `--color-province-border` #7a6e5e (warm grey): 3.45:1 or more on every land tint.
   Objection: a slate border is quieter than the nation borders; the dashes and the name tags carry the minor.
2. Line shapes: Great Power solid 2 px; province dots (`stroke-dasharray: 0 4`, round caps); minor dashes (`5 3`).
   Drawing order: province lines, Great Power borders, minor borders, rail. One province path per owner of several
   provinces (2 on a new game), one minor path per minor (4).
3. The minor's name is a small tag at the bottom of its capital tile, the capital icon moved up as when civilians
   stand there; `aria-hidden`, since the tile's name already says "Capital, owned by Arvelia".
4. A click on any tile of another country (`countryOfTile`, a minor's included) only selects it, so a civilian
   order onto minor land is never built and no refusal reaches the news (FR-149 by the click, FR-155).
5. The panel: "Owner: Arvelia (minor nation)", "Province: …" (only when the tile has one), the note "Arvelia is a
   minor nation: you can watch its land, not give orders here."; a Great Power's tile keeps its owner line.
6. FR-160: no UI test built its game from the store default (all use `newGame({ seed })`, the engine default
   two-islands), so none needed a `world` line. The e2e specs that pinned two-island facts of the app's game now
   pin the continent, with the same tile ids: `islands.spec.ts` counts 6 capitals and names all six,
   `look.spec.ts` 226 land tiles with an icon each, `cursor-icons.spec.ts` hovers the player's 5-2 by id. The new
   spec is `e2e/m5-world.spec.ts`, the name FR-160 gives (the workflow brief said `e2e/m5.spec.ts`).
   Objection: changing an assertion of an existing spec; each change follows the world, none loosens a check.
7. `docs/journal.md` kept under 400 lines by archiving the merged M4.4 entry to `docs/journal/archive-M4.4.md`.

Screenshot `docs/journal/m5-world.png` (1280x720, new game, seed random), looked at: the four name tags (Lorran,
Arvelia, Sundmark, Pellis) on their capitals, dashed slate outlines around each minor, dotted lines splitting each
island into 4 provinces, the nation borders unchanged; with Arvelia's forest selected the panel reads "Owner:
Arvelia (minor nation)", "Province: Arvelia" and offers no button.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red run | `npx vitest run tests/ui/provinceMap.test.tsx tests/ui/palette.test.ts tests/ui/accessibleNames.test.tsx tests/ui/minorTiles.test.tsx tests/ui/watchNation.test.tsx tests/store/computerNations.test.ts` | `Test Files 4 failed \| 2 passed (6)`, `Tests 10 failed \| 55 passed (65)` |
| FR-153 to FR-156, FR-160 | the same files and `tests/ui/territory.test.tsx` | `Test Files 7 passed (7)`, `Tests 80 passed (80)` |
| e2e, old specs on the continent | the three specs as on main, `PORT=3160 npx playwright test ... --workers=1 --reporter=line` | `3 failed`, `1 skipped`, `8 passed (48.7s)` |
| e2e smoke | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `1 skipped`, `22 passed (1.3m)` (the skip is the old `test.fixme` rail cursor) |
| Unit tests | `npm test` | `Test Files 68 passed (68)`, `Tests 956 passed (956)` (+24 on 932); 0 "not wrapped in act" |
| FR-159 untouched | `git diff --stat c378816 HEAD -- <the eight v1 files> tests/engine/m4ScriptedPlayer.ts`, `git diff --stat -- src/app/engine tests/engine` | no output (the UI half changes no engine file and no v1 baseline) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3 as on main) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 4.4s`, `✓ Generating static pages (4/4)` |

How to see it in the app: `npm run dev`; a new game shows Lorran, Arvelia, Sundmark and Pellis named on the map,
each outlined in slate dashes, and dotted lines splitting each island into four provinces. Click the farm next to
the capital: "Province: Testland South-West". Pick the engineer and click Arvelia's land: the tile is only viewed
("Owner: Arvelia (minor nation)", no button, no refusal in the news).
