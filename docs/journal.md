# Journal

## Resuming here
- 2026-11-17: M12b Better HUD is merged (pull request 35, main 74f595c). M13 Computer nations that play (FR-481 to FR-500,
  FR-538 to FR-541; cards Q114 to Q119 built as their defaults) is built on `claude/m13-nations` in three commits ("M13: computer
  nations that play (FR-481..500)", "M13: review fixes", "M13: QA fixes and final gate"), not pushed, no pull request yet.
- TWO ROWS ARE BLOCKED, their tests red in the suite (not skipped, not loosened), and the by-eye QA saw both in the app:
  FR-490 (grants before a Council, 0 of 24 games, card Q117: no embassy, so no grant) and FR-539 (the computer's steel bid toward
  the player, Board 0 of 24, sold 1 of 24, new card Q136). FR-541 (the computer keeps a bid the player answers) was fixed.
- Final gate 2026-11-17: unit `Tests  3 failed | 2708 passed (2711)` (only those three blocked rows), lint 0 errors, tsc and build
  exit 0, Playwright `129 passed`; FR-541 seen in the built app (7 lumber sold to Valdoria by turn 10).
- Next (NR-034, in this order): Nathan's answers on Q117 and Q136 (and Q137, Q138, FR-494's short Bid line), then push
  `claude/m13-nations` and open its pull request; then M14 to M16 (FR-501 to FR-528, `docs/specs/m13-m16.md`).
- Answered by Nathan 2026-11-16: Q79 to Q83, Q102, Q113. Needed: Q117 and Q136 (M13, now), Q121 (before M14's FR-503), Q130
  (before M16). Q114 and Q115 were built as suggested; he can still change them. Other open cards have defaults in force.
- Progress page (not republished since the M13 final round): https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU (`docs/report/roadmap.json`).
- Not verified: Firefox and WebKit, a winning Council vote on screen. The five `backup/v1-wip/*` branches are gone (`git gc` can prune).
- Older: `docs/journal/` (`archive-resuming-before-M12.md`, `archive-M12.md`, `archive-M12b.md`). Rules: `docs/rules/`. Flow: `docs/FLOW.md`.

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

## 2026-11-17 M13 Computer nations that play (FR-481 to FR-500, cards Q114 to Q119)

Size: L. Branch `claude/m13-nations`, one commit "M13: computer nations that play (FR-481..500)", not pushed. Tasks and models:
T-01 contract (Opus 5.5), T-02 sim harness, lane A military T-03 to T-06 (Opus 5.5), lane B workers and grants T-07 to T-09,
lane C trade between the Great Powers and its screens T-10 to T-13 (Opus 5.5), lane D acceptance file T-14 (Sonnet 5.5 xhigh),
T-15 integration and gate (Opus 5.5 xhigh, sole writer, no subagent). No task called the advisor. Notes per task:
`.gate/m13/T*-notes.md`; T-15's are `.gate/m13/T15-notes.md` (git-ignored). Decisions in force, built as their suggestions:
Q114 (b), Q115 (a), Q116 (b), Q117 (a), Q118 (a), Q119 (a).

What the computer does now (measured on random seeds by `tests/engine/sim/m13Acceptance.test.ts`): it recruits the first
regiment it can raise (FR-482) within an upkeep floor (FR-483); invaded, it recruits and attacks back (FR-484); it keeps and grows
its workforce (FR-485, FR-486); it takes Arvelia (FR-487); from turn 20 it may declare war on the player (FR-488), takes one
province and offers peace (FR-489); it trades steel, lumber and goods with the other Great Power (FR-491 to FR-493), shown on the
Board of Trade (FR-494), the border warning (FR-495) and the news (FR-496). It reads only what its own nation can see (FR-497).

BLOCKED: FR-490 (grants before a Council). The grant rule is built and its 20 unit tests pass, but Valdoria wins a minor's vote at
the turn-30 meeting in 0 of 24 games (required 18). A free minor votes from 50 points; the best one stands at 36 to 43 on turns 26
to 29 (median 41); 4 grants add 8 at most, and none was given (an embassy comes first, FR-162). The spec measured 43 to 47 before
M13; M13's recruits and migrants spend the cash and its war on Arvelia costs every minor 5 points. The test stays red (not loosened,
not skipped). Needs Nathan on card Q117: option (b), a lower band, or earlier consulates.

T-15 fixes, each red before green (`.gate/m13/t15/red-*.txt`, `green-*.txt`): the FR-246 forecast reads only the asking nation's
own intents (FR-497); every peace writes `peaceTurn` (FR-488); a bid toward the Great Power that offered last turn goes first
(FR-493); a war on a minor waits for 4 turns of upkeep (FR-274, FR-497: a both-scripted Valdoria declared with $336 and lost 6
regiments for want of pay); a stranded nation opens a consulate below $3,000 (FR-245); a migrant never takes the meal's can
(FR-485, FR-040: a sick worker in FR-260's seed 2); an offer after a lost battle no longer delays the war aim's offer (FR-489,
seed 12). e2e: `e2e/idleWar.ts` closes the computer's Battle screens and peace offers in the two 40-turn specs.

Pins moved (old -> new, each reason in the test; FR-499): continentScore FR-260 1507, 1546, 1548, 1685 -> 1454, 1352, 1477, 1430
(-53, -194, -71, -255), its upkeep $100 every turn -> pinned per seed and turn, capital arms 4 -> 4, 7, 4, 7, FR-305 4 to 4 -> 6 to
3 (seed 1) and 5 to 4 (seed 3) from turn 30; v2Trade40 FR-247's baseline (each number in the test's comment); harness FR-481's
before-table, the scripted race by turn 17 -> 19; dealBook FR-256 a refused wool bid -> a refused wool offer (FR-492); purity
FR-302 narrowed by FR-490; lane A's FR-213, FR-274 and FR-302 pins and lane C's partnerOrders, boardOfTrade and m7-trade pins.
FR-498: scriptedScore, scriptedRail, twoNations and twoIslandsGolden did not move (0 diff lines, green).

For Nathan besides Q117: FR-494's Bid line is shortened to "A bid is refunded if Valdoria does not sell." (the full line broke
FR-257's fit by 109 px). Seen in FR-260's "world" games, not fixed (no row): on seeds 2 and 4 the campaign raises regiments that
never march (no horses; field 29 against 37.5 needed) and pay upkeep, which costs 194 and 255 score points.

| Claim | Command | Quoted result |
|---|---|---|
| The acceptance file was red before the AI rows | `npx vitest run tests/engine/sim/m13Acceptance.test.ts` (T14-red-run3.clean.txt) | `Tests  9 failed \| 22 passed (31)` |
| Every acceptance row passes but FR-490 | the same file on the final tree (t15/accept-3.txt) | `meets  FR-484 (i) aggressor 12 of 12 (required 12) min 3, median 4, max 5`; `meets  FR-485 idle 24 of 24 (required 20) min 7`; `meets  FR-486 idle 24 of 24 (required 16) min 24, median 26, max 28`; `meets  FR-487 (war) idle 24 of 24 (required 22) min 17`; `meets  FR-488 idle 24 of 24 (required 18) min 21, median 21, max 23`; `meets  FR-489 (capital) idle 24 of 24 (required 24)`; `meets  FR-493 trader 24 of 24 (required 18) min 5, median 6, max 7`; `Tests  1 failed \| 30 passed (31)` |
| FR-490 is red | the same | `MISSES FR-490 idle 0 of 24 (required 18) min 0, median 0, max 0` |
| The computer breaks no rule and is fast | the same | `rejected orders of Valdoria 0 (required 0), invariant breaks 0 (required 0), no-pay disbands in idle games 0 (required 0), computerOrders p95 13.6 ms and max 47.3 ms over 2400 turns of 60 games` |
| The T-15 fixes were red | t15/red-*.txt | `expected 'at-war' to be undefined`; `expected undefined to be 11`; `expected [] to deeply equal [ 'steel' ]`; `expected [] to deeply equal [ 'minor-2' ]`; `Tests  1 failed \| 17 passed (18)` (meal); `Tests  1 failed \| 28 passed (29)` (war aim) |
| The narrowed FR-302 scan still catches a council import | mutant in `ai/diplomacy.ts` (t15/mutant-FR302.txt), reverted | `Tests  1 failed \| 9 passed (10)` |
| Unit tests: all but FR-490 pass | `npm test` (gate1-unit.txt) | `Test Files  1 failed \| 125 passed (126)`, `Tests  1 failed \| 2686 passed (2687)`, `exit 1` |
| v1 did not move (FR-498) | the same; `git diff HEAD` on the four files | `scriptedScore.test.ts (48 tests)`, `scriptedRail.test.ts (17 tests)`, `twoNations.test.ts (12 tests)`, `twoIslandsGolden.test.ts (2 tests)` green; 0 diff lines |
| Lint has no error | `npm run lint` (gate1-lint.txt) | `✖ 2 problems (0 errors, 2 warnings)`, `exit 0`; the same two old warnings |
| Types are clean | `npx tsc --noEmit` (gate1-tsc.txt) | no output, `exit 0` |
| The build works | `npm run build` (gate1-build.txt) | `✓ Compiled successfully in 3.6s`, `✓ Generating static pages (4/4)`, `exit 0` |
| The browser suite | `PORT=3199 npx playwright test --workers=1` (gate1-e2e.txt) | `Running 129 tests using 1 worker`, `129 passed (8.4m)`, `exit 0`; none failed, flaky or skipped; the two 40-turn specs with the computer's war: `FR-078 FR-104 FR-109 end 40 turns ... (42.7s)`, `FR-315 FR-306 FR-316 ... (41.8s)` |
| The documents agree with themselves | `node .gate/m12/L4-check-req.cjs`, `L4-check-roadmap.cjs` | `PASS` each |

Not verified: Firefox and WebKit; a game played by eye against the new computer (the e2e specs run 40 turns idle only).

## 2026-11-17 M13 review fix round (13 findings; FR-538 to FR-540)

Size: M. Same branch, one commit "M13: review fixes", not pushed. One task, Opus 5.5 xhigh, no subagent, no advisor call; notes
`.gate/m13/fix-notes.md`, logs `.gate/m13/fix/` (git-ignored). Fixed, each red before green: FR-538 (the army gathers in sight before a
war on the player, so the border warning shows first: 24 of 24 idle games, was 0), FR-540 (a Great Power is a buyer only by its public bid
of last turn), EFD-1, UTH-2, UTH-3, ST-08, and the documents (ST-03 to ST-07). Blocked: FR-539 (the computer's steel bid toward the player;
a standing bid met it but moved an M12 guard). Pins re-recorded by FR-538 with old -> new (FR-247, FR-260, FR-305, FR-481, FR-488); the v1
guards did not move. Its gate: unit `Tests  3 failed | 2701 passed (2704)` (FR-490 and FR-539's two rows), lint, tsc, build clean,
Playwright 40 passed on the touched specs (the full suite was not run in that round).

## 2026-11-17 M13 by-eye QA fix round and final gate (FR-541, cards Q136 to Q138)

Size: M. Same branch, one commit "M13: QA fixes and final gate", not pushed. One task, Opus 5.5 xhigh, sole writer, no subagent, no
advisor call; logs `.gate/m13/final/` and `.gate/m13/gate2-*.txt` (git-ignored). Two QA tracks (A and B) played the built app and failed
QA checks 2, 3 and 4, with 10 extras. Every claim was checked in the code or with a sim repro before anything was changed.
Plan-lite: the change, the computer keeps its FR-493 (a) bid on the turn after it answered the person's offer, which needs the public
orders of two turns ago (`market.ordersTwoTurnsAgo`, optional); who consumes it: a person who offers on the Board's "Valdoria bid for N
last turn" line; the test rows: FR-541 (scriptedTrade 3 tests, partnerMarket 2, the acceptance file's `follower` row); verify: those
files, the guards, then the gate. Objection: the person's first answer still finds no bid (the one-turn lag of card Q118 (a)).
- Fixed, FR-541 (track A extra 2, track B extra 1): reproduced first with a sim probe (`.gate/m13/final/lag.test.ts`): a person who
  offers lumber only on the Board's cue offered on turns 2, 4, 6 and Valdoria bid on 3, 5, 7: 0 of 145 offers sold in 24 games. Now 24
  of 24 games, 8 to 10 lumber sold each. Idle, aggressor and both-scripted games did not move (the acceptance rows and the scripted
  report are the same line for line before and after).
- Reproduced, still blocked (tests red, not loosened): QA checks 2 and 3 are FR-490 (no embassy, so no grant: card Q117); QA check 4 is
  FR-539 (no steel bid in a real game: new card Q136; track B's "holds used first" confirmed in `planTrade`).
- Not changed, with the reason in `docs/requirements.md` (section "M13 by-eye QA fix round"): clothing, furniture and timber trades with
  Valdoria that never fill (the settlement serves the minors first: new card Q137); a second war 10 turns after an accepted peace (by
  FR-488: new card Q138); Arvelia taken 2 to 3 turns later than QA check 1 (the check predates M13); the first recruit news one turn
  after the war (FR-200: armaments must be in stock); "1 Cuirassiers recruited." (the game's wording since M8).
- Documents: FR-541 and the QA section in `docs/requirements.md`, statuses of FR-481, FR-482, FR-490, FR-491, FR-493, FR-499, FR-500
  and FR-539; cards Q136 to Q138 there and in `docs/report/roadmap.json` (with M13's status and Q117's note); a dated note under the
  spec's QA checks; `docs/ARCHITECTURE.md`; the M12b entries moved to `docs/journal/archive-M12b.md`.

Pins moved (old -> new; the reason is written in the test): harness FR-481's trader game on seed 1, units traded 6 -> 9 and refused bids
6 -> 8 (FR-541: the trader sells lumber on turns 4 to 12; the cash Valdoria spends moves its wars on Arvelia 18 -> 20 and on Testland
23 -> 26; measured with the new clause off and on, `trader2-before.txt`, `trader2-after.txt`). The v1 guards did not move.

| Claim | Command | Result (quoted) |
|---|---|---|
| The lock is real (before the fix) | `npx vitest run --config .gate/m13/final/vitest.config.ts lag.test` with lumber only | `TOTAL offers 145, sold 0`; seed 1: `t1[V:l2 P:-] t2[V:- P:l] t3[V:l2 P:-] t4[V:- P:l]` |
| FR-541's unit tests were red | `npx vitest run tests/engine/scriptedTrade.test.ts tests/engine/partnerMarket.test.ts` (red-541-unit.txt) | `Tests  5 failed \| 112 passed (117)`; `+   "t4 offered",` `+   "t5",` `+   "t6 offered",` |
| FR-541's sim row was red | `npx vitest run tests/engine/sim/m13Acceptance.test.ts` (red-541-accept.txt) | `MISSES FR-541 follower 0 of 24 (required 18)`; `sold/offered per game: 0/6,0/6,0/6,...` |
| FR-541 is green | the same three files (green-541-unit.txt, green-541-accept.txt) | `Tests  117 passed (117)`; `meets  FR-541 follower 24 of 24 (required 18) min 8, median 9, max 10` |
| Idle and both-scripted games did not move | `diff` of the acceptance rows and the scripted report, before and after | `both-scripted report identical`, `idle and aggressor rows identical` |
| The v1 guards did not move (FR-498) | `npx vitest run` on the four guard files; `git diff HEAD --stat` on them (guards.txt) | `Tests  79 passed (79)`, `exit 0`; `0` diff lines |
| QA checks 2 to 4 reproduce in the sim | the acceptance file on the final tree | `MISSES FR-490 idle 0 of 24`; `MISSES FR-539 (Board) idle 0 of 24`; `MISSES FR-539 (sold) trader 1 of 24` |
| The computer still plays fair | the same | `FR-497 rejected orders of Valdoria 0 (required 0), invariant breaks 0 (required 0), no-pay disbands in idle games 0 (required 0), computerOrders p95 12.7 ms and max 45.2 ms over 3360 turns of 84 games` |
| Final gate, unit | `npm test` (gate2-unit.txt) | `Test Files  1 failed \| 125 passed (126)`, `Tests  3 failed \| 2708 passed (2711)`, `EXIT 1`: the three blocked rows above, nothing else |
| Final gate, FR-497 in the whole suite | the same | `computerOrders p95 39.9 ms and max 168.7 ms over 3360 turns of 84 games` (inside its limit; slower than alone because the suite runs in parallel) |
| Final gate, lint | `npm run lint` (gate2-lint.txt) | `✖ 2 problems (0 errors, 2 warnings)` (the two older ones: `'sliderMax'`, `'capital'`), `EXIT 0` |
| Final gate, types | `npx tsc --noEmit` (gate2-tsc.txt) | `EXIT 0` |
| Final gate, build | `npm run build` (gate2-build.txt) | `✓ Compiled successfully in 3.6s`, `EXIT 0` |
| Final gate, e2e | `PORT=3199 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` (gate2-e2e.txt) | `129 passed (8.4m)`, `EXIT 0`; no flake, no re-run |
| FR-541 by eye in the built app | `node .gate/m13/final/follow-app.mjs 10` on `next start -p 3197` (follow-app.out, `shots/`) | `turn 2: ... offered true, sold 0, offer-unsold`; `turn 4: ... sold 1 \| ... Sold 1 Lumber to Valdoria for $290.`; `offers 8, sold 7; errors []` |

Not verified: Firefox and WebKit (the app check above ran in Chromium); the progress page was not republished (its data,
`docs/report/roadmap.json`, is updated).
