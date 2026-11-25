# M18g information screens journal

## 2026-11-25 Task 43 — M18g review fixes

Size M. The review covered the two Market variants, dated trade, rank-history recovery and Stats layout.
The score breakdown and rank history serve the player in Stats. The optional ranking sample also passes through End Turn and the save reader.
FR-085 checks the loaded Market text. FR-612 follows a viewer subsidy through settlement. FR-611 checks a failed projection, an extra measure from a newer save and round trend markers. FR-404 checks hover, keyboard focus, scroll and resize.
Run the complete unit and browser suites, lint, TypeScript and the production build. Compare NR-040 with the recorded base and run performance last.
The score can fit inside the window and still be covered by the scrolling pane. Check its corners and each line in Chromium.

Local implementation commits on `claude/m18g-screens` are `6c67571` for the store and `d4cfeac` for Stats.

| Check | Evidence |
|---|---|
| Tests before implementation | `07de0c0` includes the two store regressions that failed on the prior code. The trend marker measured 6.23×5.73 px at 1366×768 and 3.50×5.73 px at 390×844. `ae4299f` covers the score's placement on resize. `f552d2c` caught a focused tooltip remaining visible after its anchor had scrolled out. |
| FR-404 score breakdown | The Stats tabs added in `2ad9045` moved the score 35 px lower in a 640×360 window. The 94 px tooltip opened downwards at y=286, extended to y=380 and was clipped by the new scroll pane. Restoring the layout from `9d2f9eb` on the same page put the tooltip bottom at y=345. The fix measures available space on hover or focus, resize and pane scroll. The tooltip now ends at y=258.5 at 640×360, y=380 at 800×600 and y=432.25 at 1280×720. The original browser test checks the corners and the end of each line. [640×360 screenshot](../../.gate/codex/43/score-640x360.png) |
| FR-085 and FR-612 | The full-page emoji scan now waits for and includes each named Market dialog. In the two-round Coal fixture, the viewer's 25% subsidy reverses Arvelia's current preference. The full settled page still records one Coal bought until End Turn replaces it with the purchase of two. |
| FR-611 and NR-040 | A projection exception on turn 2 leaves history entries for turns 1 and 3. Turn 2 settles and unlocks on schedule. Loading a future measure keeps the validated known placings. Chart paths still use the full plot width and circular markers use a three-pixel radius. |
| Browser gates | `npx playwright test e2e/m13-hud.spec.ts --workers=1` passed 23/23 on the final source, including FR-404 at all three sizes. The full suite passed 176/176 in 11.4 minutes with three workers. |
| Full unit suite | The first full run caught the one-second dialog query timing out on the cold Market import. Test commit `b25ea0d` waits for the actual dynamic import and React update. Six suites passed 163/163 under six-worker load. The final `npm test` passed 3,431/3,431 in 171 files. |
| NR-040 comparison | FR-125 903/563, FR-545 15/24, FR-546 13/24 and FR-497 0/280. All four FR-464 goldens and all 72 FR-597 records across 2,790 turns matched the base byte for byte. The normalized SHA-256 was `28818fdc3b7a7eed6853c2324abadfe433b8d01ec56caba9f5b26cc25efaa9b2`. [Guard log](../../.gate/codex/43/guard-summary.log) |
| Static checks, performance and review | TypeScript and the production build passed. Lint found zero errors and one existing unused variable in `logisticsSystem.test.ts`. All three isolated performance tests passed, with FR-497 planner p95 at 12.3 ms against a 100 ms limit. Independent review of the store, SVG, tooltip and Market tests found no outstanding issues. |

## 2026-11-24 Task 42 — M18g books and diplomatic map modes

Size M. Market gains dated commodity pages and two diplomatic views. Stats gains a province roster.
The player keeps Board Details and inspects diplomacy from the human Great Power's perspective.
FR-612 checks bids independently by round. FR-613 checks ownership at display time. FR-614 and FR-615 check settled relations, offices and keyboard selection in both layouts.
Verify the three viewport sizes, the existing Board fit and policy editor, save/replay comparisons and the full FLOW gate. Run performance last and alone.
Objection: a current rival order or a present-day minor offer could make a plausible but false historical entry. Restrict each page to the source and viewer specified for that round.

| Claim | Command or evidence | Observed result |
|---|---|---|
| Tests first | Test-only commit `4b76420`. The red logs are in `.gate/codex/42/`. | The Board and Stats tests failed on missing book tabs. All four diplomatic-mode cases failed at the missing mode selector. Chromium placed a real bid before failing at Trade Book and independently reached the missing map control. |
| FR-612 | `boardOfTradeTabs.test.tsx`, `m18g-books.spec.ts` and the existing `m7-trade.spec.ts` | The current bid and last round's bid unlock independent pages. Cancellation removes current access. Missing dated encounters leave the archived bidders available. Details and the existing Repeat action work on their original screens. |
| FR-613 | `armyDialog.test.tsx` and `m18g-books.spec.ts` | The roster uses the Army's force size, health and status. A wounded marcher stays at its origin. Losing the selected province drops its roster on restore. At 390×844 a long rail destination wrapped inside its cell and the health percentage remained legible. |
| FR-614 and FR-615 | `tradePolicyMapModes.test.tsx`, `m18g-books.spec.ts` and `m18-policy-map.spec.ts` | Both layouts name the settled relation, status and outgoing offices. A pending grant changed the band only at settlement. List identified the landless colony's ruler. Enter and Space selected countries and the original editor submitted its subsidy. |
| NR-040 private orders | `.gate/codex/42/visibility.test.tsx` and `visibility.log` | 156 complete-dialog HTML comparisons matched across Normal and Demo after a rival reserved cash, bid, recruited, marched, granted and set a boycott. The comparison includes SVG, names and linked descriptions. |
| NR-040 save and replay | `vite-node --config vitest.config.ts .gate/codex/42/save-compat.ts` and the open/closed-screen browser case | Four fixed-time v1 saves matched the base on restore, next settlement and replay. In Chromium the two books left the saved position identical, and the next full save matched the control game. |
| Browser fit and accessibility | Serial Chromium on port 3123 with the development server and again with `next start` | 26 passed in each run across eight specs. Captured the books and both map layouts at 1366×768, 1280×720 and 390×844. The existing 1280×720 Board still fits all 17 rows. Checked keyboard focus return, the highlighted country, accessible names and table headers. |
| Production build | `npm run build` then the page-consumer unit suites and production Chromium | Turbopack 15 failed while merging Market into the main page. Loading Market as a separate client bundle at the original render position produced four static pages. All 282 tests in the 11 affected suites passed. [Next.js client bundle guidance](https://nextjs.org/docs/app/guides/lazy-loading) |
| Country borders | `palette.test.ts` (FR-086 and FR-110) | The full suite caught a colour calculation in the map component stylesheet. The shared palette now supplies the contrasting stroke, with the existing muted ink as its fallback. |
| First click after page load | `m14-endgame.spec.ts` FR-506, repeated six times in fresh Chromium contexts | A development run lost the initial Stats click while the page was loading the Market bundle. Giving Market its own Suspense boundary lets the HUD hydrate independently. The unchanged first-click test passed 6/6. |
| Final functional and simulation gate | `npm test` and `.gate/codex/42/guard_compare.py after` | 3,426/3,426 tests passed in 171 files. FR-125 minimum 903/563 (1.604×), FR-545 15/24, FR-546 13/24, FR-497 0/280. Zero rejected computer orders, invariant breaks or idle no-pay disbands. All four FR-464 Order hashes and score checkpoints and all 72 FR-597 records across 2,790 turns matched the base. SHA-256 of the normalized evidence was `28818fdc3b7a7eed6853c2324abadfe433b8d01ec56caba9f5b26cc25efaa9b2`. |
| Static checks and isolated performance | `npm run lint`, `npx tsc --noEmit`, `npm run build`, then `npm run test:perf` alone after both browser and functional gates | TypeScript and production build passed. Lint found zero errors and the existing unused variable in `logisticsSystem.test.ts`. All three performance tests passed. FR-497 planner p95 was 12.3 ms across 3,210 turns of 84 games against the 100 ms limit. |
| Review and roadmap | Independent review against the spec, plus `node .gate/m12/L4-check-roadmap.cjs` | Review found no blocker. The missing-report regression was added, the diplomatic detail text gained explicit spacing, and adjacent peace territories gained a visible border. The roadmap printed `PASS` with fetched `origin/main` at `9d2f9eb`. |

## 2026-11-24 Task 41 — M18g Stats rankings and history

Size M. FR-610 projects seven public placings after settlement. FR-611 stores each turn's placings beside the game in the v1 session.
Stats consumes the record for a selected turn and the series for its history chart and text equivalent.
NR-040 compares Orders, settlement, replay and serialized gameplay across private Orders, screen selection, old saves and changes to the optional history.
Verify both Stats viewports, the full unit suite, lint, types, build, the protected simulations and isolated performance.
Objection: ranking the current position would expose a rival's private reservation. Capture the resolved position once and read its places in Stats.

| Claim | Command or evidence | Observed result |
|---|---|---|
| Tests first | Test-only commit `cd11339`; focused store, component and Chromium runs | The projection module and history were absent. Seven store assertions failed plus the projection import. Three component cases failed at the missing Rankings tab. Chromium failed at the missing Overview tab. |
| Measured base | Protected suites on `e163f12` (only docs changed from `9d2f9eb`) | 263 tests passed. FR-125 903/563 = 1.604×, FR-545 15/24, FR-546 13/24, FR-497 0/280. Four complete goldens and 72 random games across 2,790 turns were captured before implementation. |
| Settlements and gaps | `rankProjection.test.ts`, `rankHistory.test.ts`, `statsRankings.test.tsx` | Ties use 1, 1, 3 and founding order. Tests cover a change of leader, matched export/buyer events, 23 settlements, a final turn, New game, and a missing or damaged record. Additional red test commit `f5d2407` covers an army ranking outliving the last army on a world without provinces. |
| v1 save and replay | Fixed-time base comparison in `.gate/codex/41/save-compat.ts` and the 400-turn fixture in `randomMapReplay.test.ts` | Normal, Demo, open credit and a historical combat checkpoint matched the base on restore, next settlement and replay. The 400-turn test now hashes the original envelope with only the optional history removed. Both existing SHA-256 pins matched. Continuing the original save records turn 10 once. |
| Protected runs | `npm test`, then `.gate/codex/41/guard_compare.py after` | 3,414 tests passed across 170 files. Before and after SHA-256 `28818fdc3b7a7eed6853c2324abadfe433b8d01ec56caba9f5b26cc25efaa9b2` covers all four goldens and all 72 per-seed records with the base measurements above. |
| Stats in Chromium | `m18-readability`, `m18e-new-game`, `m14-endgame` on port 3123 with one worker | 16 passed. The 1366×768 and 390×844 captures show a first-place tie on turn 1 and the mill expansion changing turn 3. Verified keyboard navigation, return focus, Overview and reopening Stats after the final Council. |
| Static checks | `npm run lint`, `npx tsc --noEmit`, `npm run build` | TypeScript and the production build passed. ESLint reported zero errors and one existing unused-variable warning in `logisticsSystem.test.ts`. |
| Performance and review | `npm run test:perf` alone and independent source review | Three performance tests passed. FR-497 p95 was 13.3 ms over 3,210 turns, within 100 ms. Review checked historical gaps, the finished-save message, keyboard labels and both legacy hashes. The full logs and desktop/phone screenshots are under `.gate/codex/41/`. |
