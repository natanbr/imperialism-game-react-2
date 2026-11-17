# Journal archive: M12 Honest game

Moved from `docs/journal.md` on 2026-11-17, unchanged, in the M12b QA fix round (FLOW: the journal stays under 400 lines;
M12 is merged as pull request 34, main 91d7edc).

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
