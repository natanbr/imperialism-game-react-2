# Journal archive: M5 World and seams for v2

Moved from `docs/journal.md` on 2026-11-13 at the start of M6 (FLOW: the journal stays under 400 lines; a
milestone's entries are archived when it ends; M5 was merged as PR 23, main 0bfd870). The entries are unchanged.

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

## 2026-11-13 M5 World and seams for v2, review fix round

Size: M (one fix round on the milestone review: 1 major, 18 minor findings). One fix agent (Opus 5.5, xhigh, no
subagents, no advisor call), started by the M5 workflow; same branch and worktree. The M5 rows were amended in place
(not merged yet, so no new ids). A behaviour fix has a test that failed on the code before it; a test-strength fix
shows its new check failing on a mutant the old check let through.

| Finding | What changed | Test |
|---|---|---|
| F1 (major) FR-157/158 never checked the world played | each game's final state must be on the world it names (worldId, 4 minors, 12 provinces; two-islands 0, 0) | continentScore.test.ts, rows "played on the continent", "each pair compares" |
| F2 turn-40 scores "as on two-islands" not asserted | FR-157 also plays the current player on two-islands and asserts the same turn-40 score per seed | continentScore.test.ts |
| R3 FR-158 compared nation 2 only | both nations every turn, and a second run with both nations played by the frozen M4 player | continentScore.test.ts, 4 new seed rows |
| E3 no world invariant over 40 turns | `worldViolations(state, start)` in fixtures.ts (tile and province name each other, owner = province's Great Power or none, minors, provinces and minor tiles as at the start, same diplomacy pairs, no intent left), after every turn of every FR-157/158 game; a self-check row sees 4 kinds of breakage | continentScore.test.ts |
| R2, E4 FR-150 scan only knew `ctx.rng` | any receiver (`.rng`), `['rng']`, `rng` in any destructuring incl. parameters; `turn/context.ts` allowed (it builds the stream); 9 read and 6 non-read samples | purity.test.ts |
| R4 owner-write scan missed `{ ...tile, ownerNationId }` | shorthand in an object literal counts as a write, a destructuring pattern does not; 6 write and 6 read samples | provinces.test.ts |
| E1 a taken minor capital became the new owner's "capital" | `isGreatPowerCapital(state, tile)` (queries.ts): Capital terrain that is not a minor's capital; used by the depot rule and the scripted player's hubs and reach (railPlan.ts) | provinces.test.ts "not its capital" |
| R5 a neighbour's capital, depot or port blocked a depot | `isDepotSite` counts a neighbour only when it has the tile's owner | provinces.test.ts "blocked only by its own country's" |
| E2 colony relation had two homes | `Nation.colonies` removed (read nowhere); `MinorNation.colonyOf` is the one home | minorNations.test.ts |
| F3 store reset guard found flags by the name `is...` | every store key but `game` and the camera (kept on purpose) set to another value, then must be initial again | computerNations.test.ts |
| F4 no contrast floor for `--color-minor` (2.7:1) | 3:1 floor on every tint and the sea; `--color-minor` #788098 -> #5e7c90 (searched with the test's formulas) | palette.test.ts |
| R6 name tag wider than its tile, unchecked | documented in FR-153; e2e: centred, inside the tile's height, at most 2 tiles wide, on top at both ends | e2e/m5-world.spec.ts |
| R1 the continent tilts toward nation 1 | not changed (FR-145 pins the tiles; a game-design call): the tilt is stated in FR-145 and pinned by a test (capital steps 2/3, 3/4, 2/2, 3/3; shore 35 and 34) | continentWorld.test.ts |
| F5 plan said 2 bridges, 2 islands | REVIVAL_PLAN.md 5b "The v2 world": one bridge, three islands, Q22 option b | docs |
| F6 FR-152 read as complete | status: helpers and the drop tested; order and phase wiring in M6 | docs |
| F7, R7 behaviour with no row text | FR-144 names `createGameStore({ world })`; FR-148 the throw, FR-150 the throw, FR-155 the note sentence | docs |

Decisions (defaults taken, nobody to ask):
1. E1: minor capitals keep the Capital terrain (FR-145 pins it, the map icon and tile name use it). Only the rules
   that mean "this nation's own capital" changed. Objection: `isRailNode`, `hasRailStartingPoint` and `fortLevelOf`
   still read the terrain, so a taken minor capital is a rail start and has a fort for its new owner; FR-222/FR-224
   decide that in M9 (carried).
2. F4: a darker slate over an exemption, so a later colour edit cannot pass below 3:1. Objection: the margins are
   thin (3.06:1, ΔE 31.3, 20.5 under colour blindness); every colour with more margin is near black or a loud blue.
   `docs/journal/m5-world.png` still shows the old slate; the app check retakes it.
3. R1: the tiles stay; the tilt goes to card Q22 for Nathan (the card is not in `docs/report/roadmap.json` yet; add it
   at the checkpoint): accept it, or make Lorran 3 tiles (`11-1` to `13-1`, capital `12-1`) under a new FR id.

Carried: the rest of E1 (decision 1, FR-222/FR-224 in M9) and the R1 card (decision 3).

Found: with both nations played by the frozen M4 player, seeds 1 to 4 give the same per-turn values on both worlds,
so nation 1's land next to Arvelia (9-4 no longer a port site) changes nothing an M4 player does.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red, behaviour fixes E1, R5, E2 | the 6 source files at HEAD, `npx vitest run tests/engine/provinces.test.ts tests/engine/minorNations.test.ts` | `Tests 3 failed \| 26 passed (29)` (the 3 new rows) |
| Red, F4 | `npx vitest run tests/ui/palette.test.ts` with #788098 | `Tests 1 failed \| 17 passed (18)`: 7 backgrounds below 3:1, mountains 2.73 |
| F1 guard bites | `newGame` patched to ignore `world`, `npx vitest run tests/engine/continentScore.test.ts` | `Tests 3 failed \| 16 passed (19)` (the M5 file before the fix passed on such a mutant) |
| F3 guard bites | `startNewGame` without `hoveredTileId: undefined`, new and old store files | `Tests 1 failed \| 23 passed (24)`: the new guard fails, the old file's 12 pass |
| R2, E4, R4 guards bite | the old regexes on the new samples (node) | rng: 2 of 9 reads seen; owner: 3 of 6 writes seen |
| R6 guard bites | `.minorName { z-index: -1 }`, `PORT=3160 npx playwright test e2e/m5-world.spec.ts` | `1 failed` at `onTop` |
| Fixed | `npx vitest run tests/engine/continentScore.test.ts` | `Tests 19 passed (19)`; `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]` |
| FR-159 v1 baselines | `git diff --stat c378816 -- <the eight v1 files> tests/engine/m4ScriptedPlayer.ts`; `npm test` console | no output; `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` as before |
| Unit tests | `npm test` | `Test Files 68 passed (68)`, `Tests 971 passed (971)` (+15 on 956); 0 "not wrapped in act" |
| Lint | `npm run lint`; `npx eslint . --ignore-pattern ".gate/**"` | `✖ 4 problems (0 errors, 4 warnings)`: the 3 of main plus `.gate/dist.js` (the reviewer's untracked scratch file); without `.gate`: `✖ 3 problems (0 errors, 3 warnings)` |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 3.0s`, `✓ Generating static pages (4/4)` |
| e2e smoke | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `1 skipped`, `22 passed (1.2m)` |

How to see it in the app: `npm run dev`; the minors' dashed borders and name-tag frames are a slightly darker
blue-grey slate; nothing else changes on a new game (the E1 and R5 rules only matter once land changes hands, M9).

## 2026-11-13 M5 World and seams for v2, QA fix round (FR-235)

Size: S (four HUD fixes from Nathan's QA screenshots). One agent (Opus 5.5, xhigh, no subagents, no advisor call).
1. Scroll: the height chain was sound (`.hud-content`: flex child, `min-height: 0`, `overflow-y: auto`; 497 px tall, 572 px
   of content with Arvelia selected; the wheel scrolls it 0 to 75 px). The QA shots showed no scrollbar because Playwright
   starts Chromium with `--hide-scrollbars`; without that flag the old panel drew Chromium's default 15 px grey one. Missing
   was a scrollbar of the panel's own that overlay-scrollbar systems (macOS, touch) also draw. Fix: `::-webkit-scrollbar`
   8 px in tokens (Chromium, Safari), `scrollbar-width`/`-color` for Firefox only (trap: Chromium drops the WebKit rules once
   those are set), `scrollbar-gutter: stable`. 2. A sticky `::after` fades the content into the surface over the last 24 px
   (12 px opaque, clicks pass through); at the end it sits below the Debug box. 3. No Province line on a minor's tile.
   4. "Map legend" in About, samples drawn with the map's `MapView.module.css` classes and tokens.
Not verified: Firefox and WebKit (no Playwright build installed; the `@supports` block is in the built CSS); overlay
scrollbars (Chromium's OverlayScrollbar flag changes nothing headless). Screenshot `docs/journal/m5-qa-minor-tile.png`
retaken with scrollbars drawn (`.gate/qa-fix-shot.mjs`, not committed): no Province line, thin scrollbar, Debug box fading.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red, items 3 and 4 | `npx vitest run tests/ui/about.test.tsx tests/ui/minorTiles.test.tsx` before the source change | `Tests 5 failed \| 7 passed (12)`: no list "Map legend"; `minorWithProvince: [ …(26) ]` |
| Red, items 1 and 2 | `PORT=3160 PW_REUSE_SERVER=1 npx playwright test e2e/m5-hud-scroll.spec.ts` on the old globals.css | `2 failed`: `"thin": false, "thumbPainted": false, "trackPainted": false`; `"notSurface": 84` |
| Green, items 1 to 4 | the same three files and `e2e/m5-world.spec.ts` (now no Province line on 10-3) | `Tests 30 passed (30)` (with palette.test.ts); `2 passed (8.5s)`; full e2e below |
| Unit tests | `npm test` | `Test Files 68 passed (68)`, `Tests 976 passed (976)` (+5 on 971); 0 "not wrapped in act" |
| Lint, types, build | `npm run lint`; `npx tsc --noEmit`; `npm run build` | `✖ 4 problems (0 errors, 4 warnings)` (the 3 of main plus `.gate/dist.js`); exit 0, no output; `✓ Compiled successfully in 3.8s`, `✓ Generating static pages (4/4)` |
| e2e smoke | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `1 skipped`, `24 passed (1.2m)` (+2: e2e/m5-hud-scroll.spec.ts) |
