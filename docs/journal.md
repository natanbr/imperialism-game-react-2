# Journal

## Resuming here

- M16 part 1 is reviewed and gated on the local `claude/m16-technology` branch, one fix commit after `b75d196`. All 2,872 unit tests and 135 Chromium tests passed. Reproductions, screenshots and gate logs are in `.gate/codex/13/`.
- M16b is planned for FR-523, FR-527, FR-528 and the cotton development path of FR-526. The full candidate stays parked at `f8470ba`. Its measured balance results are in `.gate/codex/11/balance.md`.
- To see part 1, open Capital, buy Streamlined Hulls on turn 3 and order a Clipper with 6 lumber and 2 fabric on turn 4.

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

## 2026-11-20 M14 review fixes (Task 06)

Size: M. Reproduce the three findings against `a1f3e74`, then correct the turn-40 test setup, Council forecast and finished-game scores.
The affected screens are the Council forecast and voting rules, Nation and Final Scores.
Test FR-507's turn-40 path with a fixed seed, FR-543 with a below-threshold election, and FR-544 with a finished save whose score differs under M14.
Verify each red and green result, then run Vitest, ESLint, TypeScript, the production build and single-worker Chromium on port 3123.
Objection: fixing the seed could hide an early election. Preserve the turn-40 assertions and the separate early-election coverage.

| Claim | Command or evidence in `.gate/codex/06/` | Quoted result |
|---|---|---|
| Random games could finish early. Six scenarios now use seed 1. | Playwright on the two turn-40 cases with seed 63174040, then all six fixed-seed cases. Commands in `e2e-seed-audit.md`. | `2 failed` expecting `Turn: 31 of 40` after `Game over after turn 30 of 40` → `6 passed (3.5m)` |
| The forecast used the ordinary threshold after the engine had elected a winner. It now reads the vote result. | Focused Vitest, `council-red.txt` and `council-green.txt` | `4 failed` → `197 passed`. The final 5–4 forecast now says `Testland wins on votes`. |
| Nation and the HUD recalculated finished scores. Both now use the recorded score table. | Finished M13 seed 1 in `3-m13-red.txt` and `3-m13-green.txt`. UI regression in `3-red.txt` and focused suite in `3-green.txt`. | `Nation: 1363` → `Nation: 1443`, matching Final Scores. `1 failed` → `104 passed`. |
| Unit suite and balance | `npm test` and baseline blob comparison in `balance.txt` | `Tests  2774 passed (2774)`. Lowest FR-125 ratio `t25 903/563 (1.60)`. Both original two-islands test blobs match `a1f3e74`. |
| Lint, types and production build | `npm run lint`, `npx tsc --noEmit`, `npm run build` | `2 problems (0 errors, 2 warnings)`, types `Exit code 0`, build `Compiled successfully in 8.7s`, `Generating static pages (4/4)`. |
| Full browser gate | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` | `132 passed (9.6m)`, `Exit code 0`. |
| Production browser check | `npx playwright test --config=.gate/codex/06/app-check.config.ts --workers=1` | `Final Scores — Valdoria 1443`, `Nation — Valdoria 1443`, `Testland 5, Valdoria 4, abstain 3 of 12; Testland wins on votes`. `2 passed (8.3s)`. |

The independent delta review found no blocking issues (`review.md`). The workspace sandbox denied Node execution. All gate commands ran on the approved installed Node v22.22.0.

## 2026-11-20 M14 A game that can end well

Size: L. Resolve the final Council, make a peaceful election possible, and explain the result and conquered development.
Consumers are End Turn, Council projections, HUD, Tile Info, How to play, final standings and version-1 saves.
Plan: confirm FR-501 to FR-510, capture individual red logs, implement engine, UI and simulation tasks, run the full gate, independent review and browser QA.
Verify with Vitest, lint, TypeScript, production build, single-worker Playwright on port 3123 and the roadmap check.
Objection: a passive player can now lose early, and a final tie may be decided by the same land it won in battle.

| Task | FR | Test assertion |
|---|---|---|
| T-01/02/03, Council | FR-501 | Only the last meeting removes the relation floor and breaks ties. A minor at war with both abstains. |
| T-02/03, Council | FR-502 | A final result records threshold, vote count or standing, with intent order for an exact tie. |
| T-02/03, Council | FR-503 | 7 of 12 elects with two Great Powers. Three or more require a strict two-thirds majority. |
| T-04/05, UI | FR-504 | The winner ranks first. All nations have score, provinces, strength and standing. |
| T-02/03, score | FR-505 | Only collected conquered levels count. Restoring home land restores its score. Jobs retain their points. |
| T-04/05, UI | FR-506 | HUD, Council and How to play use the current threshold and final scheduled turn. |
| T-04/05, UI | FR-507 | Continue a turn-39 save, play the final Council, then view the same result in final standings. |
| T-04/05, UI | FR-508 | On two-islands a turn-limit result names the best score. |
| T-06, simulations | FR-509 | Use 24 seeds per policy. Idle loses, a diplomat wins peacefully, and aggressor ends by conquest or Council. |
| T-02/03, baselines | FR-510 | Pin actual continent outcomes and preserve the original two-islands orders and scores. |

### Defaults taken before implementation

- Q120 (a), default taken. At the final Council each free minor votes by relations with no 50-point floor. War with both nominees forces an abstention.
  Objection: Even two weak nations now produce a final winner.
- Q121 (a), default taken. With fewer than three Great Powers a strict majority elects a nominee (7 of 12). Three or more retain the two-thirds rule.
  Objection: This departs from the original threshold and lets a computer win before turn 40.
- Q122 (a), default taken. A tied final vote uses standing, then intent order.
  Objection: Holding land helps win a tied vote through its standing bonus.
- Q123 (a), default taken. Conquered development counts only where the owner can collect the tile.
  Objection: A connected depot restores those points and the province still adds standing.
- Q124 (a), default taken. On a world without provinces the turn limit names the nation with the best score.
  Objection: Score alone decides the test world and is only one part of standing on the continent.

### Red runs before the corresponding implementation

Each log is in `.gate/codex/04/`. The per-row filters exclude tests belonging to other rows.

| FR | Log | Vitest summary |
|---|---|---|
| FR-501 | `red-FR-501.txt` | `Tests  2 failed \| 66 skipped (68)` |
| FR-502 | `red-FR-502.txt` | `Tests  4 failed \| 64 skipped (68)` |
| FR-503 | `red-FR-503.txt` | `Tests  1 failed \| 67 skipped (68)` |
| FR-504 | `red-FR-504.txt` | `Tests  2 failed \| 97 skipped (99)` |
| FR-505 | `red-FR-505.txt` | `Tests  3 failed \| 1 passed \| 16 skipped (20)` |
| FR-506 | `red-FR-506.txt` | `Tests  3 failed \| 96 skipped (99)` |
| FR-507 | `red-FR-507.txt` | `Tests  4 failed \| 95 skipped (99)` |
| FR-508 | `red-FR-508.txt` | `Tests  1 failed \| 98 skipped (99)` |
| FR-509 | `red-FR-509.txt` | `Tests  4 failed \| 1 passed (5)` |
| FR-510 | `red-FR-510.txt` | `Tests  1 failed \| 67 skipped (68)` |

### Verification and balance

All three policies played seeds 1 through 24. Every idle game elected Valdoria. Every diplomat game elected Testland with seven votes on turn 40. Each diplomat opened four consulates in four turns, kept its army on home soil, declared no war and paid one to five $1,000 grants. The human policy starts from the regular game and buys the first embassy at the scripted time and price. It favours a free minor whose support is contested, using public relations and borders. Grants require an established embassy and $3,000 left after payment. All 24 aggressor games ended at Council. The separate conquest test exercises a capital falling on a meeting turn.
The identical final diplomat policy won 0/24 on the original M13 Council. Its contract tests still passed in that comparison (`red-FR-509-final-policy.txt`, `red-FR-509-final-policy-provenance.txt`). M13's voluntary minor-vote measure still reaches 18/24 under the original 50-point rule. The simulation records these separately from compulsory ballots.
For the four world-market continent baselines, the final Testland/Valdoria votes are 6/6, 4/8, 7/5 and 4/8. The first is decided by Valdoria's standing. Excluding uncollected development changes Valdoria's final scores on seeds 1 and 3 from 1,443 to 1,363 and from 1,477 to 1,367. Each displaced pin names its old and new result. FR-125 and FR-464 keep their original test files.
The independent review checked all ten rows and the old-save paths. Its fixes cover legacy score ordering, the Development tooltip, diplomat contract checks, the HUD threshold, and the Diplomacy facts shown after the last vote. The final scroll check put the longer Nation explanation behind a keyboard-operable disclosure. Review evidence is in `.gate/codex/04/review.md`.

### App checks

- HUD and How to play (QA 1-2): at 1280 px the threshold and next meeting both fit. The last digit of the turn ends at x311 inside the edge at x345. The full rule is also readable in Nation.
- Continue and final Council (QA 3-5, 9): load turn 39, resolve turns 39 and 40, then see all governors vote, 6-6. Valdoria wins by standing (2,111 against 998). The final-scores button stays visible at 1280x720 and 800x600. The next screen says Defeat and ranks Valdoria first. Screenshot: `.gate/codex/04/m14-last-council.png`.
- Arvelia (QA 6-7): real declare, march, attack and conquest on turn 2. On turn 3 the HUD went from 239 to 238, with 11 uncollected levels and zero additional development points. Tile Info explains the missing points. See `qa-turn2-score.txt`.
- Early peaceful election (QA 8): Continue a crafted six-vote turn-10 save, pay Pellis $1,000 in Diplomacy, then End Turn. Testland wins 7/12. The 24 fresh diplomat games above all won at the last meeting.

| Claim | Command | Result quoted |
|---|---|---|
| Unit and integration gate | `npm test` | `Test Files  127 passed (127)`, `Tests  2771 passed (2771)` |
| Lint | `npm run lint` | `2 problems (0 errors, 2 warnings)`, exit 0 |
| Types | `npx tsc --noEmit` | `Exit code 0` (no diagnostics) |
| Production build | `npm run build` | `Compiled successfully in 7.5s`, `Generating static pages (4/4)`, `Exit code 0` |
| Browser gate | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` | `132 passed (13.7m)` |
| Original two-islands guards | `npx vitest run tests/engine/score.test.ts tests/ui/scoreExplained.test.tsx tests/engine/provinces.test.ts tests/engine/scriptedScore.test.ts tests/engine/twoIslandsGolden.test.ts` | `Tests  87 passed (87)`, `t25 903/563 (1.60)` |
| FR-509 acceptance | `npx vitest run tests/engine/sim/m14Acceptance.test.ts --reporter=verbose` | `24/24 games (required 18), 24 with a paid grant and 0 before the last meeting`, `Tests  6 passed (6)` |
| FR-507 Continue and early election | `npx playwright test e2e/m14-endgame.spec.ts --workers=1` (port 3123; first two scenarios) | `2 passed (33.3s)` |
| FR-505 played conquest | `npx playwright test --config=.gate/codex/04/qa-score.config.ts --workers=1` (port 3123) | `FR-505 HUD before attack: Score: 239 after conquest: Score: 238 current turn: 3` |
| Roadmap | `node .gate/m12/L4-check-roadmap.cjs` and `node .gate/codex/04/check-report.cjs` | `PASS`, `M14 rendered as Built locally; five default-taken cards remain open.` |

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
