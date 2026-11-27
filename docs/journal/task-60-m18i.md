# Task 60 — M18i freight and replay

Branch `claude/m18i-fixes`, based on `6eedc75`. Regression tests were committed first in `8b0766c`. Historical M18h is `1cf9fd6`.

## Player-visible regressions

| Finding | Before the fix | Required outcome |
|---|---|---|
| One car and four workers | Fabric shipped, three ate and one starved | The Fish reaches the feeding phase and all four eat |
| Four cars, two competing towns | East shipped one Lumber in place of West’s Furniture | West ships one Fabric, two Lumber and one Furniture. East ships zero |
| Accepted Furniture Factory expansion from two to four | Two Timber took both cars. West delivered zero of its one Lumber | One car takes the mill’s Timber, the other takes West’s Lumber |
| M18h Large random seed 1, turn 40 | Replaying the old Orders changed six warehouse entries | The v1 loader retains the paid Order and authoritative M18h position, then continues under M18i |

## Historical re-records from M18h to merged M18i

FR-627 / FR-628, six cars. In Grain, Fish, Fabric, Lumber, Furniture order, automatic freight moved [1,1,1,2,1] → [0,0,1,4,1] when East’s two Lumber took the raw cars. With Lumber set to three and Fabric to zero it moved [1,1,0,3,1] → [1,0,0,3,2] when East’s Furniture took the Fish car.

FR-627 / FR-628. Town goods displaced automatic tile and Fish freight. The computer added explicit town wants to both freight Orders on 66 turns (132 Orders). Seeds 1 and 3 changed on turns 24–40, seeds 2 and 4 on turns 25–40. At seed 1 turn 24 both Orders gained one explicit Lumber.

| Fixed Continent seed | M18h Order SHA-256 | Merged M18i Order SHA-256 |
|---:|---|---|
| 1 | `12711a8eace260679975a8841f9db5f10a61c80877ab0427564a30a225db5ce6` | `e33a44442ad7cd1a5aeabb498ebae69a3f8e958ce4575caf8046689ed95e353e` |
| 2 | `2b44929c3d157a198f8f5eb60a1e3ffd4eac406bebf655b998929b3ed3ffd02a` | `1adcae4f69029e305010dc47b050295d4af369c05f9943901cb3503cc9fdaaed` |
| 3 | `8a42689cb28da980c14a0b86579dd9c6248c858b9e438ef40d3ca207708ef9b3` | `5f16981902eb0704cc1d53768ede8bc962130c863ae80ea205e6592622f65c3c` |
| 4 | `481ffb8030b4b5e9a0b66b7807505e889a3621638c0cf5f014256ca51627e39e` | `d13e5609ea44548d68400fe2c9cd116abbb048c8a26dc15ff6e07f02f3e5fd83` |

### Generated maps

**Task 60 audit, FR-627 / FR-628.** Towns-first freight changed warehouse stock, sale proceeds, later Orders and payroll. In Standard diplomat seed 3, Testland had $1 for its $25 turn-24 upkeep. On turns 11 and 12, Fabric displaced Grain. An extra turn-14 Clothing sale brought in $800. Testland then completed an extra depot and rail on turns 18 and 19. Its closing treasury on turn 21 fell $283 → $76. Its unpaid disbands rose 2 → 3, on turns [24,25] → [22,23,24]. Total unpaid disbands rose 50 → 51, including zero idle losses. Accepted Orders fell 37,557 → 37,522. Computer deliveries rose 0 → 190. Twelve previously pinned fixture rows changed. Including the other recorded campaign measurements gives 20 changed games. Including new town deliveries gives 28. Both owners’ deliveries rose 0 → 344 of 778 offered units, in 0 → 28 games. Scores below are for turns 15, 25 and 40.

| Size, policy and seed | M18h → merged M18i |
|---|---|
| standard idle 2 | submitted 523 → 516, townDelivered 0 → 12, computerTownDelivered 0 → 12, scores [465,680,1162] → [465,680,1141] |
| standard idle 4 | townDelivered 0 → 21, computerTownDelivered 0 → 21, scores [462,649,1032] → [462,649,1120] |
| standard idle 8 | submitted 492 → 457, firstCapture 36 → null, captures 1 → 0, firstPact null → 39, townDelivered 0 → 9, computerTownDelivered 0 → 9, compulsory 0 → 3, scores [452,681,1072] → [452,681,1177] |
| standard scripted 1 | townDelivered 0 → 2 |
| standard scripted 3 | submitted 498 → 499, townDelivered 0 → 20, computerTownDelivered 0 → 5, scores [433,715,1079] → [433,715,1033] |
| standard scripted 4 | submitted 511 → 515, townDelivered 0 → 22, computerTownDelivered 0 → 22, scores [487,706,1029] → [487,706,1089] |
| standard scripted 6 | townDelivered 0 → 8 |
| standard scripted 8 | townDelivered 0 → 4, computerTownDelivered 0 → 4 |
| standard scripted 11 | winner "nation-1" → "nation-2", submitted 508 → 507, townDelivered 0 → 12, compulsory 1 → 2, peacefulWin true → false |
| standard diplomat 1 | townDelivered 0 → 2 |
| standard diplomat 3 | submitted 498 → 499, noPay 2 → 3, townDelivered 0 → 13, computerTownDelivered 0 → 1, scores [433,714,1080] → [433,714,1108] |
| standard diplomat 4 | townDelivered 0 → 4, computerTownDelivered 0 → 4, scores [443,662,1155] → [443,662,1162] |
| standard diplomat 6 | townDelivered 0 → 9 |
| standard diplomat 8 | submitted 488 → 493, firstCapture null → 39, captures 0 → 1, townDelivered 0 → 15, computerTownDelivered 0 → 10, scores [490,751,1263] → [490,751,1254] |
| standard diplomat 11 | winner "nation-1" → "nation-2", submitted 534 → 528, townDelivered 0 → 15, peacefulWin true → false, scores [437,583,835] → [437,583,879] |
| large idle 1 | submitted 593 → 586, townDelivered 0 → 8, computerTownDelivered 0 → 8, scores [472,660,984] → [472,660,1024] |
| large idle 3 | submitted 513 → 548, firstCapture null → 35, captures 0 → 1, townDelivered 0 → 11, computerTownDelivered 0 → 11, compulsory 3 → 0, scores [495,747,1276] → [495,746,1261] |
| large idle 6 | townDelivered 0 → 3, computerTownDelivered 0 → 3, scores [502,746,1138] → [502,746,1147] |
| large idle 10 | submitted 567 → 557, townDelivered 0 → 1, computerTownDelivered 0 → 1, scores [505,652,1239] → [505,652,1234] |
| large scripted 1 | townDelivered 0 → 2 |
| large scripted 3 | winner "nation-2" → "nation-1", submitted 536 → 540, firstCapture 39 → 36, earned 1 → 0, townDelivered 0 → 12, computerTownDelivered 0 → 12, peacefulWin false → true, scores [495,705,1261] → [495,733,1289] |
| large scripted 4 | townDelivered 0 → 15, computerTownDelivered 0 → 15, scores [484,705,1277] → [484,705,1328] |
| large scripted 5 | townDelivered 0 → 14 |
| large scripted 7 | winner "nation-1" → "nation-2", submitted 535 → 534, townDelivered 0 → 18, computerTownDelivered 0 → 18, scores [453,692,1162] → [453,692,1237] |
| large diplomat 3 | submitted 529 → 516, firstCapture 39 → null, captures 1 → 0, townDelivered 0 → 10, computerTownDelivered 0 → 10, compulsory 0 → 3, scores [495,705,1206] → [495,733,1335] |
| large diplomat 4 | townDelivered 0 → 16, computerTownDelivered 0 → 16, scores [484,705,1224] → [484,705,1248] |
| large diplomat 6 | townDelivered 0 → 8, computerTownDelivered 0 → 8 |
| large diplomat 8 | winner "nation-2" → "nation-1", submitted 578 → 573, townDelivered 0 → 58, peacefulWin false → true, scores [479,600,915] → [479,600,917] |

| Size and policy | Changes to the recorded group summary |
|---|---|
| standard idle | submitted 6169 → 6127, firstCapture.reached 5 → 4, firstCapture.median 35 → 32.5, pacts 2 → 3, compulsoryGames 6 → 7, compulsoryVotes 14 → 17, towns.delivered 0 → 42, towns.games 0 → 3, score40.median 1061.5 → 1066 |
| standard scripted | submitted 6000 → 6004, compulsoryVotes 14 → 15, peacefulWins 4 → 3, towns.delivered 0 → 68, towns.games 0 → 6, score40.min 1029 → 1033 |
| standard diplomat | noPay 9 → 10, firstCapture.reached 3 → 4, firstCapture.median 32 → 35.5, peacefulWins 6 → 5, towns.delivered 0 → 58, towns.games 0 → 6, score40.min 835 → 879 |
| large idle | submitted 6538 → 6556, firstCapture.reached 10 → 11, firstCapture.median 26 → 27, compulsoryGames 6 → 5, compulsoryVotes 10 → 7, towns.delivered 0 → 23, towns.games 0 → 4, score40.min 984 → 1024, score40.median 1255 → 1247.5 |
| large scripted | submitted 6506 → 6509, earnedGames 6 → 5, earnedVotes 6 → 5, peacefulWins 3 → 4, towns.delivered 0 → 61, towns.games 0 → 5, score40.median 1221 → 1231 |
| large diplomat | submitted 6404 → 6386, firstCapture.reached 9 → 8, firstCapture.median 26 → 25, compulsoryGames 3 → 4, compulsoryVotes 6 → 9, peacefulWins 2 → 3, towns.delivered 0 → 92, towns.games 0 → 4, score40.min 915 → 917, score40.median 1242.5 → 1264.5 |

## Floor investigation

The first candidate reserved Fish even when the planned shipment and Canned Food already covered the meal. On all four fixed Continent seeds the first Order difference appeared on turn 9, before towns produced. The new reservation displaced economic freight. FR-545 fell 15/24 → 13/24, FR-489 capital retention to turn 40 fell 24/24 → 23/24, and FR-487 early declarations reached 20/24 against a floor of 22/24. The candidate was rejected.

Selecting the yield test by name passed with the configured hook. Repeating the same selection with the hook disabled failed with `expected false to be true`.

## Stop after attempt two

**FR-545 requires 15 peaceful diplomat wins in 24 fixed Continent games.** The merged result was 15, the first attempt produced 13, and the second produced 14 (12 with a paid grant). FR-489 capital retention returned to 24/24 and FR-487 early wars returned to 23/24. The second attempt only changes freight to obtain an additional well-fed worker when the normal shipment, confirmed food production and stock leave a meal uncovered. The specific diplomat seed and causal Order sequence behind the remaining loss have not been established.

The second protected run reported `5 failed | 269 passed (274)`. One failure was the FR-545 floor. Four more were exact assertions for FR-260 Orders and army-less scores, FR-247 trade and Large diplomat seed 8. FR-546 stayed at 16/24 (floor 13), the four Two islands Order digests matched and the lowest FR-125 score ratio stayed at 690/450. The review fixes are uncommitted on top of the tests-first commit. No push or deployment.

### Historical replay and save pins in the worktree

The final fixture was written by M18h on turn 39. Testland's first consulate moved cash $6,200 → $5,700. A second consulate after Continue moved it $5,700 → $5,200. Replay starts at (turn 39, one paid Order), previously (turn 1, zero paid Orders). The first continued settlement delivered Lumber/Steel [0,0] → [1,1]. The v1 envelope and paid amounts survived save, load, continuation and replay.

FR-627 / FR-628, Task 60 blocked candidate. Fixed Continent seed 7, T40: 204,795 → 204,351 characters, replay overhead 10,899 → 10,872. From T26, Orders omit Lumber lacking a car. Large random seed 1, before/after T40: 248,908 → 248,614 and 253,596 → 253,216 characters. From T29 both freight Orders omit unshippable Lumber and Steel. Final replay overhead 13,224 → 13,201. Lengths measured. Updated size assertions await rerun.

FR-627 / FR-628, Task 60 blocked candidate. Changing only the rules marker from m18h to m18i accounts for the fixed seed-7 v1 save digest changes. T10: `1cd5a212843f098b0fa773e108ac6977e5b5658eceb9496ae066dcb6d799219d` → `f00cd079d245a34de9b82176c1a06086ffbe29d378c0dfa6b99a78b6a1d733da`. T11: `78f6ae8d549f9361e8c46251b4f5e1a468a00bfc5582132936583218cf602b22` → `a7bb70e7c341ce56dbd873ff83b86b11e7c9c359addad6f205cc5131989e91b8`.

### Other second-attempt observations

These are measurements against the existing campaign pins. The stopped candidate has no accepted replacement baselines.

| Population and measure | Merged M18i → second attempt |
|---|---|
| Large diplomat 8, submitted Orders, town deliveries and turn-40 score | 573 → 577, 58 → 64 (human), 917 → 907 |
| All 72 games, accepted Orders and town deliveries | 37,522 → 37,526, 344 → 350. Computer deliveries stayed at 190 of the 350. No rejections |
| Large diplomat group, accepted Orders, delivered units, minimum T40 score | 6,386 → 6,390, 92 → 98, 917 → 907 |
| Army-less Continent seed 2, treasury, capacity and score | 9,463 → 10,385, 76 → 80, 1,424 → 1,473. Treasury points 94 → 103, industry points 760 → 800 |
| Army-less Continent seed 3, treasury | 9,281 → 9,270 |

The armed fixed Continent campaigns kept their score and payroll schedules. Limiting town assignments to available cars removed unshippable explicit Lumber. Seeds 2 and 4 also gained one explicit Fish on turn 20. All four submitted Order digests changed.

| Seed | Merged M18i | Second attempt |
|---:|---|---|
| 1 | `e33a44442ad7cd1a5aeabb498ebae69a3f8e958ce4575caf8046689ed95e353e` | `12711a8eace260679975a8841f9db5f10a61c80877ab0427564a30a225db5ce6` |
| 2 | `1adcae4f69029e305010dc47b050295d4af369c05f9943901cb3503cc9fdaaed` | `ba1ce171b4db6342973893eac2fa4fa0441f21dc754289f00f4df9b1c95794db` |
| 3 | `5f16981902eb0704cc1d53768ede8bc962130c863ae80ea205e6592622f65c3c` | `8a42689cb28da980c14a0b86579dd9c6248c858b9e438ef40d3ca207708ef9b3` |
| 4 | `d13e5609ea44548d68400fe2c9cd116abbb048c8a26dc15ff6e07f02f3e5fd83` | `1faa8eda04d1c48ed0ff66fe6a618bfdca25876e1a3875937ad199fd60b8de0d` |

| FR-247 partners market | Changed measurements at turn 40 |
|---|---|
| Trade, seed 1 | minorDeals [85, 104] → [85, 107], minorPurchases [47, 66] → [47, 68], treasury [3217, 12403] → [3214, 12278] |
| Trade, seed 2 | minorDeals [82, 101] → [77, 114], minorPurchases [46, 62] → [41, 74], treasury [4475, 2889] → [5373, 3281], capitalArms [4, 5] → [4, 6] |
| Prices, seed 1 | furniture 622 → 623, cotton 106 → 105, timber 155 → 157 |
| Prices, seed 2 | clothing 658 → 653, furniture 672 → 669, timber 179 → 178, coal 109 → 113, ironOre 102 → 103 |

## Verification and handoff

| Command or check | Observed result |
|---|---|
| Freight, privacy, scripted score and Two islands focused suites | `75 passed (75)` |
| Second candidate protected simulations | `5 failed \| 269 passed (274)`, exit 1. FR-545 reported `expected 14 to be greater than or equal to 15` |
| Aggregate selected by name | `1 passed` with 72 seed tests skipped against the merged fixture |
| Two full `npm test` runs, lint, TypeScript, build and Playwright | Stopped before these release commands |
| Isolated `npm run test:perf` | No run and no candidate AI-planning p95 |

Evidence: [first protected run](../../.gate/codex/60/measurement.log) · [second protected run](../../.gate/codex/60/candidate.log). The next diagnostic is the first changed Order or settlement in the fixed Continent diplomat game that lost its peaceful win. The Large random diplomat game above belongs to a separate population.

## Bisect of the lost FR-545 win (2026-11-26, after attempt two)

Measured with the sim harness on the 24 fixed Continent diplomat games, one variant per run (scripts and outputs in the session scratchpad `diag` folder). Nothing committed.

| Variant | FR-545 wins | Lost seed | Valdoria sick meals (games) |
|---|---:|---|---|
| M18h `1cf9fd6` | 15 | | 54 (14) |
| Main / tests-first `8b0766c` | 15 | | 54 (14) |
| Attempt two (all changes) | 14 | 24 | 0 |
| Attempt two without the protein reservation | 15 | | 54 (14) |
| Main plus the protein reservation only | 14 | 24 | 0 |
| Attempt two without the m18i revision, the per-offer cars or the expansion forecast (each alone) | 14 | 24 | 0 |
| Starvation-only reservation (measurement only) | 15 | | 54 (14) |

Only the protein reservation (blocker 1) costs the win. Seed 24 chain: on turns 28–31 Valdoria has 6 experts, no Livestock, Fish or Canned Food in stock and 30 Grain. Its hubs collect 1 Fish and it has 15 cars. Its plan sets Fruit 2, Livestock 2 (none collected), Timber 6 and Cotton 4–8. The cars left go to Grain in tile order before the Fish, so one expert is sick on each of those turns (fed 5, sick 1). With the reservation the plan adds `fish: 1` and all 6 are fed. From turn 31 Valdoria produces and buys more: its embassy with minor-4 comes on turn 33 instead of 34, and on turn 36 it buys the 2 minor-3 Timber that Testland bought before. Minor-3 relations at turn 40 move Testland/Valdoria 39/38 → 38/40. The final Council moves 6–6 (Testland on standing, 2544 vs 2482) → 5–7 (Valdoria). FR-489 capital retention stays 24/24 in every variant measured. The starvation-only variant passes the tests-first freight tests but fails attempt two's test "uses one Livestock and one Fish before filling a Grain buffer with the two cars" (a sickness case).

## Shipped without the protein reservation (coordinator, 2026-11-26)

The commit keeps the `m18i` revision with its replay test (blocker 2), per-offer town cars (blocker 3), the expansion-aware final forecast (finding 4) and findings 5–10. `priorityPlan` takes the town offers directly, and the meal reservation is removed. Its two tests in `tests/engine/townFreight.test.ts` are `it.skip` with a pointer to the FR-545 decision. Their assertions are unchanged. All 72 generated games and the 24-seed Continent policies were compared with main `8b0766c`.

| Protected value (FR-627 / FR-628) | Merged M18i → Task 60 | Cause |
|---|---|---|
| FR-260 Order SHA-256, seeds 1–4 | `e33a4444…`, `1adcae4f…`, `5f169819…`, `d13e5609…` → `12711a8e…`, `2b44929c…`, `8a42689c…`, `481ffb80…` (the M18h digests) | Per-offer cars name only the town units a car takes, so the unshippable explicit Lumber leaves 132 Orders |
| FR-597 large diplomat 8 | submitted 573 → 577, townDelivered 58 → 64, scores [479,600,917] → [479,600,907] | On turn 31 Testland's province-nation-1-4 town ships Fabric before its second Lumber (delivered Fabric 0 → 1, Lumber 2 → 1) |
| FR-597 large diplomat group | submitted 6,386 → 6,390, towns delivered 92 → 98, turn-40 score minimum 917 → 907 | The same game |
| FR-628 72-game totals | delivered 344 → 350 of 778 (28 games, computer 190), accepted computer Orders 37,522 → 37,526 | The same game |
| FR-357 / FR-587 save lengths, NR-038 / FR-626 replay pins | As recorded above for the second attempt. They pass unchanged without the reservation | Per-offer cars and the `m18i` revision |

Unchanged against main: FR-545 15/24 (12 with a paid grant, 0 early), FR-489 24/24, the whole M13 acceptance table (FR-484–FR-546), FR-247, FR-260 scores, FR-125, FR-305, FR-464 and FR-497. The other 71 generated games match every recorded field.

## Gate (2026-11-26)

| Check | Result |
|---|---|
| `npm test`, run 1 and run 2 | "Test Files  186 passed (186)", "Tests  3595 passed \| 2 skipped (3597)", exit 0, no Errors line, both runs |
| `npm run lint` | "✖ 1 problem (0 errors, 1 warning)", the existing warning in `tests/engine/systems/logisticsSystem.test.ts` |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | "✓ Compiled successfully", "✓ Generating static pages (4/4)", exit 0 |
| `PORT=3124 npx playwright test --workers=1` | "1 failed", "182 passed (17.1m)": `e2e/m12-save.spec.ts:74` expected rules marker `m18h`, received `m18i` (the new revision). Re-recorded under FR-626 / FR-627; the spec re-run gave "4 passed (1.9m)" |
| `npm run test:perf`, last and alone | "Test Files  3 passed (3)", exit 0. FR-497 computerOrders p95 63.2 ms (max 452.4 ms, limit 100 ms) over 3,230 turns of 84 games; on the shared, loaded machine an A/B rerun of the FR-497 file alone gave main 8b0766c 50.4 ms and this branch 30.4 ms, so the rise from Task 57’s 24.6 ms is load, not the change |
