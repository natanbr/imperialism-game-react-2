# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0 to M3 are merged into `main` (PR 9, 10, 12, 13, 14); their entries are archived in
  `docs/journal/archive-M1.md`, `-M2.md`, `-M3.md`. Not built from M3: Q15 (c) "repeat last turn's trades".
- M3.5 on `claude/m3-5-look-and-map` (pushed, no PR): rail line fix (FR-079) and part A, the two-island
  start world (FR-080 to FR-083, NR-007): a 24x16 map, the player on island 1, island 2 unclaimed for
  M4, the camera opens on the capital. Next: part B (NR-008, NR-009: faint tiles, icons, palette) once
  Nathan picks an icon set; the whole map fits 1280x720 only with tiles of 42 px or less.
- Open decisions: Q9 (freight-car timing, from M2) and Q10 to Q15 (M3, in `archive-M3.md`), each on
  its default. Q16 settled by the orchestrator: no coast tiles on the new map.

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- M4: settle nation-2 with `settleIsland(map, "nation-2", "capital-2", CAPITAL_SITES[1])`; an order
  log in the store (replay); the second nation trades on the same world market.
- UI: the selected tile and owned tiles are both drawn red.

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

## 2026-11-03 M3.5 rail line fix (FR-079, NR-010)

Size: M (fix in the map's rail overlay plus one engine query). One agent (Opus 5.5), unattended, no
subagents, no advisor calls. Branch `claude/m3-5-look-and-map` from 607d3dc. Ultracode was not on.

Bug (Nathan's screenshot): rail from the capital 20-20 west through farm, orchard, scrub forest, farm,
fertile hills, the coast tile 14-20 and the open range 13-20 (depot) stopped on the map at 15-20, yet
the depot was green. Root cause: `components/railSegments.ts` line 15 rebuilt the line from tile flags
with its own land test (`not Water, Coast or River`), while the engine counts coast as land: workers
stand on it (`queries.ts` `isLand`), `claimLand` owns it, `canBuildRailAt` accepts rail there and
`addRailroad` links it into the graph. So the rail on 14-20 existed, the graph lit the depot correctly,
and only the drawing dropped the coast tile's two links: two copies of "which tiles carry rail" had
drifted apart. The filter predates the revival (`2d1917a`); no earlier rail-drawing bug is recorded, so
not a recurrence. Candidates checked: (a) refusal: no, the order was accepted; (c) another graph for
the lights: no, the lights read the graph that holds the coast node; (d) the triangle 12-19, 12-20,
13-20: three mutual neighbours with rail (odd row 19 is shifted right), and the engine joins every pair
of neighbouring rail tiles, so it is right under the current model.

Plan-lite: change: the overlay draws `railLinksOf(state)` (new, `systems/railroadSystem.ts`, exported
from `engine/index.ts`: every link of every nation's graph once) and `computeRailSegmentsPixels(links)`
only turns links into pixels; consumer: `MapView` (memoized on `transportNetwork`); tests: FR-079 in
`tests/ui/railLine.test.tsx` (the screenshot's line played through the order API on the 40x40 map,
`MapView` rendered, its lines read back as tile pairs: no gap from the capital to the depot, the coast
included; the green depot reachable along drawn lines; drawn lines = graph links; every line joins
neighbours, the triangle included; a depot the rail does not reach is red with no line to it) and
`tests/engine/railLinks.test.ts`; verify: `npx vitest run tests/ui/railLine.test.tsx`; Objection: below.

Red summary (test written first, run before the fix): `npx vitest run tests/ui/railLine.test.tsx` gave
`Test Files 1 failed (1)` / `Tests 3 failed | 3 passed (6)`: `expected [ '14-20 15-20', '13-20 14-20' ]
to deeply equal []` (the coast tile's two links not drawn), `expected false to be true` (the green depot
not reachable along drawn lines) and `expected [ '12-19 12-20', '12-19 13-20', …(6) ] to deeply equal
[ '12-19 12-20', '12-19 13-20', …(8) ]` (8 lines drawn, 10 graph links). "The engine accepts rail on the
coast tile and lights the depot green" passed: the engine side was right.

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-079 covered | `npx vitest run tests/ui/railLine.test.tsx tests/engine/railLinks.test.ts` | `Test Files 2 passed (2)` / `Tests 9 passed (9)` |
| All unit tests | `npx vitest run` | `Test Files 38 passed (38)` / `Tests 597 passed (597)` (+9) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same three as M3) |
| Build | `npm run build` | `✓ Compiled successfully in 5.3s`, `✓ Generating static pages (4/4)` |
| Smoke, default workers | `PORT=3157 npx playwright test --reporter=list` | `6 failed` / `1 skipped` / `4 passed (1.9m)`: all six `page.goto: Test timeout of 30000ms exceeded` in `cursor-icons.spec.ts` (cold server, as in M3) |
| Smoke, warm server, 1 worker | `npm run dev -- --port 3157`, then `PORT=3157 PW_REUSE_SERVER=1 npx playwright test <file> --workers=1` | `cursor-icons.spec.ts`: `1 skipped` / `6 passed (1.0m)`; `play-turns.spec.ts` + `market-and-game-over.spec.ts`: `4 passed (1.5m)` |
| App check | a throwaway Playwright script (deleted, not committed): engineer builds rail 19-20 to 13-20 through the coast, then a depot on 13-20 | `1 passed (38.2s)`, 7 lines drawn (13-20 to 20-20), depot 🟢; `docs/journal/m3-5-rail-line.png` |

Decisions taken alone:
- Objection: coast tiles stay land (workers and rail allowed), as the engine had them; only the drawing
  changed. Rules 02 call the sea "not a land tile" and give fish from "coast / sea next to a port", so in
  the original a coast tile would be sea; but the 40x40 map puts single coast tiles inland (pattern
  `(7x + 13y) % 12 == 10`), where sea makes no sense. Decision Q16 below.
- Objection: the overlay now also draws a link between two neighbouring stations without rail (the
  capital next to a port, a port built next to a depot), because the graph links them and they count
  for the lights; the old overlay hid them. Rare: a depot may not be built next to the capital, a port
  or another depot.

**Q16** 🧠 **Should coast tiles be land or sea?**
- Found: the engine treats coast as land (workers, ownership, rail, depots), the port rule as sea
  (`isAdjacentToOcean`), rules 02 as sea; the old drawing treated it as sea, which caused this bug.
- Options: (a) land, as now: rail crosses coast. (b) Sea from M3.5's two-island map (NR-007): no workers
  or rail on coast (the move and rail orders refuse it as a non-land target), fish for ports (NR-008).
- 💡 (b) with the new map, where coast lies only along the shore; (a) until then.

## 2026-11-03 M3.5 part A: two-island start world (FR-080 to FR-083, NR-007)

Size: L (milestone part: the start state every game and e2e spec reads). Unattended, one agent (Opus
5.5), no subagents, no advisor calls; the map, the camera and the specs that click tiles were too
coupled to split. Branch `claude/m3-5-look-and-map` from 182b5ee; `npm ci` clean. Ultracode was not on.
Baseline `npx vitest run`: `Tests 1 failed | 596 passed (597)`: the FR-079 red-depot test `Test timed
out in 5000ms` (rendering the 40x40 map in jsdom on a loaded machine; 5.8 s); it passes on the new map.

**Q16 applied** (decided by the orchestrator): the new map places no coast tiles; the shore is the land
next to the sea, ports go there, and there is no river. `TerrainType.Coast` and `River` stay in the
code for the 5x5 test worlds and the port rule (`isAdjacentToOcean` still reads both).

The map (`engine/world/twoIslands.ts`, one character per tile type; odd rows are drawn half a tile
right; island 2 is island 1 shifted 12 columns; `@` is the capital, a farm on island 2 until settled):

```
   x   0         1         2
       012345678901234567890123
 y  0  ~~~~~~~~~~~~~~~~~~~~~~~~    ~ sea          F farm (grain)       O orchard (fruit)
    1  ~~~TTTTT~~~~~~~TTTTT~~~~    R open range   P plantation         T hardwood forest
    2  ~~~RTHHTT~~~~~~RTHHTT~~~    H barren hills (hidden coal or iron ore)
    3  ~~RRTHHTHT~~~~RRTHHTHT~~    @ capital site
    4  ~~RRRHHRHT~~~~RRRHHRHT~~
    5  ~~FRRRHRRT~~~~FRRRHRRT~~    island 1: 100 land tiles: F 20 (+ @), O 11, R 25, P 10, T 24,
    6  ~~FFRRRRRT~~~~FFRRRRRT~~      H 9 (coal on 5-2, 6-3, 5-4, 8-4, 6-5; iron ore on 6-2, 5-3, 8-3, 6-4)
    7  ~~FOFRRORRT~~~FOFRRORRT~    capital 2-9 (west shore); its neighbours: sea 1-9, farms 2-8 and
    8  ~~FOFFOFRRT~~~FOFFOFRRT~      3-9, orchards 3-8 and 2-10, plantation 3-10, all level 1
    9  ~~@FOFFORRT~~~@FOFFORRT~    island 2: the same, unowned; capital site 14-9
   10  ~~OPFOFFPPT~~~OPFOFFPPT~    sea columns 11 to 13 between the islands
   11  ~~FOPFOFPPP~~~FOPFOFPPP~
   12  ~~~FOPFPPT~~~~~FOPFPPT~~
   13  ~~~~TTTTT~~~~~~~TTTTT~~~
   14  ~~~~~~~~~~~~~~~~~~~~~~~~
   15  ~~~~~~~~~~~~~~~~~~~~~~~~
```

Plan-lite:
- Change: `twoIslandsMap()` (fixed text template, the same for every seed) replaces the 40x40
  `defaultMap.ts` (removed); `settleIsland(map, nationId, cityId, site)` puts a capital on a site,
  raises its farm, orchard and plantation neighbours to level 1 and gives the nation the island (the
  land joined to the site); `startWorld()` settles island 1 only. UI: the camera becomes the map
  container's scroll position (`components/camera.ts`), so it stays inside the map; the first view and
  the Center button centre the capital.
- Consumers: `newGame` (store, every e2e spec), M4 (`settleIsland` on `CAPITAL_SITES[1]`).
- Test rows: below. Verify: `npx vitest run tests/engine/startWorld.test.ts tests/ui/camera.test.tsx`,
  then the full gate and Playwright.
- Objection: the map does not vary with the seed. A seeded generator would give replay value, but the
  e2e specs, the rail-line test and M4's second capital need fixed coordinates; a generator can come
  later behind the same `startWorld()`.

| FR | Test file | What the test asserts |
|---|---|---|
| FR-080 | `tests/engine/startWorld.test.ts`, `newGame.test.ts`, `lintGuard.test.ts`, `e2e/islands.spec.ts` | 24x16, ids match positions; land found by neighbour steps forms exactly 2 islands that do not touch; sea border; island 1 west of column 12; each island has exactly the six types with their resources; no other terrain and no river anywhere; hills hide coal and iron ore (both on each island); levels 0 except next to the capital; island 2 = island 1 shifted 12 (terrain and resource); the same map for seeds 1 and 123456; no engine file imports `@/testing`; in the app 384 tiles, 1 capital, 0 coast, 0 river, the whole map in view on 2720x1620 |
| FR-081 | `tests/engine/startWorld.test.ts`, `newGame.test.ts` | the start nation's numbers (unchanged); capital at `CAPITAL_SITES[0]` on a shore tile of island 1 with the 7 civilians, no worker elsewhere; nation-1 owns all of island 1 and nothing else; capital neighbours = sea + 2 farms + 2 orchards + plantation at level 1; the capital ships `{ grain: 4, fruit: 4, cotton: 2 }` (as on the 40x40 map); a canned-food order is accepted and turn 1 gives `workers-fed` 7/0/0, `goods-produced` 2 canned food, 12 in the warehouse |
| FR-082 | `tests/engine/startWorld.test.ts` | island 2 has no owner, city or worker; `CAPITAL_SITES[1]` = site 1 + 12 columns, a flat shore tile of island 2; `settleIsland` for nation-2 there on a frozen copy makes island 2 a tile-for-tile twin of island 1 (terrain, resource and level, owner, capital) and leaves island 1 deep-equal |
| FR-083 | `tests/ui/camera.test.tsx`, `e2e/islands.spec.ts` | map 2,450 x 1,600 px; map area = window minus the 250 px HUD; a middle tile is centred (even and odd rows); near an edge the camera stops at it (capital 2-9 gives 0, 590 on 1280x720; the far corner gives 1420, 880); MapView's first view and the Center button set 0, 590; the map moves by scrolling, no transform; in the app the capital is centred (±60 px), the map's left edge stays at the screen edge, also after edge scrolling left; scrolled to the far corner the last tile ends at the HUD and the screen bottom; Center brings the capital back |

Red summary (tests written and run before the code): `npx vitest run tests/engine/startWorld.test.ts
tests/engine/newGame.test.ts tests/store/gameStore.test.ts tests/ui/railLine.test.tsx
tests/ui/camera.test.tsx tests/engine/lintGuard.test.ts` gave `Test Files 5 failed | 1 passed (6)` /
`Tests 17 failed | 46 passed | 5 skipped (68)`: `expected { cols: 40, rows: 40, style: 'square' } to match
object { cols: 24, rows: 16 }`, `expected [ [ …(1444) ] ] to have a length of 2 but got 1`, `expected [
'barrenHills', 'coast', …(13) ] to deeply equal [ 'barrenHills', 'farm', …(4) ]`, `Cannot read properties
of undefined (reading '0')` (no `CAPITAL_SITES`), `Failed to resolve import "@/components/camera"`, and
the rail-line setup `expected 'dryPlains' to be 'capital'` (its 5 tests skipped). The two FR-081 economy
rows passed on the old map too: they guard what the new map must keep.

Tests changed because of the new map:
- `tests/ui/railLine.test.tsx` (FR-079): same intent, new tiles: rail from the capital 2-9 north along
  the west shore 2-8, 2-7, 2-6, 2-5, 2-4, 2-3 to a depot on 3-2, every one a shore tile (asserted), and
  the spur 4-2, 3-1 (the triangle 3-1, 3-2, 4-2); the red case stops the rail at 2-4 and walks over 2-3.
  The two slow tests got a 30 s timeout (they replay about 25 turns; one timed out at 5 s on the old map).
- `tests/engine/newGame.test.ts`: FR-043 titles now FR-080/FR-081, 24x16; the FR-059 rail-terrain row
  swaps a hills tile's terrain to swamp and mountains (the new map has neither; the rule reads only the
  terrain and the technologies). `lintGuard.test.ts`: title FR-080. `tests/store/gameStore.test.ts`: 24x16.
- `e2e/play-turns.spec.ts`: the farmer develops 3-9, the engineer lays rail on 2-8, the prospector finds
  coal on 5-2 (was 21-20, 19-20 and oil on 21-18). `market-and-game-over.spec.ts`: waits for 2-9.
  `cursor-icons.spec.ts`: the prospect cursor hovers barren hills (no mountains or swamp left). All specs
  now wait until the capital is in view: the first view scrolls once the page is live, and the
  construction-cursor test failed twice before the wait (its click landed on the tile, not the engineer).

### Evidence

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-080 to FR-082 covered (engine) | `npx vitest run tests/engine/startWorld.test.ts tests/engine/newGame.test.ts tests/store/gameStore.test.ts tests/ui/railLine.test.tsx tests/engine/lintGuard.test.ts` | `Test Files 5 passed (5)` / `Tests 68 passed (68)` |
| FR-083 covered (unit) | `npx vitest run tests/ui/camera.test.tsx tests/ui/railLine.test.tsx tests/store` | `Test Files 4 passed (4)` / `Tests 36 passed (36)` |
| All unit tests | `npx vitest run` | `Test Files 40 passed (40)` / `Tests 620 passed (620)` (+23); `railLine.test.tsx (6 tests) 3399ms` |
| Types | `npx tsc --noEmit` (also after the last e2e edit) | exit 0, no output |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same three as M3) |
| Build | `npm run build` | `✓ Compiled successfully in 6.3s`, `✓ Generating static pages (4/4)` |
| Smoke, first run | dev server on 3163 warmed with curl, `PORT=3163 PW_REUSE_SERVER=1 npx playwright test --reporter=list` | `2 failed` / `1 skipped` / `11 passed (1.2m)`: my islands spec measured the odd row 0-9 (`Received: 52`, shifted 50 px; now 0-8) and the construction-cursor test above |
| Smoke, warm server, default workers | the same after the fixes | `1 skipped` / `13 passed (31.7s)` |
| Smoke, as the brief says | `PORT=3165 npx playwright test --reporter=list` (Playwright starts a cold server, default workers) | `1 skipped` / `13 passed (35.6s)`; the skip is the old `test.fixme` rail cursor |
| Screenshot | `PORT=3163 PW_REUSE_SERVER=1 SCREENSHOT_DIR=docs/journal npx playwright test e2e/islands.spec.ts -g "whole map"` | `1 passed (6.4s)`; `docs/journal/m3-5-islands.png` (2720x1620, 98 KB, the whole map) |

### Decisions taken alone, each open to review

- Objection: the map is the same for every seed (see plan-lite). "Deterministic from the seed" holds
  trivially.
- Objection: 24x16 at 100 px tiles is 2,450 x 1,600 px; on 1280x720 next to the 250 px HUD the map area
  is 1,030 x 720, so the whole map needs tiles of 42 px or less (24.5 tile widths across with the
  odd-row shift, 16 down). Tiles were not resized (part B restyles them).
- Objection: the capital's plantation neighbour starts at level 1 too, not only farms and orchards (rules
  02); the 40x40 capital had it, so the start economy is unchanged (4 grain, 4 fruit, 2 cotton a turn).
  The start score is 240, not 250: the old map also had an iron-ore hill at level 1 that was not next to
  the capital (counted for development, never shipped).
- Objection: the camera is now the container's scroll position instead of a CSS transform. With a
  transform, a camera centred on the capital put the tiles above and left of it out of reach of
  Playwright's scroll-into-view (negative overflow), and edge scrolling ran off the map. The store's
  `cameraX`/`cameraY` mirror the scroll; `moveCamera` was removed (nothing else used it). The Center
  button now centres the capital (it used to put the map's centre at the top-left corner).
- Objection: the capital is on island 1's west shore (it faces the map's west edge, not island 2); the
  islands are 100 tiles each, forest and hills in the north, open range in the middle, farms, orchards
  and plantations in the south, a forest strip on the east shore. Rows 14 and 15 are both sea, so the
  islands sit one row above the middle (a shift by one row would change the hex neighbours).
- The M3 entries moved to `docs/journal/archive-M3.md` (the journal would have passed 400 lines).
