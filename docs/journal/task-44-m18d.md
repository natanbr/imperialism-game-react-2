# Task 44 — Fishing, river ports and the scripted railway

Size L · 2026-11-25 · `claude/m18d-terrain` · started at `607fc25`

The owner chose fishing for every game, including continuations of old saves. Task 44 fixes the engine defects and leaves the historical measurements in place for Task 45. The regression tests landed in `2591bd9`, before the production fix in `aba45d2`. Independent review added a second tests-only commit, `55a3ff7`, for the route planner and river embarkation.

## Why three rails ended on an ordinary tile at turn 15

FR-124 and FR-125 count a one-link rail tile as a dead end unless it is a capital, port or depot. The check allows temporary tips between measurement turns. The affected seeds were 1, 3 and 4, all at tile 18-11. Every rail order was accepted.

| Turn | Before the fix, with fishing | After the fix, with fishing |
|---|---|---|
| 6 | All four seeds join the first depot at 16-12. | Same. |
| 7 | The computer orders a depot at 18-12 with two sections to build. In a controlled seed-1 replay with the old logistics, it chose the five-section livestock route to 17-4. Both runs had $4,319 before the engineer acted and nine cans. Fishing gave it four Fish in stock and reduced its need for another meat source. | Same choice of 18-12. |
| 8–9 | The engineer finishes the depot. | Same. |
| 10–11 | Two sections join 18-12 to the railway. This frees the engineer three turns earlier than in the seed-1 replay without fishing. | Same. |
| 12 | Seeds 1, 3 and 4 start a $2,000 depot at 20-10. They have $2,490, $2,297 and $2,449 respectively. Seed 2 has $1,964 and waits. | All four wait. Five developers need $100 each for a level-one job. Starting the depot at those balances would spend part of their reserve. |
| 13–14 | Seeds 1, 3 and 4 finish building. Seed 2 starts on turn 13. | All four start on turn 13 with $3,601, $2,896, $2,645 and $3,514 respectively. |
| 15 | The three early starts lay 18-12 → 18-11. Each leaves a one-link tip at the checkpoint. | The depot finishes. All four seeds have two joined depots, five rail links and zero dead ends. |
| 16–18 | The three early starts reach 19-10 on turn 16 and join 20-10 on turn 17. | The engineer builds 18-12 → 18-11 → 19-10 → 20-10, one section per turn. The depot joins on turn 18. |

The engineer used to compare its cash only with the depot price, although FR-454 already set money aside for the developers. The new budget check applies when an economy without military upkeep starts a depot. A line already under construction keeps its priority. The boundary test covers both $2,499/$2,500 for five developers and $2,399/$2,400 for four. The same rule runs on every turn and seed.

Armed campaigns already reserve their upkeep on each order. Applying the civilian reserve as well delayed a depot on continent seed 8 at turn 25, with $2,427 cash and $200 current upkeep. It changed the turn-30 Council vote and ended the campaign ten turns early. Testland still held its capital, but FR-489 requires it to hold it through turn 40. Keeping the existing military spending rule restored 24/24 campaigns. A separate test exercises both sides of the military upkeep boundary.

## Port, terrain and save checks

- A connected port can collect ordinary land goods over rail during a blockade. Its fishing catch stops until an open water route returns. The tests exercise a coastal port, a river port with the blockade at its mouth, the capital and an explicitly authored Fish resource. They also check that a second open port keeps its own catch.
- With the map's undirected river overlay, a river port reaches the sea through contiguous river land under the nation's control. Breaking the channel or transferring the downstream province cuts the route. Freight, embarkation and relief use the same mouth. Building a new rail section that touches a river requires Iron Railroad Bridge along with the terrain's own technology. The route planner can reuse an existing crossing and can choose a legal dry detour.
- The Standard and Large random-map cases compare the actual catch with the sea hexes beside each capital. A generated coal seam is surveyed and developed on credit. A working mountain mine is placed in a generated province to exercise Square-Set Timbering, which M18e's generator cannot currently require by itself. The tests cover the acting nation's ownership, the end-of-turn technology purchase, the exact credit limit and a refusal one dollar below it. The merged spending validators already used `canAfford`.
- A separate store probe opened the committed pre-M17 v1 continent save at turn 2 with a pending order, checked the saved position and order, allocated Fish, advanced one turn, saved again and reloaded the same game state. Historical replay from the original start is a separate Task 45 item.

## Protected behavior

| Guard | Final measurement |
|---|---|
| FR-124 / FR-125 railway | Zero dead ends at all 12 seed/checkpoint combinations. The original rail checks are unchanged. |
| FR-125 score margin | The lowest ratio is **690/450 = 1.533×**, on seed 3 at turn 15. The existing minimum is 1.5×. |
| FR-545 / FR-546 Council | **15/24** peaceful wins. **17/24** games earned a voluntary minor vote. The latter passes its floor of 13 and differs from the previous measurement of 13. |
| FR-489 capital / FR-497 privacy | Testland held its capital through turn 40 in **24/24** idle games. Across **280** turns with private orders present, removing them changed **zero** computer plans. |
| FR-597 correctness | Both sizes, three human policies and 12 seeds each. **72/72** games finished, with **37,557** submitted computer orders, zero rejections, zero invariant violations, zero no-pay disbands in the 24 idle games, and **0/940** changed plans when private orders were removed. |

The shortage fixtures now control incoming freight as well as warehouse stock, so they can still exercise the food warning and the migrant's last can. The empty Transport fixture supplies no fishing ground. The FR-554 trade comparison explicitly allocates zero Fish to isolate the overseas purchase. The FR-391 comparison counts both land-hub production and fishing grounds. Existing start-world and freight expectations remain available for comparison.

## Task 45 handoff — all 55 remaining failures

| Suite | Failed cases | Difference |
|---|---:|---|
| `sim/randomMaps.test.ts` | 27 | Of 72 protected records, 45 still match. Fishing and the resulting computer plans changed scores, captures or diplomatic outcomes in the seeds below. Each failing case reached its final exact-record comparison. |
| `twoIslandsGolden.test.ts` | 1 | All four 40-turn order hashes moved. Order counts for seeds 1–4 are 562, 559, 561 and 563. Computer scores are 1,485, 1,353, 1,456 and 1,511. |
| `continentScore.test.ts` | 5 | Recruit upkeep schedules, armed and army-less score measurements, Council winners and the sources of their votes differ from the recorded campaigns. |
| `scriptedRail.test.ts` | 1 | The seed-1 turn-15 economic and rail totals differ. The separate dead-end assertion passes. |
| `v2Trade40.test.ts`, `scriptedInfluence.test.ts`, `sim/harness.test.ts` | 5 | One trade/treasury baseline, one diplomatic order sequence and three seed-1 campaign records moved. The harness differences are capture dates, workforce grades and wartime trader refusals. The trader still exchanges 14 units and now has one refused bid. |
| `startWorld.test.ts`, `systems/logisticsSystem.test.ts` | 5 | One starting-capital result and four old freight totals omit the new automatic Fish catch. |
| `scriptedScore.test.ts` | 1 | The FR-389 turn-6 fixture gains Fish. The planner still raises its Cotton allocation from two to three when that turn's rail joins the depot. All FR-125 checks in this file pass. |
| `ui/transportPopup.test.tsx` | 3 | The fixed-world row lists for the starting capital and the horse variant omit Fish, now an active food row. The genuine empty and custom-resource fixtures pass. |
| `store/legacyTechnology.test.tsx` | 4 | The pre-M16 reference snapshot, recruitment and staged oil order, checkpoint resave, and historical rejected-order replay compare against pre-fishing history. |
| `store/navalReplay.test.ts`, `store/m17CombatReplay.test.ts`, `store/randomMapReplay.test.ts` | 3 | The pre-M17 naval campaign and pre-engagement replay regenerate different historical states. The pre-M18e custom 400-turn session's digest also moved. The original saves and hashes are intact. |

| FR-597 map size | Idle seeds with a changed record | Scripted seeds | Diplomat seeds |
|---|---|---|---|
| Standard | 1, 2, 3, 4, 5, 6, 7, 12 | 4, 5 | 2, 6, 10 |
| Large | 1, 2, 4, 6, 8, 9, 10, 11, 12 | 5, 7, 12 | 5, 10 |

FR-616 explicitly names the two-islands goldens, random records, start-world/freight results and historical replays. The suite also contains older fixed-world measurements of those campaigns, including the continent, trade and diplomacy examples above. Task 45 can now compare each moved expectation with its recorded value. A replay that reconstructs a different saved position needs the FR-587 saved-position boundary before accepting its subsequent history.

## Verification and branch state

| Check | Observed result |
|---|---|
| Baseline `npm test` on `607fc25` | 3,399 passed, 69 failed. The original FR-582 file had four failures and one pass. The new depot-budget and independent-blockade controls also failed before the fix. |
| Final `npm test` on `08c0412` | 3,424 passed, 55 failed in 15 files. The inventory above accounts for every failure. |
| `npm run lint`, `npx tsc --noEmit`, `npm run build` | Lint exited 0 with one existing unused-variable warning. TypeScript exited 0. The production build exited 0 and generated 4/4 static pages. |
| Browser and performance | Playwright save/continue and rail checks passed 4/4 on this checkout at port 3144. The isolated performance suite passed 3/3. FR-497 computer planning p95 was 13.1 ms over 3,230 turns, against 100 ms. |
| Review and protected files | Independent review reproduced the river-planning and embarkation defects and verified both fixes. The M13/M14 run passed 48/48. Git shows no changes to the original FR-124/125 acceptance files, FR-464 goldens, M13/M14 guards, FR-597 records or historical store fixtures and replay tests. |

The branch and commits are local. Task 45 can start from this worktree. Merge readiness still depends on the recorded-value and replay work. The pre-existing untracked `.claude/launch.json` stayed outside the commits.

Local gate artifacts include the [full test output](../../.gate/codex/44/final-unit.log), [per-test results](../../.gate/codex/44/final-results.json), [browser checks](../../.gate/codex/44/browser.log) and [performance run](../../.gate/codex/44/perf.log).
