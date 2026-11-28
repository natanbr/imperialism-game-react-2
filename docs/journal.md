# Journal

## Resuming here

- **M18k and M18l** on `claude/m18k-qa-fixes` (pull request opened 2026-11-27): five play-test fixes FR-643 to FR-647 and two screens, the Scouting Report (FR-650) and the Information map (FR-651). Four Codex rounds (tasks 65 to 68). Gate 72 green with the split NR-041 check. Open for the owner: FR-646 sortie forecast limit, F5 meaning of Allocated, M18l open questions 1 to 5. [Tasks 65–68](journal/task-65-m18kl.md)
- **M18j merged** in pull request 59 at `c9ea9d7` (the Developer, Buy land, overseas profit, FR-629 to FR-642). Three Codex reviews (tasks 62 to 64) found and closed 5 blockers. No protected result moved against main `521a7b4`. Open for the owner: the M18j inferred defaults in the spec, and the pre-existing undo stack order (FR-632). [Build, reviews and gate 69](journal/task-62-m18j.md)
- M18i merged: towns-first freight (FR-628, pull request 56) and the Task 60 fixes (pull request 58, `521a7b4`). The protein reservation (two `it.skip` tests) costs FR-545 one win; **owner 2026-11-27: lower the floor to 14 and ship it, but as the last item: work on all other functionality (missing screens, improvements, fixes, testing) first, end game (Council votes) last.** [Task 60](journal/task-60-m18i.md) · M18h merged in pull request 55, [milestone journal](journal/archive-M18h.md)
- M18g merged in pull request 53 (Stats rankings and history, Trade Book, Garrison Book, two diplomatic map modes), [journal](journal/archive-M18g.md). M18f (human credit, interest, forced sales, signed cash and supply notes) merged at `9d2f9eb` in pull request 52. The inferred credit numbers and FR-609 debt scoring remain open to owner revision. [M18f journal and gate evidence](journal/archive-M18f.md) · [Task 39 report](../.gate/codex/39/report.md) · [Earlier journal archives](journal/)
- M18e merged at `21ea18b`. Choose Random, Large and `Brete` to replay seed `2813929771`. The 400-turn historical calendar remains an owner decision (FR-593, FR-594).
- M18 (play-test comfort, `docs/specs/m18-playtest-comfort.md`): M18a merged into main `af24381` (pull request 43), M18b part 1 (FR-563, FR-568, FR-569) in `5e80bab` (pull request 44), part 2 (FR-564 nation colours and flags) in `4098bfe` (pull request 45). NR-037 in progress.
- M18b part 3 (FR-565, FR-566) merged into main `cd5b1be` (pull request 46); FR-567 into `994a0ca` (pull request 47), partial: the narrower pane is left for the owner; FR-570 (rail) into `751b74b` (pull request 48). Icons wait for the art (spec section 3).
- M18c (FR-572 to FR-578) merged in `896d1fb` (pull request 49). The three-tab Board of Trade and Trade School evidence is in `.gate/claude/53/`. The owner’s FR-575 decision about moving Details is still open.
- FR-579 Trade policies map (owner chose the map, 2026-11-24): built by Codex (tasks 29, 30), reviewed by Sonnet 5.5, gate green (`.gate/claude/54/`, screenshots `.gate/codex/30/`), merged via the pull request from `claude/m18c-policy-map`. Open Market → Trade policies; Tab to a country to see its keyboard focus.
- To try Demo: New game, Start Demo game; then Dashboard in the top bar (Economy, Military, Trade, Diplomacy, Council, Bug report).
- M17 merged into main `65a4d5a` (pull request 42; task evidence in `.gate/codex/21/` to `.gate/codex/28/`). M16 part 1 merged in `9bd5a91`: the human can buy technology; the computer makes no purchases on main.
- M16b is parked. On `claude/m16b-technology` (`95634c6`), FR-523 resource gates plus the buyer brought FR-125 down to 1.286× (minimum 1.5×). On `claude/m16b-buyer` (`49406e9`), the buyer alone bought Streamlined Hulls on turn 3 and ordered a Clipper on turn 6 in all 24 idle games. The spending weakened the computer. FR-546 earned a minor vote in 10/24 (13 required) and FR-489 captured a player province in 15/24 (18 required).
- FR-547 (Q143) is the buyer branch's proposed value rule. Measure technology availability, purchase timing and the value of the first unlocked action in the original game before tuning. See `docs/verify-and-tune.md`.
- Task 19 passed the load trials and full gate on `claude/perf-tests`. Finish future gates with `npm run test:perf` alone. The measured results and six functional logs are indexed in `.gate/codex/19/summary.md`.
- To play M17 on continent seed 1, set Armaments and Fabric production to 1. Build a Ship-of-the-Line on turn 6, declare and sail on turn 7, set the site on turn 8, and land the four-ARMS army on turn 9. On turn 10 see the survivors at Sundmark and its colony vote in Council.

## 2026-11-26 Task 60 — M18i review fixes

Size M. The first candidate fixed the one-car starvation, four-car allocation and confirmed expansion but missed three floors. The second restored FR-487 and FR-489. It missed FR-545 by one peaceful win. Development stopped under the two-attempt rule. A bisect traced the lost win to the protein reservation alone (seed 24: Valdoria's expert, sick on turns 28–31 since M18h, is fed and wins minor-3). The coordinator shipped everything else and held the reservation for the owner. [Test evidence, historical save and all measured changes](journal/task-60-m18i.md)

## 2026-11-26 Task 57 — M18h review fixes

Size M. Tile Info and Capital show growth when resources and capacity already support the next tier. Port advice identifies the missing connection. A News receipt names its province and selects its recorded seat. Raw AI estimates skip town settlements, and the town view looks up each founder's capital once. The pre-fix run reported `4 failed | 123 passed (127)` in the three affected suites. All 127 passed with the fixes.

All 3,584 functional tests, TypeScript, build, 31 Chromium checks and three final isolated performance tests passed. Lint reported its existing warning. All four goldens and 72 generated records matched byte for byte. Across 3,230 turns in 84 games, the FR-497 AI planning p95 rose from 19.8 to 24.6 ms against the 100 ms limit. [Commands, results and guard hashes](../.gate/codex/57/report.md)

## 2026-11-26 Task 56 — M18h town development

Size L. T-01 through T-04 built province town growth, shared rail freight and owner-scoped views. T-05 checks Continue, autosave and replay from a paid historical Order, compares every protected campaign and records the measured save changes under FR-627. [Tasks 52–56 and gate evidence](journal/archive-M18h.md) · [Protected results](journal/task-56-guards.md) · [Town activation by seed and player](journal/task-55-campaigns.md)

## 2026-11-25 Task 50 — Verify the saved replay checkpoint

The M18d writer verifies that a compact save restores the original historical position and market bid order. Authored terrain and rivers in the fixed worlds and ordinary refinery Oil remain open. [Task 50 gate and replay measurements](journal/archive-M18d.md#2026-11-25-task-50--verify-the-saved-replay-checkpoint) · [Task 49 handoff](journal/task-49-m18d.md) · [Task 48 screenshots](journal/task-48-m18d.md)

## 2026-11-25 Task 49 — M18d review fixes

Size M. Historical saves retain the original replay position using only differences from the current game. The turn-11 save shrank from 183,728 to 111,446 characters. A completed Large random campaign used 238,671 of the 2,000,000-character budget. The three rail regressions failed when the depot cash check was removed and passed with it restored. [Task 49 measurements, review and gate](journal/task-49-m18d.md)

## 2026-11-25 Task 48 — Fish within the existing loading budget

Size M. Kept the FR-339 limit at 20. The Fish/Coal atlas saved one request and 11,966 bytes from the Task 47 first paint. The new-depot payroll reserve, FR-616 re-records and historical replay changes passed the full gate, including 3,487 functional tests, 180 browser tests and 3 isolated performance tests. The roadmap checker reported PASS. [Task 48 results](journal/task-48-m18d.md) · [Old and new gameplay measurements](verify-and-tune.md#m18d-recorded-results)

## 2026-11-25 Task 47 — new depot payroll reserve

Size M for the scripted-player rule, followed by the existing Task 45 M18d closure package. A field army with four phases of weak world-market trade reserves six payrolls before ordering a new depot. All four fixed-continent games paid the army and fed healthy workers for 40 turns. The score ratio reached 1.533× at its lowest checkpoint, the diplomat won 15/24 games, and the privacy probe changed 0/280 plans. All 72 generated games passed their guards. Only one variant was needed. The full browser suite then found one additional Fish artwork request. FR-339 allows 20, and the page requests 21. The Task 45 stop rule leaves the package awaiting owner review. [Task 47 report](journal/task-47-m18d.md) · [Task 45 and 46 journal entries](journal/archive-M18d.md)

## 2026-11-24 Task 33 — Seeded random world (M18e T-01)

Size L. Two map sizes, a private generator stream and the existing start kit. Engine, store starts and replay consume the numeric seed and size. Fixed-world compatibility is a stop condition. The generation plan reserves the six coastal country footprints and the food rings before partitioning them into provinces. A six-country site budget keeps hidden seams and minor land in the same fairness measure.

| Check | Evidence |
|---|---|
| Red before implementation | `f91b982`: 4 suites red. The parser was missing, the registry and replay rejected Random, and the harness still played Continent. A subsequent case in `361b0fb` caught an extra size field when replaying an omitted-size Standard save. |
| FR-588–592 | 134 generated starts and 536 minor markets checked, with two pinned Brete fingerprints, disconnected-sea and split-province controls, and deliberately unequal ore and food fixtures. |
| NR-038 | The seven fixed suites passed 139/139 before and after. All 247 deterministic output lines matched, including FR-125 at 903/563, the four FR-464 hashes, FR-545 at 15/24, FR-546 at 13/24, and 0/280 changed private-Order plans. Includes original inputs for scripted scores, four pinned Order logs, Council balance, the private-Order probe, persistence, legacy tech and M17 combat replay. Six additional SHA-256 pins cover serialized starts and a 400-turn v1 save before and after its turn-10 Council. |
| FR-597 | 72/72 games reached a decision. No rejected computer Orders (37,475 submitted), invariant failures (2,790 turns), no-pay disbands in 940 idle turns, or changes to 930 probed plans. See the spec for policy outcomes and the per-seed fixture. |
| Open balance question | Scripted Great Power trade settled in 0/24 games. On seed 1 both powers offered finished goods and bid for inputs. Trade with minors settled. A Great Power trade target is open for the owner. |

Final gates: 3,292/3,292 tests across 161 files in 164.88 s, including the 72-game sweep (+29.53 s over the eight-game repository run). Lint returned 0 errors and 2 existing warnings. TypeScript and the production build passed. Isolated performance passed 3/3 before and after, with FR-497 p95 14.0 ms and 12.4 ms over 3,210 turns (100 ms limit). The test-first, guard, sweep and trade logs are in `.gate/codex/33/`.

Task 34 can pass an accepted `parseMapSeed` result and Random size to `startNewGame`. Empty input uses the store's existing seed draw. Build only Normal/Demo controls and the existing calendar display.

## 2026-11-24 Task 30 — Trade policy map review (FR-579)

Size M. Keep country names, flags and policy markers readable when a small country's land projects to a single tile.
The map consumes the positions and the selected country's border. Map and List share policy rows and refusals.
FR-579 regression coverage checks view-unit clearances at two world scales, a tile-only ownership transfer, visible keyboard focus and the selected border.
Verify with Vitest, lint, TypeScript, the production build, the three trade/readability Playwright specs on port 3123, the roadmap gate and the standalone performance suite.
Objection: moving an active SVG button to the end could change where Tab goes next. Paint its border after the other land and before the lettering while keeping the buttons in their existing order.

The new geometry tests reported “4 failed | 3 passed” before the fix. With the original world-unit offsets, the phone-sized label and marker bounds overlapped by 14.56 view units on the starting continent and 36.44 on the 96×64 fixture. Reviewing the first keyboard screenshot also revealed that a gold border painted over the entire map cut through Sundmark's name and boycott cross.

| Claim | Command or evidence | Result |
|---|---|---|
| Land geometry, including a tile-only transfer on two-islands | `npx vitest run tests/ui/tradePolicyMapView.test.ts` | “7 passed (7)”. All countries in both scale fixtures clear their own marker and the view edges. |
| Full functional suite | `npm test` | “Test Files  158 passed (158)” and “Tests  3136 passed (3136)”. |
| Map, List, trade and readability | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/m18-policy-map.spec.ts e2e/m7-trade.spec.ts e2e/m18-readability.spec.ts --workers=1` | “11 passed (2.5m)”. Clicking Sundmark's lettering beyond its land selected the country. Keyboard focus stayed on Arvelia after Space. |
| Rendered map at all three sizes | Chromium and Firefox, `.gate/codex/30/layout.txt` | “2 passed (39.2s)”. Both reported “overlap pairs []”. On the phone the closest annotation cleared the edge by 8.22 CSS px. The focused country's land had a 6 px dashed stroke in both browsers. |
| Roadmap | `git fetch`, `git rev-parse origin/main`, `node .gate/m12/L4-check-roadmap.cjs` | Fetched `896d1fbf08137190351261b9f978b451506d7549`. The gate compares the seven-character abbreviation and printed “PASS”. |
| Lint, types and production build | `npm run lint`, `npx tsc --noEmit`, `npm run build` | “0 errors, 2 warnings” in existing transport and logistics files. TypeScript exited 0. The build reported “Generating static pages (4/4)”. |
| Standalone performance suite | `npm run test:perf` | “Tests  3 passed (3)” and “computerOrders p95 25.2 ms” against the 100 ms limit. |

## 2026-11-24 Task 29 — Trade policies map (FR-579)

Size M. Build the political map from the same tile geometry and ownership as the game map.
The Board of Trade opens Trade policies on Map. List and the selected country share the FR-576 controls.
FR-579 tests cover geometry, land ownership, keyboard and pointer selection, policy orders and the three viewport sizes.
Verify with Vitest, lint, TypeScript, build, touched Playwright specs on 3123 and the standalone performance suite.
Objection: small countries can be hard to select on a phone. Check the actual labels and markers at 390 px and retain the full List.

The main map draws the six neighbours as staggered rows. The policy map shares its tile sides and uses province ownership, falling back to tile ownership on older maps. A jsdom draw on the 24×16 continent took 6.59 ms cold and 2.10 ms median over 25 uncached draws. This was below the owner's 20 ms threshold for adding a timing test.

| Claim | Command | Result |
|---|---|---|
| Tests failed before the feature | Focused geometry and Board of Trade UI suites and new Playwright spec | “Failed to resolve import” for the geometry builder. UI reported “11 failed” and “24 passed” for the absent Map and List controls. Chromium also failed on the missing Map button. |
| Phone fit regression caught | FR-579 at 390×844, first integration run | The pane overflowed horizontally by 256 px. The toolbar explanation inherited a fixed flex size. |
| Map and List in Chromium, including the corrected phone fit | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/m18-policy-map.spec.ts e2e/m18-readability.spec.ts e2e/m7-trade.spec.ts --workers=1` | “11 passed (1.0m)”. The map, controls and visible help fit all three viewports. |
| Static checks and production build | `npm run lint`, `npx tsc --noEmit`, `npm run build` | “0 errors, 2 warnings” in existing transport and logistics code, TypeScript exit 0, “Generating static pages (4/4)”. |
| Full functional suite, including the two-nation games | `npm test` | “Test Files  158 passed (158)” and “Tests  3133 passed (3133)”. |
| Performance suite, run alone | `npm run test:perf` | “Tests  3 passed (3)”. Computer orders took “p95 25.5 ms” against the 100 ms limit. |

Independent review covered landless countries, keyboard focus, shared flags and the selected country's orders and refusals. The three final screenshots show Arvelia at 25%, Sundmark under boycott and the other trading partners at 0%.

## 2026-11-24 M18c — trade screen and Trade School

Owner feedback with original-game screenshots became FR-572 to FR-577; the review round added FR-578 (refused "+" focusable with a visible reason, Buy/Sell a radio group following the order in place). Cash shown as "Cash before purchases" because the engine takes a purchase's money when it is ordered. Flags were approved by the owner; minor colours stay.

## 2026-11-24 M18b FR-570 — rail in the ink and wash style

Size M, UI only (NR-037: no rule change). Plan-lite: each railed tile draws its own piece in code (`components/railDrawing.ts`, `map/RailLayer.tsx`) in place of FR-328's stretched rail piece per link; the consumer is MapView's overlay only. Test rows: FR-570 → `tests/ui/railDrawing.test.tsx` (shape per connection pattern, straight and curve geometry, joins on the shared edge, construction, bridge, station, determinism, 3:1 of the new tokens, per-tile memo, the map's groups) and `e2e/m18-rail.spec.ts` (a prepared seed-1 save with a six-tile line, a river tile, a depot and a section under construction). Verify: those, every rail and map e2e spec on port 3123, tsc, lint, roadmap. Objection: on the offset rows a line running north turns on every tile, so it draws as a gentle wave, not a straight line.
- Readings: a curve bends past the centre (a quadratic curve with the centre as its control point), not exactly through it; the trestle spans the middle of a river tile's piece (a river is a tile flag); a station keeps FR-324's depot picture in its corner and gets a platform beside the track. New tokens `--color-rail-tie`, `--color-rail-timber`, `--color-rail-pencil`. The groups carry `data-rail-tile-id`: a `data-tile-id` on them broke the specs' tile locators (strict mode, 4 failures in the first e2e run).
- Existing tests changed (old -> new): `tests/ui/railLine.test.tsx` FR-328 case (one rail-art image per segment -> one rail-tile per tile at a segment's end, no rail-art; the 42 and 46.96 px lengths kept); `e2e/look.spec.ts` (rail-art count = rail-segment count -> rail-tile count = tiles at link ends, rail-art 0); `e2e/m11-art.spec.ts` (the same, and the depot's piece is a station).

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-570 red | `npx vitest run tests/ui/railDrawing.test.tsx` on a stub; `PORT=3123 npx playwright test e2e/m18-rail.spec.ts` | `Tests  10 failed \| 1 passed (11)` (the memo case passed on empty output); e2e `Expected: 6 Received: 0` (`red-FR-570.txt`) |
| FR-570 and the map's unit tests | `npx vitest run` on railDrawing, railLine, inkArt, palette, mapIcons, watchNation, tileCursor, inkPicture, mapFit, mapGround, provinceMap, mapKeyboard, mapStatus | `Test Files  13 passed (13)`, `Tests  217 passed (217)` (`green-unit.txt`) |
| FR-570 e2e and rail specs | `PORT=3123 npx playwright test` m18-rail, m11-art, m4-3, two-nations, m4-1 | `9 passed (35.9s)` (`e2e-batch1.txt`) |
| Map specs | the same with look, m11-map, m12-map, m18-map | `31 passed (1.3m)` (`e2e-batch2.txt`) |
| Other specs naming rail | the same with cursor-icons, play-turns, m17-sea-war | `13 passed (39.0s)` (`e2e-batch3.txt`) |
| Render time, jsdom, whole map | `npx vitest run --config vitest.perf.config.ts tests/ui/railDrawing.perf.tsx`, 3 runs before (HEAD) and after | tree of 198 links: mount 66 to 70 -> 74 to 92 ms, new turn 20 to 22 -> 19 to 21 ms; dense 522 links: mount 83 to 90 -> 84 to 103 ms, new turn 24 to 27 -> 22 to 24 ms (`perf-before.txt`, `perf-after.txt`) |
| Types, lint, roadmap | `npx tsc --noEmit`; `npm run lint`; `node .gate/m12/L4-check-roadmap.cjs` | exit 0; `2 problems (0 errors, 2 warnings)` (both pre-existing); `PASS` |
| By eye | `m18-rail-closeup.png` (200%, twice the pixels), `m18-rail-map.png`, before: `before-rail-map.png` | thin sepia rails and ties, curves, the trestle, the platform and pencil ties visible; the terrain shows through |
## 2026-11-23 M18b FR-567 review fixes

Orchestrator decisions: keep the 250 px pane (FR-567 partial, left for the owner), Ctrl and the wheel, the 10% minimum
gain. Fixes: an exact fit allowed half a pixel (`camera.ts` `FIT_SLACK_PX`; 1465x850 opened on the capital and clipped
the land); Ctrl and the wheel over the whole game screen zoom the map (about its middle off the map, nothing with a dialog
open), so the HUD never resizes; the 200% layer test zooms after the mount; new tests make New game, Start Demo game and
Continue go through `openMap`. Safari gesture events are a known gap, noted in the row. Objection: Ctrl and the wheel no
longer zoom the page anywhere on the game screen; Ctrl and + still do.

| Claim | Command | Result |
|---|---|---|
| Review rows red | `npx vitest run tests/ui/mapFit.test.tsx` | `3 failed / 15 passed` (`.gate/claude/48/red-review.txt`) |
| Wiring tests catch a revert | the same, `-t "open the map fitted"`, page.tsx and mapActions.ts mutated to centreOnCapital | `3 failed`; mutant reverted |
| Green | `npx vitest run` mapFit, camera, computerNations, mapKeyboard | `Test Files 4 passed`, `Tests 78 passed` |
| e2e | `PORT=3123 npx playwright test` m18-map, m11-map, m12-map, m13-hud (Playwright's own server, port free after) | `52 passed` |

## 2026-11-23 M18b FR-567 — the map opens fitted, with its own zoom

Size M, on `claude/m18b-map` from `cd5b1be`. Plan-lite: the opening view (`camera.ts` `landBoxPx`, `fitZoom`,
`openingView`; `mapActions.ts` `openMap` on the first view, Continue and New game) fits the land plus half a tile of sea to
the map area, whole pixels a tile, 100% to 200%, 100% under a 10% gain; a smaller screen opens at 100% on the capital
(FR-083). Ctrl and the wheel, a trackpad pinch and two fingers zoom about the pointer (`hooks/useMapZoomGestures.ts`,
`zoomMapTo`); the buttons step from any zoom. Top bar values 15 px (were 13). Consumers: the player on open; Center and the
news lines keep the zoom. Tests: FR-567 rows in `tests/ui/mapFit.test.tsx`, `e2e/m18-map.spec.ts`.
Objection: the plain wheel still scrolls (FR-364, tested); the owner said "mouse wheel", read here as Ctrl and the wheel,
the gesture that zoomed his page. The 10% floor keeps 1280x720 at 100% (and FR-088's camera 0, 0) for crisp pictures.
The pane stays 250 px: the brief's 280 to 300 px target assumed a wider pane; narrowing it is left for the orchestrator.
Edited tests (old -> new): the FR-367 and FR-340 tests at 1920x1080 (`tests/ui/camera.test.tsx`, `e2e/m12-map.spec.ts`,
`e2e/m11-map.spec.ts`) now zoom out to 100% first, as that size opens at 69 px tiles.

| Claim | Command | Result |
|---|---|---|
| FR-567 red | `npx vitest run tests/ui/mapFit.test.tsx`; `PORT=3123 npx playwright test e2e/m18-map.spec.ts` | `12 failed / 1 passed` (13); `2 failed` (land share 0.654, top bar 13 px) (`.gate/claude/48/red-FR-567.txt`) |
| FR-567 green | the same two | `13 passed`; `2 passed` (land share 0.854, 48 px tiles, top bar 15 px, pane 250 px) |
| Camera, map, HUD unit tests | `npx vitest run` on 32 ui files that mount the map, the bar or the page | `Test Files 32 passed`, all green |
| Map, camera, HUD, 1366 e2e | `PORT=3123 npx playwright test` m11-map, m12-map, islands, look, m13-hud, m5-hud-scroll, m12b-qa, m12-qa, m12-scrollbars, m18-readability, m18-capital, m18-colours, m18-dashboard, m5-world, m4-1, m10-council | `30 passed`, `2 failed` (the two 1920 tests; edited) then `2 passed`; `42 passed`; `16 passed` |
| Types and lint | `npx tsc --noEmit`; `npm run lint` | exit 0; 0 errors (2 old warnings) |

## 2026-11-23 M18b parts 2 and 3 — nation colours, Capital layout and labour bar

Part 2 (FR-564, one colour and flag per nation) merged into main `4098bfe` (pull request 45).
Part 3, size M, on `claude/m18b-capital`. FR-565: the Capital shows one section at a time (Industry, Trade School,
Capitol, Transport, University, Shipyard) through disclosure buttons; Industry opens first; the closed sections stay
mounted and `hidden`; the card buildings are 44 px (replaces FR-352's 30 px in 24 px heads). FR-566: the city's labour
bar (labour, grades, the turn's food forecast) sits above the sections inside the dialog, so the cards get the full
width and every section fits 1366x768 with no scroll bar; on a phone the bar follows the open section (FR-428).
Objection: the owner's words put the city HUD on the right; a right column left Industry 60 px short at 1366x768.
Review cleanups: the FR-426 fade test now covers the section fade (and failed on a mutant that kept the measuring on
Industry), the card names are h3 under the h2 title, stale 24 px and 30 px texts fixed, roadmap main `4098bfe`.

| Claim | Command | Result |
|---|---|---|
| FR-565, FR-566 red, then green | `npx vitest run tests/ui/capitalSections.test.tsx -t FR-565` (and `-t FR-566`) | red `6 failed`, `3 failed`; green `6 passed`, `3 passed` (`.gate/claude/45/`) |
| In the app, 1366x768 and 390 px | `PORT=3123 npx playwright test e2e/m18-capital.spec.ts` | red `2 failed`; green `2 passed` |
| Full gate on `3430434` (orchestrator) | `npm test`, Playwright, tsc, lint, build, perf | 3066 unit, 152 e2e, tsc, lint, build, perf passed; roadmap check failed (fixed in the cleanups) |
| FR-426 fade test can fail | mutant: measuring ref left on Industry | `1 failed \| 3 passed` (`.gate/claude/45/mutant-FR-426.txt`) |
| Cleanups | `npx vitest run tests/ui/capitalDialog.test.tsx tests/ui/listArt.test.tsx`; `PORT=3123 npx playwright test e2e/m11-lists.spec.ts e2e/m18-capital.spec.ts` | `Tests 42 passed (42)`; `7 passed` |

## 2026-11-23 M18b part 1 — Buy and Sell, Stats page, toasts

Size M. FR-563: the Market, Board of Trade, Deal Book and trade news say Buy and Sell (Diplomacy keeps "offer" for
alliance and peace offers). FR-568: score, standing, Council line and projection, score parts and table moved from the
top bar and the pane's Nation group to a Stats dialog (`HUD/StatsDialog.tsx`); the Nation group keeps the money lines.
FR-569: refused orders are toasts (`components/Toasts.tsx`, `store/controls/toastSlice.ts`), the inline refusal lines
are gone. Objection: the Nation group still exists with three money lines; the owner may want it in Stats too.
Gate round: startNewGame now clears the toasts (FR-160 guard); the error toast's text is ink (8.92:1, was 4.70:1);
e2e/m5-hud-scroll FR-235 (1) lost its "Debug box below the fold" premise because FR-568 shortened the Nation group
(reported to the orchestrator, assertion unchanged). Evidence in `.gate/claude/35/` and `.gate/claude/37/`.

| Claim | Command | Result |
|---|---|---|
| FR-563, FR-568, FR-569 red, then green | `npx vitest run tests/ui/buySellWording.test.tsx` (and statsPage, toasts) | red 6/6, 3/3, no component; green 6, 3, 5 passed (`.gate/claude/35/`) |
| In the app, 1366x768 and 390 px | `PORT=3123 npx playwright test e2e/m18-readability.spec.ts` | `6 passed` |

## 2026-11-23 M18a — Demo level and debug dashboard

Size M. FR-561 gives the human a Demo start (`engine/world/demoStart.ts`); FR-562 adds the Demo-only Dashboard
(`HUD/DebugDashboard.tsx`, data from `HUD/dashboardView.ts`: cards per Great Power, section buttons, Bug report holding
Details for bug reports). Consumers: the top bar and the right pane. Verify: the targeted tests below, then the full gate.
Objection: Demo both changes the economy and reveals numbers; split into two switches if that gets in the way.
Review round: a rival's "this turn" trade line always read "none", because the computer plans inside End Turn; the
rival card now says "decided at End Turn" and shows last turn's orders, tested on a game played through the real store.

| Claim | Command | Result |
|---|---|---|
| FR-562 red before the build | `npx vitest run tests/ui/dashboard.test.tsx` (stub view module) | `Tests 9 failed \| 1 passed (10)` (`.gate/claude/31/red-FR-562.txt`) |
| FR-562 green | `npx vitest run tests/ui/dashboard.test.tsx` | `Tests 10 passed (10)` (`.gate/claude/31/green-FR-562.txt`) |
| FR-562 in the app, 1366x768 and 390 px | `PORT=3123 npx playwright test e2e/m18-dashboard.spec.ts` | `2 passed` (`.gate/claude/31/e2e-FR-562.txt`) |
| Full gate on `f03519f` (orchestrator) | `npm test`, Playwright, tsc, build, perf | 3023 unit, 142 e2e, tsc, build and perf passed; roadmap check failed (fixed below) |
| Review findings 1 to 3 red | `npx vitest run tests/ui/dashboard.test.tsx tests/ui/topBar.test.tsx` | `Tests 3 failed \| 37 passed (40)`: the rival card said "Buy this turn none"; no visible Demo note (`.gate/claude/33/red-review.txt`) |
| Review findings green | `npx vitest run tests/ui/dashboard.test.tsx tests/ui/topBar.test.tsx tests/ui/watchNation.test.tsx tests/ui/hudGroups.test.tsx` | `Tests 80 passed (80)` (`.gate/claude/33/green-review.txt`) |
| e2e after the review | `PORT=3123 npx playwright test e2e/m18-dashboard.spec.ts e2e/m18-demo.spec.ts`; New game specs `--grep "FR-480\|FR-109\|New game"` | `3 passed`; `7 passed` (`.gate/claude/33/e2e-*.txt`) |
| Types and lint | `npx tsc --noEmit`; `npm run lint` | exit 0; `0 errors, 2 warnings` (both in untouched files) |
| Roadmap | `node .gate/m12/L4-check-roadmap.cjs` | `PASS` (`.gate/claude/33/roadmap-check.txt`) |

## 2026-11-22 to 2026-11-23 M17 Sea war and reach, with Task 19 before it (archived)

Size L. Merged into main `65a4d5a` (pull request 42). The entries are in [archive-M17.md](journal/archive-M17.md): Task 19 (the
wall-clock checks run alone with `npm run test:perf`, the gate's last step), Task 20 (the plan: NR-036, FR-548 to FR-559, cards
Q144 to Q146), Task 21 (the implementation, T-01 to T-13), Tasks 23 and 25 (two reviews; FR-552 and FR-560 per Q145) and Task 28
(naval measurement and intercepted landings). Guards held throughout: FR-545 15/24, FR-546 13/24, FR-125 minimum 903/563.
Evidence in `.gate/codex/19/` to `.gate/codex/28/`.

## 2026-11-21 Tasks 11 and 13 — M16 Technology (archived)

The [M16 part 1 journal archive](journal/archive-M16-part-1.md) records the original checkpoint, ten red tests, the seeded Clipper unlock and the full candidate's measurements, and Task 13's checkpoint review (four findings fixed: legacy replay, invention news, the oil supply, FR-029's six worker cases).

## 2026-11-20 M15 implementation and review (archived)

[The M15 journal archive](journal/archive-M15.md) preserves Task 07's implementation, review and browser checks
and Task 09's original diplomat and Council replays. Task 10 records the owner's accepted 15/24 peaceful wins and 13/24 earned minor votes, each measured with the unchanged human policies.

## 2026-11-20 M14 A game that can end well (archived)

The final Council, peaceful campaign and UI review evidence are in [archive-M14.md](journal/archive-M14.md).

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
list in `docs/journal/archive-resuming-before-M12.md`.

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

## 2026-11-13 M10 Council of Governors, UI half and fix rounds (archived)

Entries in `docs/journal/archive-M10.md`: the UI half (FR-297 to FR-301, FR-303, FR-304: the Council screen, the news line, the
game-over line, the HUD's Next Council line), the review fix round (13 minor findings; FR-306 to FR-309), the QA fix round (FR-310
to FR-317: abstention reasons, the player first, the projection, the room at game over) and its review (F1, F2). 2001 unit tests,
Playwright 38 passed, 1 skipped; every baseline unchanged. Merged as PR 28 (main 69ed08b).

## 2026-11-14 M11 Ink-and-wash restyle (NR-032; FR-318 to FR-356; archived)

Size: L. Branch `claude/m11-ink-restyle`, merged as PR 30 (main 3d819d6) after the orchestrator's gate on 84b2333: 2111 unit tests, lint
0 errors, tsc and build clean, Playwright 51 passed and 1 skipped (--workers=1); engine, store and types unchanged. The art pack now
shows across the game and 7 dialogs fit at 5 window sizes. Everything is in `docs/journal/archive-M11.md`: lanes 1 to 3, the integration
step, the review fix round (FR-339 to FR-345, card Q77), the QA fix round (FR-346 to FR-355, card Q78) and its review (FR-356).
Carried: nation 2's blue is 2.97:1 on the grass; the Capital dialog's Clothing card and "Cotton or Wool" wrap were already cut at 1280x720.

## 2026-11-14 to 2026-11-16 M12 Honest game (NR-033, NR-034; FR-357 to FR-464, cards Q79 to Q107; archived)

Size: L. Merged as pull request 34 (main 91d7edc). Everything is in `docs/journal/archive-M12.md`: the audit (160 findings, themes T1 to
T16, milestones M12 to M18), the four lanes, the integration, two review rounds, the QA fix round (FR-444 to FR-453), the AI margin hunt
(FR-454 to FR-460, cards Q105 to Q107), the close-out (FR-461 to FR-464) and gates 4 to 6 (gate 6: 2447 unit tests, Playwright 92 passed).
Parked after M12: the FR-125 margin's thin points (seed 3 at turn 25 passes by 58.5 points), cards Q103 to Q107; FR-372 was closed by M12b.

## 2026-11-17 M12b Better HUD (NR-034; FR-465 to FR-480, FR-529 to FR-537, cards Q108 to Q113; archived)

Size: L, UI only. Merged as pull request 35 (main 74f595c). Everything is in `docs/journal/archive-M12b.md`: the four tasks (the frame,
the top bar, the right pane, the gate), the review fix round (15 findings) and the by-eye QA fix round with the final gate (FR-529 to
FR-537; gate 2: 2525 unit tests, Playwright 125 passed). Not verified: Firefox and WebKit.

## 2026-11-17 M13 Computer nations that play (archived)

The implementation, review and by-eye QA entries are in [archive-M13.md](journal/archive-M13.md).
They record the original failures to buy steel and win a minor vote, and the FR-541 lumber fix; with them the review fixes of
pull request 36 (eight findings) and the close-out (FR-539 standing steel bid from turn 7, FR-542 replacing the turn-30 vote
target, both at 18 of 24 games; gate: 2731 unit tests, 129 Chromium passed).
