# M15 People and ships

## 2026-11-20 M15 review fixes (Task 09)

Size M. Restore the FR-509 opponent, trace the economy and fix Council purchases, horse income, upkeep notes and the browser timeout.
Q140, Nathan, 2026-11-20. Only a computer-controlled nation sets aside stock for future ships. An already-funded order still follows the common fleet-use rule.
Objection: the opposing computer still grows its fleet. The original diplomat improved from 7 to 15 wins, three short of 18.
Q141, Nathan, 2026-11-20. Open lawful Council priority on the previous meeting (turn 30 instead of 31), with the seller, price, productive demand, cash reserve and final-two-turn limits intact. Replace only the voluntary-vote threshold with the measured result if it misses 18.
Objection: seven seeds used the extra turn but it changed no qualifying vote. The requested FR-543 already names the final-winner HUD, and FR-544 already names the final-score rule.

| Claim | Command or evidence under `.gate/codex/09/` | Quoted result |
|---|---|---|
| FR-509/516 | `fr509-red.log`, `q140-replay-red.log`, `q140-replay-acceptance.log`, `q140-results.md` | Peaceful wins M14 24/24 → M15 8/24 → corrected bids 7/24 → Q140 15/24 (10 funded). Idle fleets qualified in 24/24. Removing both nations' preparation restored all 24 wins and gave 0/24 fleets. |
| FR-245/497, FR-517 | `council-red.txt`, `council-floor-red.txt`, `council-productive-red.txt`, `council-final-green.txt`; `armoury-red.txt`, `armoury-green.txt` | Council bids are capped by mill shortfall, price, available cash and supply. Final Council/trade tests 92 passed. Armoury 1 failed → 25 passed. |
| FR-518 upkeep, FR-515 timeout | `upkeep-red.txt`, `upkeep-trace.txt`, `e2e-timeout-policy-red.txt`, `e2e-timeout-green.txt` | Old tiles plus disabled ship planning reproduced all four original schedules. Browser limit 150000 → 30000 ms, 4 passed with screenshots. |
| FR-247 and FR-481 | `q140-trace-summary.txt`, `q141-focused-green.txt`, `q140-fr481-green.log` | Human production first differs on turn 3 or 4 by seed. Valdoria takes Arvelia on turn 16 instead of 18 on seed 1. The old/new Council windows had identical FR-247 states across all 160 turns. |
| FR-542(ii) | `fr542-matrix.txt`, `q141-idle.txt`, paired Q141 replays | Turn-40 voluntary vote: 21/24 with the bypass, 13/24 in each lawful window. No threshold changed while the replacement ID was unresolved. |
| Before the owner decisions | `unit-gate.txt`, `build-final.txt`, `playwright-final.txt` | 2,827 unit tests passed and two acceptance rows failed. TypeScript and production build passed; ESLint reported two warnings and Chromium passed 134 tests. |
| Owner unit gate and protected rows | `owner-unit-final.txt`, Vitest with the runner config loader | `2 failed \| 2828 passed (2830)`. FR-509 15/24; FR-542(ii) 13/24. FR-125 minimum 1.60; FR-497 p95 24.8 ms, zero rejected orders or invariant breaks. The FR-330 scan now explicitly includes the black star its existing assertion bans on Node 22 and 24. |
| Owner lint, types and build | `owner-lint-final.txt`, `owner-types-final.txt`, `owner-build-offline.txt`, `owner-font-verification.txt` | `0 errors, 2 warnings`; `tsc --noEmit EXIT 0`. Direct font download blocked. Cached production fonts: `Compiled successfully in 5.8s`, exit 0; all six emitted files matched SHA-256. |
| Owner browser gate, port 3123, one worker | `owner-headless-playwright.txt`, `owner-headless-runtime.txt`, `owner-browser-trace-summary.txt` | Pinned Chromium 141 was inaccessible. Chrome Headless Shell 131 reported `134 passed (11.8m)`. System Chrome 157 reported `14 failed` and `120 passed (12.2m)` on a console 404. The FR-529 trace identified `/favicon.ico`. |

## 2026-11-20 M15 People and ships (Task 07)

Size: L. Add University orders, civilian disbanding, merchant shipbuilding and continent horse ranches.
The Capital, Tile Info, Armoury, Board of Trade and scripted continent economy consume these rules.
T-01/10 [impl] [session:high] integrate the order and phase contracts and protect FR-518.
T-02/03 [test/impl] [GPT-6.2 Astra:high] [P] FR-511 fees, expert and refunds; FR-512 disband, cancel and next-turn worker.
T-04/05 [test/impl] [GPT-6.2 Astra:high] [P] FR-514 cargo and migration; FR-516 capacity history and 24 fixed seeds.
T-06/07 [test/impl] [session:high] [P] FR-517 placement, collection, minor supply; FR-518 untouched two-islands behaviour.
T-08/09 [test/impl] [GPT-6.2 Astra:high] [P] FR-513 civilian controls; FR-515 ship controls and cargo; FR-517 horse income; fixed-seed browser checks.
Verify individual reds, focused greens, the full unit/lint/type/build/browser gate, review and screenshot.
Objection: a larger fleet has little value if the market cannot use it. Measure actual completed trade and fleet growth.

Q125 (a), default taken. One expert and two paper for every civilian. Prospector $500, Miner $1,500, all others $1,000.
Objection: the middle fees are inferred. A second Engineer might be worth more.
Q126 (a), default taken. One starting Indiaman. Order one after three full phases out of four on the continent, no more than once per four turns.
Objection: ships compete with mill expansion for lumber.
Q127 (a), default taken. One ranch near each capital and one in Arvelia.
Objection: the hand-drawn map changes. The old capital rings have no open-range hex, so ranch siting must also preserve the starting food supply.
Q128 (a), default taken. Living minors move to M15b after M16.
Objection: the current minor buyers still demand just three finished goods.
Q129 (a), default taken. The computer builds no civilians in M15.
Objection: the human can build a second Engineer while the computer lays rail with one.

| Requirement | Red run, filtered by FR ID | Observed failure |
|---|---|---|
| FR-511 | `university.test.ts`, `10 failed` | The engine rejected University orders as invalid targets. |
| FR-512 | `university.test.ts`, `3 failed` | The engine could neither queue nor cancel a civilian disband. |
| FR-513 | Capital and Tile Info, `3 failed` | The University and the civilian Disband control were absent. |
| FR-514 | Shipyard and market, `4 failed` | No starting fleet record, build/refund, eighth hold, or v1 ship conversion. |
| FR-515 | Capital and Board, `2 failed` | No Shipyard controls or fleet composition. |
| FR-516 | Scripted trade, `2 failed` | No completed-cargo history or ship order at the threshold. |
| FR-517 | Horses, `2 failed`; Armoury, `1 failed` | Zero ranches, no horse offered by Arvelia, no Armoury income. |
| FR-518 | World boundary, `1 failed` | The continent had zero ranches as well as the frozen islands. |

Three ranches supply horses. There was no open range in either original collection ring. The ranches replace capital orchards at 2-10 and 14-10. The orchards at 3-8 and 15-8 start at orchard level two to keep food and developed levels viable. Arvelia's 10-5 replaces duplicate cotton. Both home horse stocks grow from 4 to 5 to 6. Both islands keep their historical geography.
A ship uses seven lumber and three fabric. The planner budgets the materials before mill expansion, bids for missing lumber from observable suppliers, and uses spare late-game cargo for industrial inputs sold by a free minor with an embassy. It protects six turns of pay around a planned war or when a field army's recent trade settles at half capacity or less. These decisions preserve the earlier army, workforce, market and Council targets.
Review found that a generic Developer could remove a ranch's yield. The common validator now refuses local and move-and-develop orders on ranches for either developer. Disbanding also clears stale selection at resolution and conceals pending foreign orders.
The shared cargo planner now considers a second eligible embassy when the first has already secured a vote or is boycotted. The reproduction failed before the fix. Focused regressions now cover priority over expansion and the exact half-used fleet threshold.
The two new capital ground pictures share one lossless map atlas. The pack originals remain available elsewhere. This preserves the first paint's 20-request and 2.05 MB limits.

| Claim | Command | Result quoted (evidence under `.gate/codex/07/`) |
|---|---|---|
| Fleet growth under ordinary play | `npx vitest run tests/engine/sim/m15Fleet.test.ts --reporter=verbose` | `24/24 fleets reached eight holds by turn 25, maximum 8 holds actually used` (`fleet-acceptance-final.txt`). A human seed-1 game also starts with normal stock, builds the ship, and settles eight holds. |
| Historical island orders and scores | `npx vitest run tests/engine/scriptedScore.test.ts tests/engine/twoIslandsGolden.test.ts tests/engine/twoNations.test.ts` as part of `integrated-pins-verified.txt`; Git blob comparison | `t25 903/563 (1.60)`, the lowest of the twelve ratios. Two-islands golden and twoNations blobs match 79a94b2 (`protected-blobs.txt`). |
| Peaceful Council strategy | `npx vitest run tests/engine/sim/m14Acceptance.test.ts --reporter=verbose` and an independent replay of seeds 25-48 | `24/24 games (required 18), 16 with a paid grant` (`green-diplomat-FR509.txt`). Holdout 22/24 wins, 16 funded, zero refused orders. The simulated human now funds an embassy before optional training and construction, and redirects cargo between minors through ordinary Board boycott orders. Every original acceptance assertion remains. |
| Art budget and true new-game startup | Single-worker Chromium, `browser-seed-guard.txt`; both atlas frames compared with the pack originals | `5 passed (57.2s)`, 20 art requests and 1,988,396 bytes. All 32 browser specs use the seed-1 fixture. All four UI restart paths verify the seed and turn in the autosave. |
| Computer fairness, solvency and time | `npx vitest run tests/engine/sim/m13Acceptance.test.ts --maxWorkers=1` | `43 passed (43)`, `computerOrders p95 26.1 ms and max 82.6 ms over 3220 turns of 84 games`. Zero rejected orders, invariant breaks or idle no-pay losses (`fr497-isolated.txt`). |
| Unit, engine, store and UI | `npm test`, four Vitest worker processes | `Test Files  131 passed (131)`, `Tests  2824 passed (2824)`, `Exit code 0` (`unit-final.txt`). |
| Lint and types | `npm run lint`, `npx tsc --noEmit` | `2 problems (0 errors, 2 warnings)` and `Exit code 0`. The two warnings also appeared on M14. TypeScript: `Exit code 0` (`lint-verified.txt`, `types-diplomat.txt`). |
| Production build | `npm run build` | `Compiled successfully in 4.7s`, `Generating static pages (4/4)`, `Exit code 0` (`build-verified.txt`). |
| Full seeded Chromium suite | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` | `133 passed (21.4m)`, `Exit code 0` (`playwright-final.txt`). University screenshot: `m15-university.png`. Eight settled purchases: `m15-eight-purchases.png`. |
| Roadmap and defaults | `node .gate/m12/L4-check-roadmap.cjs` | `PASS`, `Exit code 0` (`roadmap-final.txt`). Q125-Q129 each remain open and state the default taken. |
| Review and browser QA | Focused Vitest, seed-1 Chromium and pixel inspection (`review.md`, `ui-review.md`) | `149 passed (149)` across the integrated pins and boundary checks. The University, second Engineer, refunded order, disband, ship, eight settled purchases, ranch and horse income are exercised in `m15-people-ships.spec.ts`. |

Independent milestone review approved. Node execution in the default sandbox was blocked; these commands ran with the approved installed Node and Chromium. The first concurrent Next build and development-server run raced on generated route types. The final build ran separately.
