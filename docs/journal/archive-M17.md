# M17 Sea war and reach, with Task 19 before it

Moved from docs/journal.md on 2026-11-24, oldest first.

## 2026-11-22 Task 19 — Separate the timing checks

Size M. Run wall-clock assertions alone and keep functional coverage in the normal gate.
- Change and consumers — give contributors a one-worker performance command, batch the engine lint cases, and prepare a real turn-2 save for the New Game browser check.
- Coverage — FR-481 and FR-497 retain the original timing limits and simulation inputs. FR-001/002/080 retain every prohibited and permitted case. FR-109 exercises Keep playing and Start new game.
- Verify — run three pairs of concurrent `npm test` processes, then lint, types, build, Chromium, the roadmap checker and finally `npm run test:perf` alone.
- Prior failures — Task 15 recorded `Test timed out in 30000ms` on the first engine lint case and `Test timeout of 30000ms exceeded` waiting for the turn-2 HUD during FR-109 setup. Task 19 was requested after FR-497 measured 155–177 ms under load against its 100 ms limit.
- Objection — a separate command can be overlooked. The documented gate includes it as the final step.

| Claim | Command or evidence in `.gate/codex/19/` | Quoted result |
|---|---|---|
| Three load trials, two full functional suites per trial | Six `npm test` logs, `pair-final1-primary.log` through `pair-final3-load.log` | Every run printed `136 passed (136)` files and `2871 passed (2871)` tests. Each pair overlapped for at least 224 seconds. The FR-497 private-order comparisons passed, with zero rejected orders, invariant breaks and idle no-pay disbands. |
| FR-001/002/080 engine rules | `lintGuard-before.txt`, the six paired runs and `wiring.log` | The first cold probe loaded the full Next.js lint configuration, and each of 17 cases created a new ESLint instance. Batching alone still took 15–17 s in the first trial. One batch against the shared engine config took 2.67–3.62 s under load, with the original 30 s limit. The wiring check printed `PASS` for the production rules and parser. |
| FR-109 setup and both New Game choices | Focused Chromium, `fr109.log` and `fr109-load.log` | The old setup waited for the map and a live turn to resolve and render inside the test's 30 s budget. The new setup restores a real seed-1 turn-2 save. `1 passed (14.5s)` alone and `1 passed (19.8s)` during a load trial. The latter browser case took 3,516 ms. |
| Static gates and roadmap | `npm run lint`, `npx tsc --noEmit`, `npm run build`, `node .gate/m12/L4-check-roadmap.cjs` | Lint `2 problems (0 errors, 2 warnings)`. Types and build `EXIT 0`. Roadmap `PASS` against main `9bd5a91`. |
| Full browser gate | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` | `135 passed (8.5m)` |
| Wall-clock thresholds, one worker after Chromium exited | `npm run test:perf` | `2 passed (2)`. FR-497 recorded `computerOrders p95 13.1 ms and max 42.2 ms over 3210 turns of 84 games` (p95 ≤100 ms). FR-481 recorded `0.6 s over 40 turns` (limit <15 s) and a maximum plan of 42.3 ms (limit <5,000 ms). |

## 2026-11-22 Task 20 — Plan sea war and reach (T15)

Size L. FLOW stages 1–2. Plan a normal-game landing on Sundmark, relief of a threatened port and rail deployment under the existing score, Council, war and replay guards. Allocate NR-036, FR-548–559 and Q144–146.
- Suggested defaults for owner review — Q144 one sail to a reachable coast (Objection: distances collapse). Q145 greater firepower drives the other fleet home (Objection: ignores range and losses). Q146 defend a visible port threat (Objection: an island campaign can go unchallenged). Each card names an original-game play-test.
- Handoff — on `claude/m17-spec` in worktree `imperialism-game-revival-fee36d`. The spec, requirements and local roadmap are ready for review. The next run starts with T-01. The running game is still the baseline.

| Claim | Command or evidence in `.gate/codex/20/` | Quoted result |
|---|---|---|
| Commercial fleets and campaigns on `df047ac` | Vitest fleet/war and trade/UI commands in `baseline.md` | `266 passed (266)` and `295 passed (295)`. Fleet 24/24 at eight holds, FR-489 capture 21/24. |
| Island route and peaceful Council | Vitest `landRoute.test.ts` and `m14Acceptance.test.ts`; see the M17 baseline table | `war on minor-2: no-land-route`, likewise Lorran and Pellis. Diplomat `15/24 games`. `26 passed (26)`. |
| Frozen guards | `m13-guard-run.txt` and score/golden repeat in `baseline.md` | FR-542 (i) `23 of 24`, FR-546 `13 of 24`, FR-125 minimum 903/563. Four golden logs matched. |
| Roadmap and spec | `node .gate/m12/L4-check-roadmap.cjs`, `roadmap-check.txt` | `cards 143 ... findings 160 ... main df047ac`, `PASS`. All 12 FRs remain planned. |

## 2026-11-22 Task 21 — Sea war and reach

Size L. Follow the [M17 lane plan and per-row test contracts](specs/m17.md#4-plan-for-one-implementation-run), T-01 through T-13.
- Change and consumers — Shipyard commissions warships. Diplomacy, Army and the scripted defender submit editable Orders. Combat, collection, replay and the campaign harness consume the resolved state.
- Row tests — FR-548/549/552 hulls, sailing and engagement. FR-550/551/553/554 reach, reservations, battle and freight. FR-555 rail. FR-556/557 controls and public defence. FR-558/559 saves, paired campaigns and frozen guards.
- Verify — capture each red first, rerun protected campaigns, then functional tests, lint, types, build, Playwright and isolated performance. Review the diff and inspect the app before a local commit.
- Objection: buying even one Frigate can displace production and lose a deciding Council vote. Measure FR-545 and FR-546 before and after and stop on a decline.
- Owner decisions (2026-11-22) — Q144 one sail on connected water, then one turn establishing a site. Q145 the larger firepower sends the weaker squadron home intact, a tie blocks landing. Q146 defend only a publicly threatened port using commissioned ships or one affordable Frigate.

- Three-power contacts use descending firepower, then nation and fleet IDs to settle simultaneous arrivals consistently. The final surviving forces determine which sites can dispatch.
- Review regressions cover mixed sea/land attribution, declining an eligible landing, relief on the final turn using existing stocks, station invalidation by peace and simultaneous multi-power contact. Funding the defensive Frigate follows the ordinary production, trade and army commitments.

### Tests first

Each row has its original failing output in `.gate/codex/21/red-FR-<number>.txt`. The subsequent focused runs exercise the accepted Orders, resolved state and public events.

| FR | Test file | Red observation |
|---|---|---|
| 548 | `tests/engine/navalFleet.test.ts` | Paying for a Frigate returned `invalid-target`. |
| 549 | `tests/engine/navalFleet.test.ts` | A connected sail returned `invalid-target`. |
| 550 | `tests/engine/seaArmy.test.ts` | A commissioned squadron and port army still returned `no-land-route`. |
| 551 | `tests/engine/seaArmy.test.ts` | A supported overseas deployment returned `not-adjacent`. |
| 552 | `tests/engine/navalFleet.test.ts` | Opposing squadrons emitted zero engagements, expected one. |
| 553 | `tests/engine/seaArmy.test.ts` | An otherwise qualified, stored sea sortie produced zero land battles. |
| 554 | `tests/engine/seaArmy.test.ts` | An isolated blockaded port delivered 3 cotton, expected zero. |
| 555 | `tests/engine/railDeployment.test.ts` | Four cars permitted one ARMS and a full reservation accepted another regiment. |
| 556 | `tests/ui/capitalDialog.test.tsx` and `e2e/m17-sea-war.spec.ts` | The Shipyard lacked the accessible Build one more Ship-of-the-Line control. |
| 557 | `tests/engine/navalDefence.test.ts` | An active port threat returned zero defensive build or sail orders. |
| 558 | `tests/store/navalReplay.test.ts` | The store refused the first warship Order in a midturn replay. |
| 559 | `tests/engine/sim/navalCampaign.test.ts` | The harness observed zero resolved turns, expected turns 1 and 2. |

### Checkpoint evidence

| Claim | Command | Result quoted |
|---|---|---|
| Before, at `13d75ab` | Vitest M13/M14/M15 acceptance, scriptedScore and twoIslandsGolden, verbose (`guards-before.txt`) | `100 passed (100)`. Diplomat `15/24 games`, minor vote `13 of 24`, minimum `903/563 (1.60)`. |
| Q144, Q145, Q146 recorded | `node .gate/m12/L4-check-roadmap.cjs` | `PASS` |
| Identical frozen economies | `python .gate/codex/21/compare-campaigns.py` (`paired-campaigns.md`) | `48 paired campaigns, 1920 paired turns, 0 changed turns.` Both nations, idle/diplomat seeds 1 through 24. |
| UI, battle results, restored freight and phone rail | Focused Chromium `m17-sea-war.spec.ts` (`e2e-FR-556.txt`) | `3 passed (30.9s)`. Interception kept the troops at origin. Port collection recovered from 0 cotton to 3. |
| New Game, funded Ship-of-the-Line, colony and Council | Fresh Chromium run (`e2e-FR-556-new-game.txt`) | `1 passed (28.7s)`. The seed-1 ordinary production Orders supply the ship, survivors occupy Sundmark, its colony casts one vote. |
| Protected campaigns after implementation | `npm test` (M13/M14/M15 acceptance, scriptedScore, twoIslandsGolden) | Diplomat `15/24 games`, FR-546 `13 of 24`, FR-125 `903/563 (1.60)`. FR-542 (i) `23 of 24`, FR-489 captures `21 of 24`, FR-516 `24/24 fleets reached eight holds by turn 25, maximum 8 holds actually used`. |
| Functional suite | `npm test`; final tree `npm test -- --maxWorkers=4` | `2963 passed (2963)`, then `2964 passed (2964)` including the added three-power news assertion. Both runs exited 0. |
| Privacy and invariants | `npm test`, strengthened FR-557 and news rerun in `final-privacy-news.txt` | `0 turns where Valdoria's plan changed without them` over 280 turns. Zero rejected computer orders, invariant breaks or idle no-pay disbands. With a public threat, all three private Order edits were accepted and the plan stayed identical. |
| Lint and TypeScript | `npm run lint`; `npx tsc --noEmit` | `2 problems (0 errors, 2 warnings)`; `EXIT 0`. Warnings in unchanged useTransportAllocations and logisticsSystem test. |
| Production build | `npm run build` | `Compiled successfully in 5.9s`, `Generating static pages (4/4)`, `EXIT 0`. Next reported multiple workspace lockfiles. |
| Full Chromium suite | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` | `138 passed (10.8m)`; `EXIT 0`. Report in `.gate/codex/21/playwright-html/`. |
| Isolated timing gate after Chromium | `npm run test:perf` | `2 passed (2)`. FR-497 `p95 12.2 ms and max 42.5 ms over 3210 turns of 84 games` (100 ms limit). |

The first full runs exposed missing fleet Order coverage in FR-003, a tile-only writer guard matching squadron construction, and a Vitest worker reporting timeout. The Shipyard uses the typed squadron factory, FR-003 exercises a commissioned Frigate, and the 48-campaign harness yields between games. The original timeouts and guarded rows are intact.

Independent review approved after the three-power contact, same-turn peace, final-turn defence and landing measurement fixes. The review reran 18 regressions and independently compared both nations in all 1,920 paired turns. See `.gate/codex/21/review.md`. A further check asserts that each private rival Order is accepted, including a funded Shipyard edit, before comparing the defender's complete plan.

The earlier headless seed-1 exercise attacks on turn four and loses the battle. It has two eligible turns and attempts one landing. The browser's turn-nine landing wins. In the two-power relief exercise a public threat on turn three funds one Frigate. Turn four produces an equal-firepower interception, zero land battles and a reopened port. With the same war and an unthreatened port, the computer orders zero hulls. In the matched turn-five snapshots, the defender produced four units with relief and eight in the control. Each carried four commercial units and paid $100 upkeep. See the per-turn commodity and treasury records in `.gate/codex/21/paired/`.

## 2026-11-23 Task 23 — M17 review and Q145

Size L. Resolve the seven Task 22 findings, then implement FR-552/560 and their public news under FR-556. Preserve the campaign guards, save compatibility and golden inputs. Objection: a defensive Frigate can delay the turn-five Indiaman; reserve the Q140 materials before purchasing it.

| Claim | Command or evidence under `.gate/codex/23/` | Result |
|---|---|---|
| Unchanged campaign and score baseline | `baseline.txt` (M13/M14, scriptedScore, twoIslandsGolden) | "98 passed (98)"; FR-545 15/24, FR-546 13/24, lowest FR-125 903/563 on seed 3 turn 25. |
| Contested and Coast ports, water separation, full freight capacity | `red-ports-rail.txt`, `green-ports-rail.txt` | "5 failed" before; "65 passed (65)" after. The 15-car run delivers five more units than its 10-car control. |
| Merchant reserve, relief arrival and physical port count | `part-a-2-6-7-red.log`, `part-a-6-summary-red.log`, `part-a-2-scenario-stock.log` | "3 failed" before. On turn three the original exercise has 10 lumber, 7 reserved. The funded relief case adds the cost of one Indiaman to starting stock. |
| Part A targeted regressions and guards | `part-a-2-6-7-green.log`, `guards-part-a.txt` | "101 passed (101)"; FR-545 15/24, FR-546 13/24, FR-125 903/563; zero private-order effects in 280 turns. |
| Part A gate | `part-a/{npm-test,lint,types,build,playwright,perf,roadmap}.txt` | "2973 passed (2973)"; lint 0 errors and 2 pre-existing warnings; types and build exit 0; "138 passed"; "2 passed (2)" for isolated performance; roadmap "PASS". |
| Seeded battle, allied priority and survivor damage | `red-fr552.log`, `red-allied.txt`, `fr552-final-focused.log`, `green-q145-news.txt` | "8 failed" and "5 failed" before; "59 passed" and "115 passed" in overlapping focused runs. |
| Older battles retain their result through Continue and replay | `red-fr558-historical.log`, `green-fr558-historical.log`, `delta-review.md` | "2 failed" before; "56 passed (56)" after. The reviewer replayed the original full-hull save and two later turns. Divergent pre-Q145 sessions keep the original log and replay forward from their saved position. |
| News in the running app | `q145-focused-browser.txt`; `q145-battle-report.png`, `q145-cancelled-attack.png` | "2 passed (31.7s)"; the report shows remaining hull and retreat, and cancellation names the captor and origin. |
| Final guards | `guards-after.txt`, `protected-files.txt` | "98 passed (98)"; FR-545 15/24, FR-546 13/24, lowest FR-125 903/563 (1.603908×), FR-497 0 changed plans in 280 turns. Frozen policies, goldens and timeouts byte-matched the starting commit. |
| Final gate | `part-b/{npm-test,lint,types,build,playwright,perf,roadmap}.txt` | "2997 passed (2997)"; lint "0 errors, 2 warnings"; types and build exit 0; "139 passed (12.0m)"; isolated performance "2 passed (2)", FR-497 p95 14.0 ms over 3,210 turns; roadmap "PASS". |

## 2026-11-23 Task 25 — M17 second review

Size M. Share protected stock between expansion and defence, unify rail terrain, correct naval and land news, and pin the pre-battle save. A Frigate could delay recovery or change a Council vote, so rerun the frozen campaigns before committing.

| Claim | Evidence in `.gate/codex/25/` | Result |
|---|---|---|
| FR-485/557, 555, 552, 560 | `red-worker-reserve.txt`, `red-rail-news.txt`, `red-cancellation.txt`, `green-worker-reserve.txt`, `focused.txt` | The Frigate spent recruitment lumber, Coast admitted track, unchanged contact repeated news, and a lost regiment had no recorded fate in the cancellation. After the fixes, “28 passed” and “161 passed” across the two focused runs. |
| FR-558 historical replay | `fixture-provenance.txt`, `red-replay-oracle.txt`, `mutant.txt` | An injected extra lumber per warehouse passed the old test and failed against the recorded turn-3 position from `59fe854`. |
| Protected campaigns and review | `before*.txt`, `after.txt`, `protected.txt`, `review.md` | FR-545 15/24, FR-546 13/24, FR-125 minimum 903/563 before and after. Zero changed plans across 280 private-order checks. Independent review approved. |
| Local gate | `npm-test.txt`, `lint.txt`, `types.txt`, `build.txt`, `playwright.txt`, `perf.txt`, `roadmap.txt` | “3003 passed”, lint “0 errors, 2 warnings”, types and build exit 0, Chromium “139 passed”, isolated perf “2 passed” (FR-497 p95 21.2 ms), roadmap “PASS”. |

## 2026-11-23 Task 28 — naval measurement and intercepted landings

Size M. Count engagements for the campaign harness at battle resolution. Use the allied-cancellation casualty calculation for intercepted landings in the turn news.
FR-559 exercises seed 2849 across two turns of contact. FR-556 exercises three accepted orders on seed 2 and checks the landing report against the regiment destroyed at its origin.
Verify with the full local gate and the isolated performance suite. Preserve the FR-545, FR-546 and FR-125 campaign results.
Objection: repeating news on a quiet turn or inferring casualties before retreats finish would make the fix misleading.

| Claim | Evidence in `.gate/codex/28/` | Result |
|---|---|---|
| Both review findings reproduced on `b401e0e` | `red.txt` | “2 failed”. The quiet battle counted zero for both participants. The destroyed regiment's report said “Troops stayed at their origin.” |
