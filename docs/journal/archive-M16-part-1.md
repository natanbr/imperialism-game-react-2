## 2026-11-21 Task 11 — M16 Technology

Size L. Plan-lite for the local branch from de20eca.
- Change: replace shared unlocks with a priced catalogue, a turn clock and independent national purchases.
- Consumers: order validation, scripted development, browser saves, Capital, Tile Info and invention news.
- Tests and tasks (parallel after the contract): T-01 FR-519 all 28 rows / FR-520 ownership and v1 migration. T-02/03 FR-523 resource levels / FR-524 civilian training / FR-525 Clipper and refinery. T-04/05 FR-521 release turns / FR-522 reversible cash order / FR-527 cheapest useful purchase and reserve. T-06/07 FR-526 seeded browser purchase and unlock. T-08 FR-527 24 idle seeds and FR-528 frozen-player margin at 12 checkpoints.
- Verify each FR red first, then unit, lint, types, build, Playwright on 3123 and the roadmap check. Preserve FR-464 and the accepted M15 guards. Independent review follows delivery.
- Objection: technology spending and gated development may change both the two-islands order log and continent diplomacy. Measure against the original guards.

- **Q130, default taken.** Spread 100 technology years across the configured turn limit. TIME_CONFIG.TURN_LIMIT supplies the temporary default of 40.
  Objection: The displayed season and invention year diverge, and the late prices may be unaffordable.
- **Q131, default taken.** Keep Compound Steam Engine, Iron Railroad Bridge and Dynamite alongside the two historical starting technologies.
  Objection: Dynamite is an 1871 invention available at the start.
- **Q132, default taken.** Keep all seven starting civilians. Apply technology prerequisites to recruitment and development.
  Objection: The starting Rancher may have no legal job before Feed Grasses.
- **Q133, default taken.** Buy at most one technology per turn: the cheapest that enables eligible development on a collected tile while preserving reserves.
  Objection: This policy ignores ships and military technologies.
- **Q134, default taken.** Defer the Power Plant, oil sites, later regiments, forts and warships. Oil Drilling unlocks the Driller and refinery, and Streamlined Hulls unlocks the Clipper.
  Objection: A refinery has no oil to process on the present maps.
- **Q135, default taken.** Migrate version-1 saves by copying purchased shared IDs and legacy oil ownership to each nation.
  Objection: The loader must retain this migration until the old save version is retired.

### Verification before the local checkpoint

Each pre-implementation run in `.gate/codex/11/red-FR-<id>.txt` failed on its own row. The red counts below come from those files.

| Row | Test file(s) | Red summary and cause | Outcome |
|---|---|---|---|
| FR-519 | rulesData.test.ts | `1 failed`, catalogue module missing | All 28 data rows pass. |
| FR-520 | technologyOwnership.test.ts, persistence.test.ts | `2 failed`, no national lists or migration | Per-nation holdings and version-1 saves pass. |
| FR-521 | technology.test.ts, gameText.test.ts, newsPanel.test.tsx | `16 failed`, release/announcement absent | Scaled clock and invention news pass. |
| FR-522 | technology.test.ts | `2 failed`, order unsupported | Immediate payment/refund, isolation, all four refusals and activation pass. |
| FR-523 | validate.test.ts, tileOffers.test.tsx | `11 failed`, developments accepted without technology | Engine and Tile Info pass in the full candidate; parked under FR-528. |
| FR-524 | university.test.ts, capitalDialog.test.tsx | `3 failed`, ungated recruitment | All three civilian permissions pass. |
| FR-525 | shipyard.test.ts, capitalDialog.test.tsx | `1 failed`, Clipper missing | Per-nation Clipper, refinery and saved fleets pass. |
| FR-526 | technologyDialog.test.tsx, m16-technology.spec.ts, m16-ship-unlock.spec.ts | `3 failed`, Technology button disabled | Dialog passes. Clipper unlock is in the checkpoint; cotton unlock passes at both sizes in the full candidate. |
| FR-527 | scriptedTechnology.test.ts, sim/m16Acceptance.test.ts | `2 failed`, no purchases | Planner tests pass; only 11/24 idle seeds qualified by turn 20 (24 required). Parked. |
| FR-528 | scriptedScore.test.ts | `1 failed`, open turn-1 grain upgrade | Lowest ratio 764/594 (1.286x), below 1.5x at seed 3, turn 25. Parked. |

Checkpoint and balance evidence is under `.gate/codex/11/`. Checkpoint commands ran in the isolated checkout. The only code or test difference after the gate was a trailing empty line removed from technology.test.ts. The final file passed all 16 tests.

| Claim | Command | Result quoted |
|---|---|---|
| Full candidate: all units and simulations | `npm test` (unit.txt) | `Test Files  10 failed \| 126 passed (136)`, `Tests  37 failed \| 2844 passed (2881)`. |
| Full candidate: feature tests | `npx vitest run` on 12 feature/store/UI files (unit-focused.txt) | `Tests  474 passed (474)`. |
| Full candidate: immutable order conflict | Seed-1 replay of `de20eca` (golden-baseline.txt) | `BASELINE 1 16-6 livestock -> level 1`. The necessary Feed Grasses first appears on turn 3 and becomes usable after purchase. FR-464 hashes every order, and FR-125 requires zero rejected computer orders. |
| Full candidate: score at turns 15/25/40 | `npm test` (unit.txt, scripted/frozen) | Seed 1 `697/465, 823/588, 1497/730`; seed 2 `655/455, 781/581, 1444/733`; seed 3 `661/471, 764/594, 1535/736`; seed 4 `696/456, 823/577, 1364/721`. Both economies face the new gates and only the current script buys technology. |
| Full candidate: existing balance rows | `npm test`, focused verbose M14/fleet (accepted-diplomat-fleet.txt) | FR-545 `19/24 games`, FR-516 `24/24 fleets reached eight holds`, FR-542 (i) `9 of 24  (required 18)`, FR-546 `15 of 24  (required 13)`. |
| Checkpoint: unit gate and guards | `npm test` (contract-gate/expanded-unit.txt) | `Test Files  134 passed (134)`, `Tests  2863 passed (2863)`. FR-125 `903/563 (1.60)`; FR-464 passes. FR-542 (i) `23 of 24`, FR-546 `13 of 24`, FR-497 `computerOrders p95 81.6 ms`. |
| Checkpoint: lint | `npm run lint` (contract-gate/lint-final.txt) | `2 problems (0 errors, 2 warnings)`, `EXIT 0`. Both warnings predate M16. |
| Checkpoint: types | `npx tsc --noEmit` (contract-gate/types-final.txt) | `EXIT 0`. |
| Checkpoint: production | `npm run build` (contract-gate/build-final.txt) | `Compiled successfully in 16.8s`, `Generating static pages (4/4)`, `EXIT 0`. |
| Checkpoint: peaceful player and fleet | `npx vitest run tests/engine/sim/m14Acceptance.test.ts tests/engine/sim/m15Fleet.test.ts --reporter=verbose --maxWorkers=1` | `Testland wins by Council by turn 40 in 15/24 games`; `24/24 fleets reached eight holds by turn 25, maximum 8 holds actually used`. |
| Full candidate: browser and fixture repairs | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1`, then focused production rerun on 3125 | `3 failed`, `133 passed (25.9m)`; corrected the farm prerequisite and two fresh-game news assertions. `6 passed (1.0m)` covers all three, both cotton viewport flows and the Clipper. |
| Replay and human policy integrity | Git tree comparison and patch replay (scope.txt) | `PASS patch replay produced full candidate code tree 03bd1fdfd27136e59e0712ad2254789143c45618`. FR-464, the frozen M4 player, humans.ts and the accepted simulation test files match de20eca. |
| Decision cards and roadmap | `node .gate/m12/L4-check-roadmap.cjs` (contract-gate/roadmap-final.txt) | `PASS`; all six M16 choices are recorded as defaults with status open. |
| Checkpoint: complete seeded Chromium suite | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` (contract-gate/expanded-playwright.txt) | `135 passed (12.4m)`, `EXIT 0`. Includes buying Streamlined Hulls and queuing the Clipper. |
| Full candidate: isolated FR-497 timing | `npx vitest run tests/engine/sim/m13Acceptance.test.ts -t FR-497 --reporter=verbose` (fairness-quiet.txt) | `computerOrders p95 23.6 ms`, `EXIT 0`. The same probe measured 110.6 ms while the checkpoint gates were active. The threshold stays at 100 ms. |

## Moved from docs/journal.md on 2026-11-24

## 2026-11-21 Task 13 — M16 part 1 checkpoint review

Size M. Fix the four findings recorded in `.gate/codex/12/review.md`.
- Change and consumers — preserve historical orders across the save migration, align invention news and close the world market's oil supply.
- Coverage — FR-100/520 full-state replay, FR-521 fresh and loaded news, FR-525 seed-1 fuel path, FR-029 discovery of all six worker cases.
- Verify — red and green per finding, full Vitest, lint, TypeScript, production build, single-worker Chromium on port 3123 and the roadmap checker.
- Objection — historical permissions must survive replay without granting a new game or a resumed turn the same permissions.

| Claim | Command or evidence in `.gate/codex/13/` | Result quoted |
|---|---|---|
| FR-100/520, legacy replay | Vitest `legacyTechnology.test.tsx`, `red-legacy.txt`, `red-checkpoint-resave.txt`, `green-legacy.txt` | Red `to have a length of 2 but got 1`. Green `5 passed (5)` files and `76 passed (76)` tests, including full-state replay of both the pre-M16 save and its checkpoint resave. |
| FR-525, seed 1 | Vitest `refinerySupply.test.ts`, `fr-525-red.txt` and `fr-525-green.txt` | Red `"oilDelivered": 2`, `"fuel": 1`. Green `Tests  168 passed (168)` across industry, trade and UI, including zero oil delivered and zero fuel produced on the same orders. |
| FR-521, fresh and loaded HUD | Vitest `legacyTechnology.test.tsx`, `red-legacy.txt` and `green-legacy.txt` | Red `expected [] to deeply equal [ …(4) ]`. Green `legacyTechnology.test.tsx (5 tests)` includes all four lines exactly once after Continue and a second save. |
| FR-029, six worker cases | `vitest list tests/engine/orders/workPrices.test.ts -t FR-029`, then a filtered run, `fr-029-{red,green}.txt` | Red `Found 0`. Green `PASS: FR-029 discovers all 6 level 1 worker cases.` Filtered run `9 passed`. |
| Independent historical oil replay | `checkpoint-replay/generate.cjs` on `b75d196`, then `checkpoint-replay/verify.cjs` on the fix | `PASS: Loaded and replayed b75d196 turn 21 exactly.` After Continue, the standing refinery order `left 2 oil and 1 fuel on turn 22`. |
| Capital explains the carried stock | Vitest `capitalDialog.test.tsx`, `fr-525-capital-{red,green}.txt` and independent `review.md` | Red showed `2 Oil (2)`. Green shows `2 Oil (2 in warehouse, 0 available for production)`. The four focused suites reported `Tests  40 passed (40)`. |

| Gate | Command or file in `.gate/codex/13/` | Result quoted |
|---|---|---|
| Units and simulations | `npm test` (`unit.txt`, `margin.txt`) | `Test Files  136 passed (136)`, `Tests  2872 passed (2872)`. FR-125 minimum `903/563 = 1.603908x at seed 3, turn 25` across all 12 comparisons. |
| Protected inputs and replay | `git hash-object` vs. `git rev-parse b75d196:<path>` (`scope.txt`) | `PASS identical to b75d196` for the human policies, frozen player, golden replay test, balance tests and timeout configurations. |
| Lint | `npm run lint` (`lint.txt`) | `2 problems (0 errors, 2 warnings)`, `EXIT 0`. Both warnings also appear in the checkpoint lint log. |
| Types | `npx tsc --noEmit` (`types.txt`) | `EXIT 0` after using the typed Rancher enum in the new regression. |
| Production build | `npm run build` (`build.txt`) | `Compiled successfully in 19.3s`, `Generating static pages (4/4)`, `EXIT 0`. |
| Chromium | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` (`playwright.txt`) | `135 passed (18.9m)`, `EXIT 0`, including the seeded Clipper unlock. |
| Roadmap | `node .gate/m12/L4-check-roadmap.cjs` (`roadmap.txt`) | `PASS`, `EXIT 0`. The Technology milestone includes M16b as a planned follow-up. |
| Browser spot checks | `node .gate/codex/13/browser-news.cjs` (`browser-news.txt`, `turn-3-continue.png`, `carried-oil.png`) | Fresh and continued games both showed Streamlined Hulls, Square-Set Timbering, Iron Railroad Bridge and Feed Grasses. `PASS: checkpoint refinery shows 2 in warehouse, 0 available, a waiting standing order, and disabled More Fuel.` M16 part 1 and M16b each have a visible roadmap card. |
