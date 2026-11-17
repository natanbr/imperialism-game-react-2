# Journal

## Resuming here
- 2026-11-17: M12 Honest game is merged (pull request 34, main 91d7edc). M12b Better HUD (FR-465 to FR-480, cards Q108 to Q113) is
  built and committed on `claude/m12b-hud`, not pushed, no pull request yet. Gate 1: 2503 unit tests, lint 0 errors, tsc and build
  clean, Playwright 105 passed. FR-372 is closed (20 whole news lines at 1280x720); FR-357 to FR-443: 78 tested, 9 partial (M12 entry).
  Decision taken in the build: labels beside the icons from 1800 px, not 1600 (M12b entry below).
- Next (NR-034, in this order): push `claude/m12b-hud` and open its pull request, then M13 to M16 (FR-481 to FR-528,
  `docs/specs/m13-m16.md`, cards Q114 to Q135; planned, nothing built). Merged so far: M0 to M12 (main 91d7edc).
- Answered by Nathan 2026-11-16: Q79 to Q83 as suggested, Q102 "keep the debug", Q113 one static Advance Turn. Needed from him: Q114
  and Q115 (before M13's military lane is finished), Q121 (before M14 builds FR-503), Q130 (before M16 starts). The other open cards
  have defaults in force: Q22 to Q78, Q84 to Q135 (progress page).
- Progress page (republish after a change): https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU, data in `docs/report/roadmap.json`.
- Not verified: Firefox and WebKit, a winning Council vote on screen. Open for Nathan: the five `backup/v1-wip/*` branches no longer
  exist (their commits are unreferenced; `git gc` can prune them).
- Everything older (status lines M0 to M11, the carried-forward review notes of M4.1 to M4.4, deferred items, housekeeping):
  `docs/journal/archive-resuming-before-M12.md`. The M12 and M12b entries are below. Rules of the game: `docs/rules/`. Flow: `docs/FLOW.md`.

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

## 2026-11-14 to 2026-11-16 M12 Honest game (NR-033, NR-034; FR-357 to FR-464, cards Q79 to Q107)

Size: L. Branch `claude/m12-honest-game`, pull request being opened, not merged. Eight commits on main a690759: bf9b705 audit and spec, 792ae9d the
four lanes integrated, 8024805 review round 1, 6d965a9 review round 2, e95fdc4 QA fix round, 6cd4d0d the AI margin (strategy C), a83a25c
and b384b99 its follow-ups, then the close-out commit (FR-461 to FR-464, gate 5 below).

### Audit and plan (2026-11-14, NR-033)

Nathan asked for an honest review after M11. Eight read-only audit agents played the running app and the headless engine and wrote
160 findings (34 major, 92 minor, 34 nit) to `docs/audit/2026-11-14/`. Verdict: the engine is sound (94 headless games of 40 turns with no
broken invariant; 42 of 43 test mutations caught), but the player-facing screens had real bugs and texts that did not match what
happened, the computer nations barely played (a war in 19% to 33% of games), and large parts of Imperialism were on no milestone
(technology, University, ships and sea war, saving, credit, town growth). The progress page had shown 100% everywhere and was rewritten.
The findings became themes T1 to T16 and milestones M12 to M18 (`docs/REVIVAL_PLAN.md`, section 5b). M12 is T1 to T10: everything a
player can see wrong or that lies, no new game system. Spec: FR-357 to FR-443, cards Q79 to Q104.

### The four lanes (one workflow; red tests first; the lanes committed nothing)

- L1, engine and store honesty (Opus 5.5, xhigh): transport sliders as hard caps (FR-389, FR-390), the upkeep forecast and its warning
  (FR-392, FR-393), Board of Trade and Deal Book (FR-394, FR-396 to FR-400), the favourite partner (FR-401), work in progress and the score
  (FR-402 to FR-404), war needs a land route (FR-406, FR-408), the news names the province (FR-375).
- L2, map and tile UI: scroll, zoom, touch and edge scroll (FR-364 to FR-370), Tile Info and refusals on the map (FR-371 to FR-374,
  FR-377, FR-424, FR-429), click and order fixes, costs shown before spending (FR-376, FR-378 to FR-388, FR-391, FR-433). Its model is not recorded in its notes.
- L3, shell and dialogs (Opus 5.5): save and load (FR-357 to FR-363), the Advance Turn lock, idle civilians and war lines (FR-412,
  FR-423, FR-432), Diplomacy says what each choice does (FR-395, FR-407, FR-409 to FR-411, FR-413, FR-415 to FR-418, FR-422), lists and small
  screens (FR-419 to FR-421, FR-425 to FR-428), How to play (FR-430, FR-431).
- L4, documents (Sonnet 5.5, xhigh): rows and statuses that match the code (FR-435 to FR-441), dead code removed (FR-442), tests that
  can fail (FR-443), the roadmap check; its check scripts are in `.gate/m12/` (git-ignored).

### Integration (792ae9d; Opus 5.5)

One agent put the four lanes into one tree: 21 recorded changes, each with its reason (the scripted player ships its last rails,
the news panel passes the province lookup, two margins cut from 8 px to 4 px, in the score table and the Board note, so the 1280x720 fits hold, the
Next dev badge off in e2e). Two baselines were re-recorded with their reasons (the FR-124 rail pin and the frozen M4 player's
score). Gate then: 2400 of 2404 unit tests (the four red were the FR-125 margin), Playwright 83 passed and 1 skipped. Parked, not
loosened: P1 the FR-125 margin (below), P2 FR-372 (eight whole news lines at 1280x720: `test.fixme`), P3 the game-over table's
work-in-progress column (done in review round 1).

### Review rounds

- Round 1 (8024805; each fix with a test red first): the grant question reads the upkeep through the engine's
  `upkeepForecastWithGrant` (FR-393, FR-422), Next Council follows Tile Info (FR-301, FR-371), arrow keys scroll a tile out from under
  the HUD (FR-369), the fort mark takes the pointer (FR-388), the Council body is a named Tab stop (FR-425), Continue opens How to
  play until the browser has closed it once (FR-430), the game-over table has an "In progress" column (FR-076, FR-402), the Modal scan
  covers eight more dialogs (FR-236).
- Round 2 (6d965a9): the one honest lever tried on FR-125 and reverted: the scripted player's cash reserve at $1,500, $3,500, $4,500
  and $6,000 left the lowest turn-15 ratio at 1.35 to 1.42, so no constant meets the margin. No source change; card Q103.

### QA fix round (e95fdc4; FR-444 to FR-453)

Size M. The by-eye QA of the built app (tracks A to C, `.gate/m12/qa/`) reported 20 items; each was checked in the code or
reproduced red first (unit tests, `e2e/m12-qa.spec.ts`; logs in `.gate/audit/m12-qa-fix/`). Fixed: FR-444 (the e2e dev
server builds into `.next-e2e`, so `next start` serves the gate's build), FR-445 (Escape keeps the tile's focus), FR-446
(no "Rail refused" for a step along laid rail), FR-447 (opaque Saved game backdrop), FR-448 (the selected civilian's first
offer scrolled above the HUD's fade), FR-449 (a Tile Info job ends the civilian selection), FR-450 (the spend question
starts on Keep the money), FR-451 (the close button stays in the title row at 390 px), FR-452 (the fort mark on a plate),
FR-453 (a civilian's button selects its tile). Not changed, each waiting for a decision or as specified: FR-372's eight
news lines (and a war line under the fade), the army buttons as the map's first Tab stops (FR-369), no verdict at a
turn-limit end (FR-300 against FR-431), the rival's news lines (FR-107), "In warehouse" after an offer (FR-061), the
640x360 notice and cut labels (FR-429, FR-424). FR-125's four tests stay red (review round 2, card Q103).
Objection: FR-448 shows only the first offer whole; the other offers of a busy tile stay under the fade, as showing them
all pushed Tile Info's heading out of sight.

### The AI margin hunt (NR-023, FR-125; FR-454 to FR-460; cards Q105 to Q107)

Problem: after FR-403 (a level-3 tile is worth 70 points) the scripted player's score was 1.39 to 1.49 times the frozen M4 player's at
turn 15 and 25 (lowest 635 against 457, seed 3 at turn 15); the requirement is 1.5 at turns 15, 25 and 40 on seeds 1 to 4, and the
check may not be loosened. Three attempts ran in throwaway probes: A and B did not meet it everywhere (their kept logs show 7 and 2 of the 41
`scriptedScore` tests red); strategy C (Opus 5.5) did, and became commit 6cd4d0d: FR-454 (the cash reserve is
kept by need, not a flat $2,500), FR-455 (no paper for training while the workers' labour covers what the hubs gather), FR-456 and
FR-457 (a depot site is chosen by the gain the nation can still use, then by payback), FR-458 (training keeps the campaign's
recruits). Result on seeds 1 to 4: the ratio is 1.63 to 1.69 at turn 15, 1.50 to 1.78 at turn 25 and 2.09 to 2.24 at turn 40; the lowest was
seed 3 at turn 25, 847 against 845 needed (2 points then; 58.5 points since FR-460: 903 against 844.5). It re-recorded 13 pins, each an exact equality with the reason in the test, and
changed three v1 turn-1 test cases (FR-159 against FR-455: card Q105). The strategy left one red test, the no-dead-end check at turn 25
on seeds 3 and 4 (a developer started a job on the depot tile before the engineer's last rail section: card Q106); FR-459 (no civilian
works a tile the engineer's rail still needs, a83a25c) addresses that block (gate 3 had no red test) and FR-460 (training keeps the civilians' cash, b384b99)
followed; card Q107 keeps the armed nations out of FR-460 (measured: it lowered FR-260's start-army scores by up to 55 points).

### Workflow close-out (NR-034, 2026-11-16 night)

Nathan said to keep going: update the progress page and the roadmap, build a better HUD (a top bar with cash and turn like the
original, a right pane with accordions), then M13 to M16 and on. Done by the docs agent (Sonnet 5.5): requirements rows FR-461 to
FR-464 (close-out, below), the HUD rows FR-465 to FR-480 and the M13 to M16 rows FR-481 to FR-528 from the two research specs
(`docs/specs/hud.md`, `docs/specs/m13-m16.md`), cards Q108 to Q135 with "Needed before" notes on Q114, Q115, Q121 and Q130, Nathan's
answers to Q79 to Q83, Q102 and Q113, the roadmap and progress page, REVIVAL_PLAN, and this entry. The close-out rows: FR-461 a click is a plain
move where no rail section can be ordered, FR-462 the main tsconfig does not list `.next-e2e`, FR-463 the FR-448 e2e check has a bound, FR-464 a
golden guard for the v1 two-islands games. They were built at the same time by the code agent (Opus 5.5), each red before
its fix (`.gate/m12/closeout2-code-notes.md`). FR-463's tighter bound found a real FR-448 defect: an earlier selection left the
HUD scrolled past Tile Info's heading (y -8 against a top of 12); each new selection now scrolls the HUD from its top. FR-461
changes one behaviour: an engineer's click onto hills, swamp or mountains where rail is refused is a plain move with no
"Rail refused" line (Tile Info still gives the reason). A first version also barred rail-on-move onto the capital; the review found the
engine accepts that click where a section into the capital can be laid, and close-out 3 (Opus 5.5, `.gate/m12/closeout3-code-notes.md`) removed
the bar, so FR-378's test is back to its original expectation. The gate agent (Opus 5.5) ran gate 5, flipped the four rows to tested,
corrected the FR-125 margin quoted as 4.5 points in the new spec, card Q116 and the golden test (it was 4.5 before FR-460; it is
58.5 now) and marked FR-444 as replaced in part by FR-462.

### Status of FR-357 to FR-443 (docs agent, Sonnet 5.5, 2026-11-16)

The 87 rows still read `planned (L1)` to `(L4)`. Each now has its real status in `docs/requirements.md`, set from the lane notes (L1 to L4,
integration, AI margin, close-out) and from the tests whose titles name the row; every test file a status names exists. Result: 77 tested,
9 partial, 1 parked. `partial` and `parked` are defined in the file's header. A row with no passing test that can be found is never tested.
- Parked: FR-372 (the news list shows 3 lines, not 8, at 1280x720; its e2e case is `test.fixme`; the HUD milestone M12b closes it, FR-472).
- Partial, in the code: FR-365 (touch panning is checked only as a style rule; no test drags a finger) and FR-388 (the mark follows
  `tile.fortLevel`, so the four minor nations' capitals show none, and FR-346's coverage check does not count it; both wait for a decision).
- Partial, documents: FR-435 to FR-441 are checked by `.gate/m12/L4-check-req.cjs` and `L4-check-roadmap.cjs` (both PASS) and by reading; no test of
  the suite reads `requirements.md` or `roadmap.json` (a suite test that runs those checks would make them tested).
- Moved with it: FR-461 now says a click is a plain move where `railOnMoveStart` finds no section (the capital is no exception), and FR-023,
  FR-137 and FR-374 name it as replacing their rail-on-move-first clause in part; the FR-125 margin is quoted as 58.5 points in every document outside `docs/audit` (the 2026-11-14 record);
  the progress data and the plan say the M12 pull request is being opened.

| Claim | Command | Quoted result |
|---|---|---|
| The test files of 78 of the 87 rows pass | `npx vitest run <file>` one file at a time, 36 files (`.gate/m12/docs-sample.txt`, `docs-sample2.txt`) | for example `persistence.test.ts` `Tests  32 passed (32)`, `diplomacyDialog.test.tsx` `Tests  78 passed (78)`, `scriptedScore.test.ts` `Tests  48 passed (48)`; no file failed |
| NR-023's margin holds (FR-405) | `npx vitest run tests/engine/scriptedScore.test.ts` | `FR-125 seed 3: t15 757/457 (1.66) ... t25 903/563 (1.60)`, the lowest of the twelve checkpoints; 903 against 844.5 needed is 58.5 points |
| The click onto the capital (FR-461) after close-out 3 | `npx vitest run tests/ui/tileClickOrders.test.ts` and three more files (closeout3-green.txt); `npx playwright test` on m4-3, m12-map and cursor-icons (closeout3-e2e.txt, closeout3-e2e-rerun.txt) | `Test Files  4 passed (4)`, `Tests  81 passed (81)`; e2e `27 passed`, `1 skipped`, `2 failed` (cold dev-server page loads, 30 s), the two rerun: `2 passed` |
| The status words are valid and no row is still planned (L1 to L4) | `node .gate/m12/L4-check-req.cjs` | `FR-357..443 status words: {"tested":77,"partial":9,"parked":1}`, `PASS` |
| The progress data agrees with itself | `node .gate/m12/L4-check-roadmap.cjs` | `PASS` (milestones M12, M12b and M13 to M18, 132 cards, 160 findings) |

### Evidence (gate 6 on the final tree, acc63d0 plus close-out 3 and the FR-357 to FR-443 statuses, 2026-11-17; logs in `.gate/m12/`, git-ignored)

Run by the verify agent (Opus 5.5). Full Playwright, not only the three specs close-out 3 ran: `clickCursors` calls `moveOrders` for every
tile while a civilian is selected, so every spec that selects one runs the changed line.

| Claim | Command | Quoted result |
|---|---|---|
| Every unit test passes | `npm test` (gate6-unit.txt) | `Test Files  118 passed (118)`, `Tests  2447 passed (2447)`, `EXIT 0` (gate 5 plus close-out 3's one new test) |
| Lint has no error | `npm run lint` (gate6-lint.txt) | `✖ 2 problems (0 errors, 2 warnings)`, `EXIT 0`; the same two warnings as gates 4 and 5 |
| Types are clean | `npx tsc --noEmit` (gate6-tsc.txt) | no output, `EXIT 0` |
| The build works | `npm run build` (gate6-build.txt) | `✓ Compiled successfully in 5.6s`, `✓ Generating static pages (4/4)`, `EXIT 0` |
| The browser suite passes | `npx playwright test --workers=1` (gate6-e2e.txt) | `1 skipped`, `92 passed (8.5m)`, `EXIT 0`, first run; `FR-463 {"headingY":162,"seenTop":12,"offerBottom":405.5,"seenBottom":406}` |
| The e2e run leaves tsconfig.json alone (FR-462) | `git hash-object tsconfig.json` before and after (gate6-tsconfig-sha.txt) | `cf3b9d2` both times, not in `git status` |
| The documents agree with themselves | `node .gate/m12/L4-check-req.cjs`, `L4-check-roadmap.cjs`, `gate5-ids.cjs` | `PASS` each, `{"tested":77,"partial":9,"parked":1}` |

### Evidence (gate 5 on the close-out tree, b384b99 plus FR-461 to FR-464; logs in `.gate/m12/`, git-ignored)

| Claim | Command | Quoted result |
|---|---|---|
| Every unit test passes | `npm test` (gate5-unit.txt) | `Test Files  118 passed (118)`, `Tests  2446 passed (2446)`, `EXIT 0` |
| Lint has no error | `npm run lint` (gate5-lint.txt) | `✖ 2 problems (0 errors, 2 warnings)`, `EXIT 0`; the same two warnings as gate 4 |
| Types are clean | `npx tsc --noEmit` (gate5-tsc.txt) | no output, `EXIT 0` |
| The build works | `npm run build` (gate5-build.txt) | `✓ Compiled successfully in 5.1s`, `✓ Generating static pages (4/4)`, `EXIT 0` |
| The browser suite passes | `npx playwright test --workers=1` (gate5-e2e.txt) | `1 skipped`, `92 passed (8.1m)`, `EXIT 0`, first run; `FR-463 {"headingY":162,"seenTop":12,"offerBottom":405.5,"seenBottom":406}` |
| The e2e run leaves tsconfig.json alone (FR-462) | `git status`, `sha1sum` after it | tsconfig.json only this commit's change, `c8d3f08` while the dev server ran and after |
| The golden guard holds after its message was corrected | `npx vitest run tests/engine/twoIslandsGolden.test.ts` (gate5-golden-msg.txt) | `Tests  2 passed (2)`, `vitest EXIT 0`, `eslint EXIT 0` |

### Evidence (gate 4 on b384b99; logs in `.gate/m12/`, git-ignored)

| Claim | Command | Quoted result |
|---|---|---|
| Every unit test passes | `npm test` (gate4-unit.txt) | `Test Files  117 passed (117)`, `Tests  2438 passed (2438)`, `EXIT 0` |
| Lint has no error | `npm run lint` (gate4-lint.txt) | `✖ 2 problems (0 errors, 2 warnings)`, `EXIT 0`; both warnings predate M12 (`useTransportAllocations.ts:106`, `logisticsSystem.test.ts:333`) |
| Types are clean | `npx tsc --noEmit` (gate4-tsc.txt) | no output, `EXIT 0` |
| The build works | `npm run build` (gate4-build.txt) | `✓ Compiled successfully in 6.4s`, `✓ Generating static pages (4/4)`, `EXIT 0` |
| The browser suite passes | `npx playwright test --workers=1` (gate4-e2e-2.txt) | `1 skipped`, `92 passed (7.7m)`, `EXIT 0` |
| The first full browser run had one flaky failure | gate4-e2e.txt, rerun in gate4-e2e-rerun.txt | `1 failed` (m6-dialogs FR-236 keyboard on Diplomacy: `data-ready` stayed `null` for 15 s), `91 passed (26.2m)`; the rerun of that file: `4 passed (33.6s)`; the second full run is the line above |
| FR-125's margin held at strategy C (gate 2) | `npm test` (gate2-unit-final.txt) | `Tests  1 failed | 2421 passed (2422)`; the one red was the dead-end check (Q106); gate 3 (gate3-unit.txt): `Tests  2433 passed (2433)` |

Parked after M12: FR-372 (eight whole news lines at 1280x720: the HUD redesign decides it, FR-472; closed by M12b, below), the QA fix round's list above,
the FR-125 margin's thin points (seed 3 at turn 25 passes by 58.5 points, about 6%; 4.5 before FR-460; any later AI change may flip it), cards Q103 to Q107.

## 2026-11-17 M12b Better HUD (NR-034; FR-465 to FR-480, cards Q108 to Q113)

Size: L, UI only (engine, store and types untouched; no selector was missing). Branch `claude/m12b-hud` from main 91d7edc (M12 merged
as pull request 34), one commit, not pushed. Spec `docs/specs/hud.md`. One workflow, red tests first, four tasks, each Opus 5.5 with no
advisor call; notes and logs in `.gate/hud/` (git-ignored):
- T1, the frame (FR-465, FR-479): `--topbar-height` 40 px (80 px below 1024 px), `mapAreaOf` is the window less the bar and the pane, the
  map and the narrow-window line start under the bar, the bar stops edge scrolling.
- T2, the top bar (FR-466 to FR-469, FR-477, FR-480): `HUD/TopBar.tsx`: the nation, the turn block with the next Council line, cash with
  last turn's change, score with its rank and parts, the dialog buttons as 32 x 32 icons (the name kept as a hidden label) and the one
  Advance Turn (card Q113); New game's question is a panel under the bar.
- T3, the right pane (FR-470 to FR-477): Tile Info or "No tile selected", the alerts (`HUD/Alerts.tsx`), the news in the pane's free
  height, three closed groups (`HUD/HudGroups.tsx`, `HUD/hudView.ts`): Nation, Work in progress (N), Details for bug reports, shown
  without `?debug` (card Q102). The pane's interim Advance Turn is gone.
- T4, the gate (Opus 5.5, this entry): the old-layout pins retargeted, the e2e suite moved to the new layout, `e2e/m13-hud.spec.ts`
  written, FR-372's `test.fixme` made a test, the rows flipped and the 16 older rows amended (`replaced by FR-4xx in part`).

Decision taken (T2): labels beside the icons from 1800 px of window width, not the spec's 1600 (FR-468, spec amended). At 1600 px with
labels the row needs 1746 px: the nation name was squeezed to 0 px and the score ran 6 px into the buttons. Objection: from 1024 to
1799 px a player sees the icons only (the name is the tooltip and the accessible name).

Pins moved (old -> new; each reason is written in the test):
- Unit, 46 red in 5 files after T1 to T3 (all pins of the old layout, no defect in src): dialogs (37) and about (4) render
  `<TopBar />` (the dialog buttons left the pane); watchNation (3) opens the Nation group for the score table and renders `<TopBar />`
  for New game; persistence (1) renders `Alerts` for Not-saved; camera FR-366 (1) stubs the pane with a group button (the bar now
  renders Advance Turn).
- E2E: at 1920x1080 the map lies at 320.5, 224 (was 184; the bar takes 40 px) in m12-map FR-367 and m11-map FR-340; islands at 800x450
  scroll to 0, 214 (map area 550 x 370); look FR-090 needs every tile at y >= 40; the score table and the Council projection are read
  after opening the Nation group (m5-world, two-nations, market-and-game-over, m10-council); m5-hud-scroll opens Nation and Details
  so the pane overflows; councilNews checks below the bar and above the groups; m11-lists FR-334 and FR-349 measure 32 x 32 buttons,
  20 x 20 icons and labels from 1800 px; m12-map FR-424 checks the bar at 640x360, FR-429 the line's top >= 80, FR-377 the group
  without `?debug`; m8-qa FR-268 selects tile 2-9 when no tile is selected (Tile Info is no longer always shown).
- Measured: FR-372 (eight whole news lines at 1280x720 on turn 2) now shows 20.

| Claim | Command | Quoted result |
|---|---|---|
| The old-layout pins were red after T1 to T3 | `npm test` (T4-unit-0.txt) | `Tests  46 failed \| 2456 passed (2502)`, in 5 files |
| The retargeted files pass | `npx vitest run` on the 5 files (T4-fix-neighbours.txt) | `Tests  154 passed (154)` |
| The new FR-477 page test can fail | mutation: the next-Council line removed (T4-red-fr477-page.txt), restored (T4-fr477-page.txt) | `Unable to find an element by: [data-testid="next-council"]`, `Tests  1 failed`; restored `Tests  1 passed` |
| The one-Advance-Turn e2e check can fail | mutation: a second Advance Turn (T4-red-e2e-two-advance.txt) | `Expected: 1`, `Received: 2` |
| Every unit test passes | `npm test` (gate1-unit.txt) | `Test Files  121 passed (121)`, `Tests  2503 passed (2503)`, `EXIT 0` |
| Lint has no error | `npm run lint` (gate1-lint.txt) | `✖ 2 problems (0 errors, 2 warnings)`, `EXIT 0`; the same two warnings as M12's gates |
| Types are clean | `npx tsc --noEmit` (gate1-tsc.txt) | no output, `EXIT 0` |
| The build works | `npm run build` (gate1-build.txt) | `✓ Compiled successfully in 3.6s`, `✓ Generating static pages (4/4)`, `EXIT 0` |
| The browser suite passes | `npx playwright test --workers=1` (gate1-e2e.txt) | `105 passed (7.4m)`, `EXIT 0`, first run; none skipped (FR-372's `test.fixme` is a test now) |
| FR-372 is closed | the same run | `FR-372 news list 400 px, 20 lines of 20 px` |
| The documents agree with themselves | `node .gate/m12/L4-check-req.cjs`, `L4-check-roadmap.cjs` | `PASS` each; `FR-357..443 status words: {"tested":78,"partial":9,"parked":0}` |

Not verified: Firefox and WebKit; game over at 1800 px wide (Final scores adds about 116 px; T2 estimated 1752 px needed). Seen in the
gate's screenshots (`.gate/hud/shots/m13-hud-*.png`): at 390x844 the narrow-window line still covers the pane's first line until it is
closed (FR-429 as before), and the nation's name gives way first in the narrow bar (spec section 8).
