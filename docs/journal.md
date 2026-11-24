# Journal

## Resuming here

- M18 (play-test comfort, `docs/specs/m18-playtest-comfort.md`): M18a merged into main `af24381` (pull request 43), M18b part 1 (FR-563, FR-568, FR-569) in `5e80bab` (pull request 44), part 2 (FR-564 nation colours and flags) in `4098bfe` (pull request 45). NR-037 in progress.
- M18b part 3 (FR-565 Capital one section at a time, FR-566 city labour bar) is on `claude/m18b-capital`, local, not pushed: `731c797`, `3430434` and "M18b: Capital review cleanups". Full gate green on `3430434`, review approved. FR-567 and FR-570 next; icons wait for the art (spec section 3). Evidence in `.gate/claude/45/`.
- To try Demo: New game, Start Demo game; then Dashboard in the top bar (Economy, Military, Trade, Diplomacy, Council, Bug report).
- M17 merged into main `65a4d5a` (pull request 42). Its task evidence is in `.gate/codex/21/` to `.gate/codex/28/`.
- M16 part 1 merged in `9bd5a91`. The human can buy technology. The computer makes no purchases on main.
- M16b is parked. On `claude/m16b-technology` (`95634c6`), FR-523 resource gates plus the buyer brought FR-125 down to 1.286× (minimum 1.5×). On `claude/m16b-buyer` (`49406e9`), the buyer alone bought Streamlined Hulls on turn 3 and ordered a Clipper on turn 6 in all 24 idle games. The spending weakened the computer. FR-546 earned a minor vote in 10/24 (13 required) and FR-489 captured a player province in 15/24 (18 required).
- FR-547 (Q143) is the buyer branch's proposed value rule. Measure technology availability, purchase timing and the value of the first unlocked action in the original game before tuning. See `docs/verify-and-tune.md`.
- Task 19 passed the load trials and full gate on `claude/perf-tests`. Finish future gates with `npm run test:perf` alone. The measured results and six functional logs are indexed in `.gate/codex/19/summary.md`.
- To play M17 on continent seed 1, set Armaments and Fabric production to 1. Build a Ship-of-the-Line on turn 6, declare and sail on turn 7, set the site on turn 8, and land the four-ARMS army on turn 9. On turn 10 see the survivors at Sundmark and its colony vote in Council.

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

## 2026-11-23 Task 28 — naval measurement and intercepted landings

Size M. Count engagements for the campaign harness at battle resolution. Use the allied-cancellation casualty calculation for intercepted landings in the turn news.
FR-559 exercises seed 2849 across two turns of contact. FR-556 exercises three accepted orders on seed 2 and checks the landing report against the regiment destroyed at its origin.
Verify with the full local gate and the isolated performance suite. Preserve the FR-545, FR-546 and FR-125 campaign results.
Objection: repeating news on a quiet turn or inferring casualties before retreats finish would make the fix misleading.

| Claim | Evidence in `.gate/codex/28/` | Result |
|---|---|---|
| Both review findings reproduced on `b401e0e` | `red.txt` | “2 failed”. The quiet battle counted zero for both participants. The destroyed regiment's report said “Troops stayed at their origin.” |

## 2026-11-23 Task 25 — M17 second review

Size M. Share protected stock between expansion and defence, unify rail terrain, correct naval and land news, and pin the pre-battle save. A Frigate could delay recovery or change a Council vote, so rerun the frozen campaigns before committing.

| Claim | Evidence in `.gate/codex/25/` | Result |
|---|---|---|
| FR-485/557, 555, 552, 560 | `red-worker-reserve.txt`, `red-rail-news.txt`, `red-cancellation.txt`, `green-worker-reserve.txt`, `focused.txt` | The Frigate spent recruitment lumber, Coast admitted track, unchanged contact repeated news, and a lost regiment had no recorded fate in the cancellation. After the fixes, “28 passed” and “161 passed” across the two focused runs. |
| FR-558 historical replay | `fixture-provenance.txt`, `red-replay-oracle.txt`, `mutant.txt` | An injected extra lumber per warehouse passed the old test and failed against the recorded turn-3 position from `59fe854`. |
| Protected campaigns and review | `before*.txt`, `after.txt`, `protected.txt`, `review.md` | FR-545 15/24, FR-546 13/24, FR-125 minimum 903/563 before and after. Zero changed plans across 280 private-order checks. Independent review approved. |
| Local gate | `npm-test.txt`, `lint.txt`, `types.txt`, `build.txt`, `playwright.txt`, `perf.txt`, `roadmap.txt` | “3003 passed”, lint “0 errors, 2 warnings”, types and build exit 0, Chromium “139 passed”, isolated perf “2 passed” (FR-497 p95 21.2 ms), roadmap “PASS”. |

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

## 2026-11-21 Task 11 — M16 Technology (archived)

The [M16 part 1 journal archive](journal/archive-M16-part-1.md) records the original checkpoint, ten red tests, the seeded Clipper unlock and the full candidate's measurements.

## 2026-11-20 M15 implementation and review (archived)

[The M15 journal archive](journal/archive-M15.md) preserves Task 07's implementation, review and browser checks
and Task 09's original diplomat and Council replays. Task 10 records the owner's accepted 15/24 peaceful wins and 13/24 earned minor votes, each measured with the unchanged human policies.

## 2026-11-20 M14 A game that can end well (archived)

The final Council, peaceful campaign and UI review evidence are in [archive-M14.md](journal/archive-M14.md).

## 2026-11-20 M13 review fixes (PR 36, starting at fdbe870)

Size: M. Reproduce the eight findings in `.gate/codex/02/review.md` before changing the affected planner or test.
The consumers are the scripted Great Power, the Board's diplomacy forecast and the 24-seed simulation report.
Test rows cover FR-497 forecast and pre-order comparison, FR-489 conquest and recapture, FR-482 upkeep, FR-486 sales, FR-493 pair bidding and FR-500 report traceability.
Verify each reproduction separately, then run Vitest, ESLint, TypeScript, the production build and single-worker Chromium. Evidence goes in `.gate/codex/03/`.
Objection: a local improvement can change later simulated turns. Check the exact continent pins and the two-islands and FR-125 guards before committing.

Findings 1–2: the forecast now projects the viewer's current orders and cash only. It cannot infer payment of another nation's standing grant from that nation's private balance. Real End Turn settlement still uses both nations' orders. The fair-play probe uses the original state before applying a human order and the resulting state after all accepted orders.

Findings 3 and 7: separate armies can target one foreign conquest in a war of choice. They can recover home territory and retake that same objective. Retaking it starts a fresh peace-offer interval. Findings 4–6: campaign recruitment retries with the cheapest eligible regiment that leaves upkeep, optional migrants use surplus after planning trade with a new consulate, and the final hold buys the material missing from a pair. Finding 8: the 24-seed report identifies FR-500 in its Vitest title.

| Claim | Command | Result quoted |
|---|---|---|
| Rival cash changed the Board and planner | `vitest run tests/engine/partnerMarket.test.ts -t "private steel bid"` | `expected 'nation-2' to be 'nation-1'` (1-red.txt) |
| The old probe missed cash reserved by a bid | `vitest run tests/engine/sim/m13Acceptance.test.ts -t "cash reserved"` | `expected false to be true` (2-red.txt) |
| Two armies took two provinces; cross-turn and home-recovery controls also failed | `vitest run tests/engine/scriptedWar.test.ts -t "separate field armies\|losing its conquered\|reclaiming home"` | `Tests  3 failed \| 33 skipped (36)` (3-red.txt) |
| No affordable fallback recruit; optional migrant cost $1,800 of sales; last hold bought lumber | `vitest run` on scriptedArmy, scriptedWorkers and scriptedTrade, individually | `Tests  1 failed` in each of 4-red.txt, 5-red.txt and 6-red.txt. After fixes: `Tests  94 passed (94)` |
| New peace offer missing after recapture | `vitest run tests/engine/scriptedDiplomacy.test.ts -t "retaking the war aim"` | `Tests  1 failed \| 29 skipped (30)` (7-red.txt). War and diplomacy after fixes: `Tests  66 passed (66)` |
| Report title omitted its FR | `vitest run tests/engine/sim/m13Acceptance.test.ts -t "scripted report names"` | `to contain 'FR-500'` (8-red.txt and 8-runtime-red.txt) |
| M13 acceptance and pre-order probe | `vitest run --configLoader runner` | `m13Acceptance.test.ts (43 tests)`; `320 turns checked, 320 with orders of Testland in the state, 0 turns where Valdoria's plan changed without them` |
| FR-125 and two-islands pins on the integrated tree | Same full Vitest run | `t25 903/563 (1.60)` (lowest); `twoIslandsGolden.test.ts (2 tests)` |
| Unit suite on bundled Node v24.22.1 | `vitest run --configLoader runner` | `Tests  1 failed \| 2741 passed (2742)`. FR-330: `expected [ '★' ] to deeply equal []`. Node's Unicode 17 classifies the star differently. |
| Lint | `eslint` | `2 problems (0 errors, 2 warnings)`, `eslint exit 0` |
| Types | `tsc --noEmit` | `tsc --noEmit exit 0` |
| Production build | `next build --turbopack` | “Failed to fetch `Geist Mono` from Google Fonts.” Geist also failed. |
| Chromium | `PLAYWRIGHT_HTML_OPEN=never playwright test --workers=1` | `Process from config.webServer was not able to start. Exit code: 1`. The server requires npm. A separate launch of the configured browser returned `browserType.launch: spawn EPERM`. |

All eight numbered red logs are in `.gate/codex/03/`. The final focused probe/title run in `2-8-green.txt` reported `Tests  3 passed | 40 skipped (43)`. After reconnecting, Windows denied execution of the installed Node 22/npm toolchain. All five literal npm/npx invocations exited 1 before starting their tools (npm-*.txt and npx-*.txt). The unit, lint, type, build and browser commands above used the checked-in package configuration and installed CLI entry points with the bundled Node runtime. The default Vitest loader could not enumerate a parent directory, so the full run used its runner loader. No threshold, timeout or expected pin changed. Resume with the requested five commands in a session with access to Node 22/npm, the pinned Chromium and the build's Google Fonts. Commit locally only after all five pass.

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
They record the original failures to buy steel and win a minor vote, and the FR-541 lumber fix.
The close-out below records the replacement vote requirement and the final gate.

## 2026-11-20 M13 close-out (FR-539, FR-542, NR-035)

Size: L (milestone gate and review). FR-539 places the standing steel bid from turn 7. FR-541 continues to handle lumber. FR-542 keeps the grants and replaces the turn-30 vote target. Both replacement thresholds require 18 of 24 games. Q139 remains open before merge.

Review found that a pre-existing embassy could trigger an ineligible pact, including before the first Council. The planner now checks the meeting, relation band and rival score before proposing it. The acceptance measure now excludes Great Powers and colonised minors, and the vote spread uses the requested Council turn for every game. The simulator yields to Vitest between seeds so its worker can report progress during long runs. The games still run in seed order and the yield is outside the per-turn timing measurement.

The old and new continent pins and their reasons are recorded with FR-247, FR-481 and FR-499. The four FR-498 guard files match the starting commit. The changed planners read their own orders, public trade history, diplomacy and map state. The full suite includes the separate FR-497 test that removes the opponent's current orders and compares the plans.

Gate logs are in `.gate/codex/01/`. The first unit run timed out during ESLint startup. The passing run used `VITEST_MAX_FORKS=3` and `VITEST_MIN_FORKS=1`. The first Chromium run timed out reopening Details for bug reports on a busy machine. The full rerun used one worker after the other gates finished. Both original 30-second timeouts remained in force. The Chromium app checks started fresh games and used the normal controls to advance turns. The grant and Council check fixed the initial seeds to 11 and 1 respectively.

| Claim | Command | Result quoted |
|---|---|---|
| Regressions before the fix | `npx.cmd vitest run tests/engine/scriptedInfluence.test.ts tests/engine/sim/m13Acceptance.test.ts -t 'an existing embassy cannot\|a pact requires an eligible\|reads the turn of Valdoria'` | `Tests  3 failed \| 72 skipped (75)` |
| Initial focused run hit a Vitest worker timeout | `npx vitest run tests/engine/scriptedInfluence.test.ts tests/engine/sim/m13Acceptance.test.ts` | `Error: [vitest-worker]: Timeout calling "onTaskUpdate"` |
| First full unit run | `npm test` | `Tests  1 failed \| 2730 passed (2731)` |
| Unit suite | `VITEST_MAX_FORKS=3 VITEST_MIN_FORKS=1 npm test` | `Tests  2731 passed (2731)` |
| First browser run | `PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` | `128 passed (24.9m)` |
| FR-539 (Board) | `npm test` | `meets FR-539 (Board) idle 24 of 24 (required 18) min 10, median 12, max 12` |
| FR-539 (sold) | `npm test` | `meets FR-539 (sold) trader 24 of 24 (required 18) min 7, median 10, max 10` |
| FR-542 (i) | `npm test` | `meets FR-542 (i) idle 21 of 24 (required 18) min 23, median 24, max 26` |
| FR-542 (ii) | `npm test` | `meets FR-542 (ii) idle 18 of 24 (required 18) min 0, median 1, max 1` |
| FR-490 (replaced by FR-542) | `npm test` | `MISSES FR-490 (replaced by FR-542) idle 0 of 24 (required 18) min 0, median 0, max 0` |
| Fair play and planning time | `npm test` | `FR-497 rejected orders of Valdoria 0 (required 0), invariant breaks 0 (required 0), no-pay disbands in idle games 0 (required 0), computerOrders p95 35.3 ms and max 97.8 ms over 3360 turns of 84 games (p95 required <= 100)` |
| Lint | `npm run lint` | `✖ 2 problems (0 errors, 2 warnings)` |
| Types | `npx tsc --noEmit` | `npx tsc --noEmit exit 0` |
| Production build | `npm run build` | `✓ Compiled successfully in 21.1s` |
| Browser suite | `PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` | `129 passed (11.8m)` |
| Steel sale from the Board | `node .gate/codex/01/fr539-app.mjs` | `PASS FR-539: 10 turns, 3 offers, 3 steel sold to Valdoria, 0 browser errors` |
| Grant in the news and vote on the Council screen | `node .gate/codex/01/fr542-app.mjs` | `PASS FR-542: grant on seed 11 turn 27 and a Valdoria Other Minor Nations vote on seed 1 turn 40, zero browser errors` |
| Roadmap consistency | `node .gate/m12/L4-check-roadmap.cjs` | `PASS` |
