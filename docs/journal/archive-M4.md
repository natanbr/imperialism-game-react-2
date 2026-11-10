# Journal archive: M4 second nation

Moved from `docs/journal.md` on 2026-11-10 at the start of M4.1 (FLOW: the journal stays under
400 lines; a milestone's entries are archived when it ends). The entries are unchanged.

## 2026-11-09 M4 part A: second nation, engine and store (FR-097 to FR-105)

Size: L (start world, turn loop and store). One agent (Opus 5.5, xhigh), unattended, no subagents, no
advisor calls; ultracode was not on. Branch `claude/m4-two-nations` from `origin/main` 161e2e0, in the
worktree `.claude/worktrees/decisions`.

Plan-lite:
- Change: `newGame` founds two nations with one helper `foundNation` (palette slot, controller); End
  Turn asks `computerOrders` (scripted player) for nation 2 and logs every nation's orders; freight cars
  wait one turn; M3/M3.5 housekeeping.
- Consumers: the map's borders (slot colour), the store's `advanceTurn`, logistics and the food
  forecast, the capital dialog's freight line, part B (the UI to watch nation 2).
- Tests: FR-097 to FR-099 and FR-102 to FR-104 in `tests/engine/secondNation.test.ts`; FR-101 in
  `tests/engine/freightCars.test.ts`, `systems/productionSystem.test.ts`, `ui/capitalDialog.test.tsx`;
  FR-099, FR-100, FR-105 (d) in `tests/store/computerNations.test.ts` and `engineBoundary.test.ts`;
  FR-105 (a, b) in `rulesData.test.ts` and `gameOver.test.ts`; FR-097 also in `ui/territory.test.tsx`.
- Verify: the gate below.
- Objection: the human's log entry is every order the store applied, in order, including ones later
  lowered or cancelled (sell 2, then sell 1). The replay is exact, but the log is not a list of final
  orders; a v3 replay viewer may want to compact it.

Red before green:
- `npx vitest run tests/engine/secondNation.test.ts`: `Test Files 1 failed (1)`, `Failed to resolve
  import "@/engine/ai/players"` (no registry yet).
- FR-101, with `promoteFreightCars` in place and production unchanged: 4 failed, among them
  `expected 48 to be 45` (3 more units shipped in the turn the cars were ordered) and the forecast
  `{ mouths: 7, fed: 3, ... }` instead of nobody fed.
- `npx vitest run tests/store/computerNations.test.ts`: 8 of 9 failed (the state after End Turn
  differed: nation 2 gave no orders; `orderLog` undefined; `startNewGame is not a function`).

Decisions (each with its objection):
- Nation 2 is "Valdoria" (fictional), `capital-2` on `CAPITAL_SITES[1]` (14-9), slot 2, scripted.
  Objection: none.
- Colours: kept the M3.5 tokens `--color-nation-1` #a8322d (muted red) and `--color-nation-2` #2c5c9e
  (muted blue), already part of the approved look; only how a nation picks its token changed.
  Objection: the red is close to `--color-bad` (the unconnected depot ring); part B may want to check.
- `Nation.controller` is required; every test-fixture nation is "human", so the fixture-based store
  and UI tests resolve exactly as before. Objection: none.
- Freight cars reuse `transportCapacityPendingIncrease`: ordered cars before the production phase,
  built cars after it, added to `transportCapacity` by `promoteFreightCars` after every phase. No new
  field. Objection: the field means two things within one turn; nothing reads it between production
  and housekeeping (labour is only checked in the order phase).
- `startNewGame` is a store action only; no New game button yet (part B). The FR-022 test leaves it
  out of the "no other action changes the game" sweep because it replaces the game.
- FR-100 is within the ~40-line budget (about 20 lines in `gameSlice.ts`), so it records the human's
  orders too, not only the AI's.
- The scripted player needed no change for FR-102 (numbers below).
- The M3.5 entries moved to `docs/journal/archive-M3.5.md` to keep this file under 400 lines.

Nation 2 in 10 turns (seed 1, nation 1 idle, `tests/engine/secondNation.test.ts` FR-102): resource
levels 5 to 17, 10 rail links, score 240 to 310 (treasury 50,
industry 90, development 170), cash $10,000 to $5,017, freight cars 15 to 21, no order refused. Seeds
2, 3, 7 and 42 give the same levels and rail, 12 developments finished and 9 resources found,
and scores 306 to 313 (a throwaway probe, not committed).

Tests whose expectation the new FRs made wrong, and were updated (none skipped or deleted):
- `startWorld.test.ts`: FR-080 raised levels next to both capitals; FR-081 nation 1's workers and
  tiles only; FR-082's "island 2 unclaimed" now holds for the empty map, and the new game gives it to
  nation 2. `newGame.test.ts` FR-081 and `gameStore.test.ts` FR-027: two nation ids.
- `productionSystem.test.ts`, the two FR-039 car rows: the built cars wait in the pending count.
- `territory.test.tsx` FR-087: two nations' borders; `accessibleNames.test.tsx` FR-095: the "not
  owned" orchard is made by the test (no land is unowned now).
- `gameStore.test.ts` FR-022 leaves out `startNewGame`; FR-018 also checks `orderLog`, `ordersThisTurn`.
- e2e: two capitals (islands), both nations ranked instead of "nation 1 is rank 1" (game over), the
  player's workers and rail picked by the new `data-nation-id` (look, play-turns), the player's
  capital in the cursor spec's wait.

NR-016 ("orders can be changed until End Turn and take effect when the turn ends"): other orders whose
effect shows within the same turn. Listed, not changed:

| Order | What shows at once | Reversible this turn |
|---|---|---|
| `moveWorker` and every `moveAnd...` order | the civilian stands on the new tile at once and cannot move again this turn | yes, `cancelWorkerAction` sends it back |
| job orders (prospect, develop, rail, depot, port, fort) | the cost leaves the treasury when ordered (FR-029), so the HUD cash and score drop at once | yes, refunded if cancelled this turn (FR-031) |
| `sellCommodity` | the offered units leave the warehouse when ordered (FR-061) | yes, a lower amount returns them |
| `buyCommodity` | the bid is paid from the treasury when ordered (FR-062) | yes, refunded |
| `changeTransportCapacity` | 1 lumber + 1 steel per car leave the warehouse; 2 labour per car show as committed (FR-039) | yes |
| `expandBuilding` | the lumber and steel leave the warehouse (FR-038, FR-057) | yes |
| `trainWorkers` | cash and paper paid at once (FR-058), and the trainee's labour is gone from this turn's pool at once | yes |
| `recruitWorkers` | canned food, clothing and furniture leave the warehouse (FR-042) | yes |

All are payments or reservations made when the order is given; none changes the map, the market or
production before End Turn, and every one can be undone until then. The one that changes this turn's
play is training (the trainee's labour is withdrawn as soon as it is ordered). `setProduction` and
`setTransportAllocations` already act only at End Turn.

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-097 to FR-099, FR-102 to FR-104 covered | `npx vitest run tests/engine/secondNation.test.ts` | `Tests 18 passed (18)` |
| FR-101 covered | `npx vitest run tests/engine/freightCars.test.ts tests/engine/systems/productionSystem.test.ts tests/engine/resolveTurn.test.ts` | `Test Files 3 passed (3)` |
| FR-099, FR-100, FR-105 (d) covered | `npx vitest run tests/store` | `Test Files 3 passed (3)` |
| Unit tests | `npm test` | `Test Files 48 passed (48)` / `Tests 691 passed (691)` (+37 on main's 654) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3 warnings as on main) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 8.1s`, `✓ Generating static pages (4/4)` |
| Smoke | `PORT=3170 npx playwright test --reporter=line --workers=1` | `1 skipped` / `15 passed (3.9m)`; the skip is the old `test.fixme` rail cursor |

The first smoke run with default workers on a cold dev server failed 13 tests, most on `page.goto:
Test timeout of 30000ms exceeded`; with `--workers=1` (as the brief allows) only the real two-nation
selector failures were left, fixed in the e2e commit.

## 2026-11-09 M4 part B: watching the second nation (FR-106 to FR-110)

Size: L (the milestone's UI: HUD, map tiles, tile panel, game-over screen, palette). One agent (Opus 5.5,
xhigh), unattended, no subagents, no advisor calls; ultracode was not on. Branch `claude/m4-two-nations`
on top of part A (c4f4673), worktree `.claude/worktrees/decisions`.

Plan-lite:
- Change: HUD score table (`HUD/ScoreTable.tsx`, `NationSwatch.tsx`, `selectScoreTable`); `newsLines` in
  `gameText.ts` (player first, other nations named); `TileWorkers` draws the player's civilians as 24 px
  buttons (one alone, or a stack with a tray) and Valdoria's as a marker; the store's `selectWorker` /
  `setSelectedWorkerId` accept only the player's workers; the tile panel shows another nation's tile
  read-only; New game in the HUD (asked in place) and on the game-over screen (`hooks/mapActions.ts`);
  `startNewGame` clears selection and dialogs; the selection ring is `TileBase`'s own element (z-index 2,
  above the overlay's 1); tokens `--color-nation-1` and `--color-bad`; the palette scan widened.
- Consumers: the HUD, the map tiles, the game-over screen, the e2e specs that pick civilians.
- Verify: the gate below, then the screenshots (looked at, fixes listed below).
- Objection: a crowded tile now needs two clicks to pick a civilian (stack, then the tray), where the
  10 px buttons needed one; the 24 px target (WCAG 2.2) cannot fit seven civilians on a 42 px tile.

| FR | Test file | What the test asserts |
|---|---|---|
| FR-106 | `tests/ui/watchNation.test.tsx`, `e2e/two-nations.spec.ts`, `e2e/market-and-game-over.spec.ts` | HUD rows "1 Testland (you) 240", "2 Valdoria 240" (tie in founding order); swatch `aria-hidden` in `var(--color-nation-1)` / `-2`; a richer Valdoria ranks first with its own colour; the HUD shows "Score: 240" and the table; game-over rows ranked 1 and 2, names, swatches; e2e: 2 rows, swatch visible |
| FR-107 | `tests/ui/watchNation.test.tsx`, `e2e/two-nations.spec.ts` | `newsLines` order: player's lines, then "Valdoria: …", then game over; after 3 real End Turns every Valdoria event line (11 on turn 3) starts "Valdoria: ", none "Testland"; e2e: the panel shows "Valdoria: " after 5 turns |
| FR-108 | `tests/ui/watchNation.test.tsx`, `tests/store/computerNations.test.ts`, `e2e/two-nations.spec.ts` | 14-9 holds no button, a marker named "Valdoria: 7 civilians"; the store ignores `worker-nation-2-*` and unknown ids in both select actions; a click on 14-9 shows "Owner: Valdoria", "Capital", 7 civilians, no button; hidden hills show "Not yet prospected"; the player's own tile still has buttons; every order recorded while clicking on Valdoria's land carries `nation-1`; e2e: no button on 14-9, read-only panel, ring visible |
| FR-109 | `tests/ui/watchNation.test.tsx`, `tests/store/computerNations.test.ts`, `e2e/two-nations.spec.ts`, `e2e/market-and-game-over.spec.ts` | HUD: "Keep playing" keeps the same game; "Start new game" gives turn 1, empty news, no selection, dialogs closed, camera moved once; game-over New game: no game over, turn 1; store: selection and all five dialogs cleared; e2e: both flows |
| FR-110 | `tests/ui/watchNation.test.tsx`, `tests/ui/palette.test.ts`, `tests/ui/territory.test.tsx`, `e2e/look.spec.ts` | (a) `.workerTarget` 24 x 24 px; stack `data-count` 7, tray with the 7 start civilians and icons, pick closes the tray; one civilian is its own button; e2e: stack and the 7 tray buttons measure >= 24 px. (b) one `selection-ring`, in the selected tile, z-index 2 > overlay 1, accent via `--color-selected`. (c) ΔE76 nation 1 vs bad, nation 2, accent, good all >= 25; nations >= 20 apart under deuteranopia and protanopia. (d) danger text >= 4.5:1 on surface, sunken, raised, bg-danger. (e) scan over `layout.tsx` too, self-check of 20 literal kinds flagged and 10 token lines clean. (f) no `act()` warning |

Red before green: `npx vitest run tests/ui tests/store` gave `Test Files 5 failed | 13 passed (18)` /
`Tests 23 failed | 176 passed (199)`: `(0 , newsLines) is not a function`, `expected 'worker-nation-2-7' to
be undefined`, `expected NaN to be greater than or equal to 24` (no `.workerTarget`), `expected [] to have a
length of 1 but got +0` (no ring element), `{ "dE": 11, "pair": "--color-nation-1 vs --color-bad" }`,
`{ "pair": "--color-text-danger on --color-surface", "ratio": 4.35 }` (and 3.84 on sunken), the FR-084 icon
list one short by two, `startNewGame` leaving `selectedTileId` set. The `act()` fix was already in that run:
0 warnings (5 before, from 4 tests in `scoreAndGameOver.test.tsx` and `warehouseAndHud.test.tsx`).

Decisions (each with its objection):
- Worker targets (FR-110 a): one civilian is a 24 px button in the tile's bottom right; several are one
  24 px stack button with the count, and a tray of 24 px buttons opens below the tile while it is selected
  and no worker is (above it on the bottom rows, edge-aligned near the map's sides). Picking one closes
  the tray; the stack then shows the picked civilian in the accent colour. Objection: the button covers
  the tile's centre, so a click there selects the civilian again instead of acting on its own tile; the
  depot step of `e2e/look.spec.ts` now clicks the tile's corner. Making "click the selected civilian
  again" act on its tile was rejected: a double click would start a paid job by accident.
- Valdoria's civilians are a marker of the same size with a dashed border (no button, title names them);
  a click on it is a click on the tile, which only shows it. Objection: none.
- Colours (FR-110 c, d): `--color-nation-1` #a8322d (muted red) to #9e2a5b (crimson): ΔE76 11.0 to 35.9
  from the red of "bad", 59.4 from nation 2's blue, 48.7 / 28.9 from it under deuteranopia / protanopia.
  `--color-bad` #c9483a to #b23b2e: danger text 5.47:1 on surface, 4.83 sunken, 5.76 raised, 4.70 on
  bg-danger (was 4.35, 3.84, 4.58, 3.74). `.btn-danger` text now uses `--color-text-danger`. Objection:
  nation 1 reads crimson rather than red; the minimal palette keeps its size (two values changed).
- The selection ring (FR-110 b): at 100 % zoom (device scale 3 and 8) the shore border covered only the
  1 px grid line, not the ring; the overlap shows with sub-pixel scaling and where rail crosses the tile
  edge. The ring is now an element above the overlay, so nothing can cover it. Objection: none.
- The palette scan (FR-110 e) found no new literal in the code, so nothing needed a token.
- News order (FR-107): the player's lines first, then each other nation's under its name, then game over.
  Objection: the engine's event order is no longer kept across nations.
- The tile panel (FR-108) shows display names ("Capital", "Barren hills", "Grain (L1)") and no longer
  names a hidden resource (it printed the raw type, so a hidden coal hill read "coal (L0)"). Objection:
  none.
- New game asks in place in the HUD (not `window.confirm`, which Playwright and jsdom dismiss); the
  game-over screen's button acts at once. Objection: none.

Tests whose expectation the new FRs made wrong, and were updated (none skipped or deleted):
- `territory.test.tsx` FR-087: the ring is the `selection-ring` element, not the tile's box-shadow (FR-110 b).
- `icons.test.tsx` FR-084: the UI icon list gains `newGame` and `civilians`; FR-085: the capital is
  selected first, so its tray shows the 7 worker buttons (FR-110 a).
- `palette.test.ts`: the scan uses the wider patterns and `layout.tsx`; the FR-094 row adds danger text.
- `scoreAndGameOver.test.tsx`, `warehouseAndHud.test.tsx`: store updates before `rerender` wrapped in `act()`.
- e2e: `play-turns`, `look` and `cursor-icons` pick civilians through the capital's stack (FR-110 a); the
  look spec's depot click goes to the tile's corner; `market-and-game-over` saves `m4-game-over.png`
  (was `m3-game-over.png`, kept) and ends with New game; new `two-nations.spec.ts` (2 tests).

Screenshots (Playwright, 1280x720 unless noted), looked at:
- `docs/journal/m4-map.png`: turn 6; Valdoria's rail and developments on island 2, its civilians as
  dashed markers; HUD table "1 Valdoria 253 / 2 Testland (you) 240"; news lines "Valdoria: …".
- `docs/journal/m4-valdoria-capital.png`: 14-9 selected (ring), the panel "Owner: Valdoria", the note
  "Valdoria's land: you can watch it, not give orders here.", its civilian listed, no button.
- `docs/journal/m4-game-over.png`: turn 40; both nations ranked with swatches (Valdoria 665, Testland 240),
  "Back to the map" and "New game".
- `docs/journal/m4-tray-zoom.png` (device scale 3): the capital's stack with "7" and the open tray.
Fixed after looking: the HUD header's "New game" wrapped onto two lines (buttons no longer wrap; the
header wraps as a whole); the count badge sat over the capital's icon (moved to the button's top right,
the button 5 px in from the tile's edge); a click on Advance Turn scrolled the whole HUD, hiding the
score table and the tile panel (the HUD's information now scrolls alone, the action buttons are compact
and stay below it, and the Debug box moved after the news).

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-106 to FR-110 covered | `npx vitest run tests/ui tests/store` | `Test Files 18 passed (18)` / `Tests 199 passed (199)`, no stderr |
| No `act()` warning | `npm test`, output searched for "not wrapped in act" | 0 matches (5 in `npx vitest run tests/ui` on part A, c4f4673) |
| Unit tests | `npm test` | `Test Files 49 passed (49)` / `Tests 714 passed (714)` (+23 on part A's 691) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3 as part A) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (dev server stopped first) | `✓ Compiled successfully in 8.7s`, `✓ Generating static pages (4/4)` |
| Smoke | `PORT=3170 npx playwright test --workers=1 --reporter=line` | `1 skipped` / `17 passed (3.1m)`; the skip is the old `test.fixme` rail cursor (+2 tests: `two-nations.spec.ts`) |

## 2026-11-09 M4 review fix round

Size: M (six review items). One agent (Opus 5.5), no subagents, no advisor calls; ultracode was not on.
Branch `claude/m4-two-nations` from b1e6236, worktree `.claude/worktrees/decisions`. Tests first: each
new test was run red on the old code before the fix (quoted below).

| Item | Change | Test (title cites the FR) | Red before green |
|---|---|---|---|
| 1 FR-108 | `useTileClickHandler`: a tile owned by another nation is only selected, no order | `watchNation.test.tsx` FR-108 "every order the UI builds…": the click on 14-8 with the engineer selected builds no order, `lastRejection` stays null, 14-8 selected | `expected [ { kind: 'moveWorker', …(3) } ] to have a length of +0 but got 1` |
| 2 FR-110 (e) | Palette scan: named colours in any case, `filter` / `backdrop-filter`, `background-image`, `border-inline-*` / `border-block-*` (and camelCase), `scrollbar-color`, `column-rule`, `-webkit-text-fill-color`, Tailwind `text-[red]` / `bg-[#fff]`; in `.css` files any named colour, hex or colour function on any line, comments blanked | `palette.test.ts` FR-110 self-check: 21 new samples and 5 next-line CSS samples flagged; `var(--color-x)`, `transparent`, `currentColor`, `inherit`, `white-space`, `text-[14px]`, `.filter(` not flagged | planted `border-inline-start:` / `2px solid Red;` in `Tile.module.css` was reported as `Tile.module.css:250`; nothing in `src/app` newly flagged, so no token change |
| 3 FR-110 (f) | `tests/ui/actWarnings.ts`: `failOnActWarnings()` spies on `console.error`, `afterEach` fails with "FR-110 (f) no act() warning" | used by `scoreAndGameOver.test.tsx` and `warehouseAndHud.test.tsx`; FR-110 (f) self-check of the matcher | a planted store update outside `act()` failed with `FR-110 (f) no act() warning: expected [ Array(1) ] to deeply equal []` |
| 4 FR-097 | Row now reads crimson #9e2a5b and blue #2c5c9e, "values set by FR-110 (c)" | `palette.test.ts` FR-097: the hex values in the requirements row equal `tokens.css` | the old row named no values (the test reads `[]`) |
| 5 FR-111 (new) | `TileWorkers`: focus back to the stack after a pick or Escape, Escape closes the tray, stack name "7 civilians, engineer selected", `aria-pressed`; HUD toggle `aria-expanded` / `aria-controls`, focus to the confirm panel (not to Start new game, so a stray Enter does not end the game) | `watchNation.test.tsx` FR-111, 3 tests | with the source change reverted: `Tests 3 failed / 17 passed (20)` |
| 6 FR-106 | One line on the HUD layout (scrolling content, fixed compact actions, Debug below the news, plain "Back to the map") | not covered: no test checks the layout; the e2e only clicks "Back to the map" by name | n/a |
| Note 5 | Not fixed; in Carried forward as an M5 design item | n/a | n/a |

| Claim | Command | Result (quoted) |
|---|---|---|
| Unit tests | `npm test` | `Test Files 49 passed (49)` / `Tests 719 passed (719)` (+5 on 714) |
| No `act()` warning | `npm test`, output searched for "not wrapped in act" | 0 matches |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3, in files not touched) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 4.4s`, `✓ Generating static pages (4/4)` |
| Smoke | `PORT=3173 npx playwright test --workers=1` | `1 skipped` / `17 passed (1.3m)`; the skip is the old `test.fixme` rail cursor |
