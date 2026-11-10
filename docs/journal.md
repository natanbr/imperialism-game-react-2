# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0 to M4 are merged into `main` (PR 9, 10, 12 to 15, 17); their entries are archived in
  `docs/journal/archive-M1.md` to `-M4.md`. Decisions Q5 to Q16 settled (NR-012 to NR-018).
- 2026-11-10 M4.1 play-test fixes (FR-112 to FR-124) on branch `claude/m4-1-feedback`, pushed, no PR:
  civilians share tiles and one job per tile; a standing order shows and commits only what it makes;
  commodity icons; the scripted player builds depots and joins them by the shortest rail path.
  Review fix round done (entry below). Next: Nathan's answer on the AI score (OPEN below), then a PR.
- OPEN for Nathan: the M4.1 scripted player meets NR-022 (purposeful rail, depots) but is not better
  by score. New player vs the frozen M4 player on this branch's engine, seeds 1 to 3: turn 15 382/390,
  365/381, 367/396; turn 25 460/469, 461/488, 472/477; turn 40 649/659, 652/674, 664/676. It scores
  lower in all 9 runs, though it ships more (268 vs 181 units by turn 15, seed 1): the extra goods sit
  unsold, because 4 cargo holds cap sales at 32 units and warehouse stock is not scored (turn 15, seed
  1: grain 77, livestock 25, fruit 26, canned food 40). Strategy and score unchanged until he decides.

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- UI: the cursors are still emoji. Not built from M3: Q15 (c) "repeat last turn's trades".
- The NR-016 list of other same-turn effects (archive-M4, part A entry) waits for a decision.
- M5 design item (M4 review note 5): partly settled by FR-115 (with a civilian selected elsewhere, a
  click on a tile's civilians is the selected civilian's order there); with none selected, a click on
  a tile's centre still selects its civilian, not the tile.
- The scripted player's score: see OPEN above (it ships more, sells no more, scores lower).
- M4.1 review note 5: the rail path search (`railPath` in `engine/ai/railPlan.ts`) treats a tile with
  a temporary job (prospecting, development) as blocked, so the engineer takes a longer route, or finds
  none, rather than waiting the few turns until the job ends.
- M4.1 review note 7 (decision 4): Expand, freight cars, training and sales can still cut a standing
  order without a refusal (as on main, now visible in the dialog), and an older dead order whose inputs
  come back takes its labour back the next turn, cutting a newer order. Not changed in M4.1.

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
list in "Resuming here".

## 2026-11-10 M4.1 play-test fixes (FR-112 to FR-124)

Size: L (four play-test items: engine, UI and the scripted player). One agent (Opus 5.5), no subagents,
no advisor calls; ultracode was not on. Branch `claude/m4-1-feedback` from main 168f803, worktree
`.claude/worktrees/decisions`. FR rows written first (`docs/requirements.md`, "M4.1 Play-test fixes").

Plan-lite:
- Change: one job per tile and stacks on any tile (NR-019); one production plan for the phase, the
  labour count, the order check and the dialog (NR-020); commodity icons (NR-021); a scripted engineer
  that builds depots and joins them by the shortest rail path (NR-022).
- Consumers: `validateOrder`, the map's job cursor and civilian buttons, the capital dialog, the market,
  `labourOf` (training, freight cars), the scripted player at End Turn.
- Tests: `stacking.test.ts` (FR-112 to FR-114), `ui/stacking.test.tsx` (FR-115),
  `productionPlan.test.ts` (FR-116 to FR-118, FR-120), `ui/productionPlan.test.tsx` (FR-119, FR-120),
  `ui/commodityIcons.test.tsx` (FR-121), `scriptedRail.test.ts` (FR-122 to FR-124), `e2e/m4-1.spec.ts`.
- Verify: the gate below.
- Objection: the "new civilians appear around the capital" half of NR-019 has nothing to act on in v1
  (no University), so FR-114 only pins today's capital stack; see decision 1.

NR-020 root cause (the production bug). A standing order is a bare number on the building. The
production phase clamped it to the stock and labour of the moment, but nothing else did: the capital
card showed the number itself as "order of max", and max was probed upward from the current order, so
it was never below it ("2 of 2" with no timber, coal or iron); and `labourOf` counted every standing
order's full labour as committed, so a stale order held labour it would never use and other orders
were refused for `insufficient-labour` (on turn 7 of the repro, canned food showed "0 of 0").
Removing the order showed "0 of 0" with "+" still enabled, which looked like the dialog had lost the
order. Fix: `planProduction(nation)` (`engine/industry/productionPlan.ts`) is the one computation of
the phase (cars first, then each building min(order, room, stock, labour)); the phase, `labourOf`
(committed = what the plan uses), the order check (a raise must be made in full without cutting
another output; else `insufficient-resources` or `insufficient-labour`) and the dialog ("P of M", a
"short of inputs/labour" note, "+" disabled at the limit, "−" steps from P, so one press clears a
stale order) all read it. The standing order itself is kept (rules 05: orders are saved between
turns): when stock comes back it makes goods again, and the card shows it. Regression: FR-120 (engine
and dialog) on the real `newGame()`, lumber 2 + steel 2 + fabric 2 on turn 1, six turns, turn 7.

Decisions (each with its objection):
1. FR-114: the start civilians stay on the capital tile (rules 03 section 2: a new civilian appears in
   the capital province). No other civilian is created in v1: migrants and trainees are industry
   workers. Objection: if Nathan means "spread over the tiles next to the capital", that is a short
   change in `placeStartCivilians` plus the FR-098 and e2e tray steps; not done without his word.
2. FR-113: any job blocks a second one on the tile, whatever its kind (rail cannot be laid on a farm
   being developed). The reason is renamed `tile-has-job` ("another civilian is already working that
   tile"). Objection: none found; the scripted player routes rail around tiles with jobs.
3. FR-115: with one of the player's civilians selected on another tile, a click on this tile's
   civilian button or stack is the selected civilian's order here; a click on the selected button
   deselects it. Objection: switching the selection to a civilian on another tile now takes two
   clicks (deselect, then pick); a tile with no selection still selects its civilian on a centre click.
4. FR-117/FR-118: committed labour follows the plan, so labour freed by a stale order can be given to
   another order. Objection: if the stock returns in the same turn (a cancelled sale), the building
   order decides who gets the labour; the card shows the short order. Across turns the same holds: a
   dead order whose inputs arrive later and that comes earlier in `BUILDING_ORDER` takes its labour
   back the next turn, and the newer order is cut. Expand, freight cars, training and sales can still
   cut standing orders without a refusal (unchanged from main, now visible in the dialog).
5. FR-122: no port. Logistics gathers through the capital and active depots, and the world market
   needs only cargo holds, so nothing the scripted player ships needs a port. Objection: a later
   river-port rule (deferred, rules 04) may change this.
6. FR-123: the engineer plans before the others, so the depot gets the cash first. Objection
   (corrected in the review fix round; the first text said the spending pays back later, which is
   false): the new player scores lower than the frozen M4 player in all 9 runs measured on this
   branch's engine (seeds 1 to 3; turn 15 382/390, 365/381, 367/396; turn 25 460/469, 461/488,
   472/477; turn 40 649/659, 652/674, 664/676). It ships more (268 vs 181 units by turn 15, seed 1),
   but the extra goods sit unsold: 4 cargo holds cap sales at 32 units, and stock is not scored (turn
   15, seed 1: grain 77, livestock 25, fruit 26, canned food 40 in the warehouse). OPEN for Nathan: the
   player meets NR-022 (purposeful rail, depots) but is not better by score.

Red before green (each new test run on the code before its fix):

| FR | Command | Red result (quoted) |
|---|---|---|
| FR-113 | `npx vitest run tests/engine/stacking.test.ts` before the validate change | `Tests 8 failed / 6 passed (14)`, `expected { ok: true } to deeply equal { ok: false, reason: 'tile-has-job' }`; the FR-112 and FR-114 rows passed already (the engine already let civilians share tiles) |
| FR-115 | `npx vitest run tests/ui/stacking.test.tsx` before the TileWorkers change | `Tests 3 failed / 1 passed (4)`, `expected '2-9' to be '3-8'`, `expected 'worker-nation-1-3' to be undefined` |
| FR-122 to FR-124 | `scriptedRail.test.ts` with the M4 `scriptedPlayer.ts` put back | `Tests 5 failed / 4 passed (9)`, `expected 13 to be less than or equal to 11`, `expected 21 to be greater than 21` |
| FR-117, FR-118, FR-120 | the plan tests (labourOf from `@/engine`) with the M4 industry files put back | `Tests 5 failed / 2 passed (7)`, `expected { total: 12, committed: 12, free: +0 } to deeply equal { total: 12, committed: 4, free: 8 }`, `expected 'insufficient-labour' to be 'ok'`, `expected 'ok' to be 'insufficient-resources'` |
| FR-119, FR-120 | `ui/productionPlan.test.tsx` with the M4 dialog files put back | `Tests 5 failed / 1 passed (6)`, `expected '2 of 2' to be '0 of 0'` (the play-test symptom) |
| FR-121 | `npx vitest run tests/ui/commodityIcons.test.tsx` before the icons | `Tests 3 failed (3)`, `Unable to find an element by: [data-testid="output-name"]` |

Tests changed because an FR changed (none skipped or deleted):
- `validate.test.ts`: the three rows that expected `tile-occupied` expect `tile-has-job` and cite
  FR-113; `gameText.test.ts`: the reason list.
- `industry.test.ts`: the all-labour-committed fixture and the FR-035 labour case stock the inputs
  their orders need (an order commits only what it makes, FR-117); titles cite FR-117.
- `capitalDialog.test.tsx`: the FR-046 refusal comes from Expand, since "+" is now disabled when
  nothing more can be made (FR-119).
- `watchNation.test.tsx` FR-108 whole-page test and `ui/stacking.test.tsx`: 20 s timeouts (about 5 s
  alone, they passed the 5 s default under a loaded full run).
- `labourOf` moved to `productionPlan.ts`: the import line of three test files.

Nation 2 after 15 turns (seed 1, nation 1 idle; `scriptedRail.test.ts` FR-124 prints these):

| Player | Depots | Rail links | Yield a turn (tiles to hubs) | Units shipped, 15 turns | Units offered | Score |
|---|---|---|---|---|---|---|
| M4 player on main (before) | 0 | 20 | 10 | 150 | 32 | 378 |
| M4 player on today's engine (the test's frozen copy) | 1 | 13 | 21 | 181 | 32 | 390 |
| M4.1 player | 3 (2 joined; the third, by the northern hills, is built and not yet joined) | 7 | 36 | 268 | 32 | 382 |

Offered units do not move: the 4 cargo holds cap them (NR-018). The first row is from a run on the
unchanged code before any M4.1 change (one-off probe, not committed). The same M4 player scores 390
on this branch's engine and 378 on main, probably from FR-113: rail is refused on tiles with a job, so
it lays 13 links instead of 20 (not isolated by a separate run).

Screenshots (`e2e/m4-1.spec.ts` with `SCREENSHOT_DIR=docs/journal`), looked at:
- `docs/journal/m4-1-ai-rail.png`: island 2 after 15 End Turns: two straight rail lines from the
  capital, one north to the depot at 15-6, one south-east to the depot at 17-12; in the north, by the hills,
  the engineer works at the third depot site; no mesh (the app's seed differs from the test's seed 1). The first take was clipped to the map's left edge
  and showed island 1; the clip now starts at tile 12-0.
- `docs/journal/m4-1-icons.png`: the market and the capital side by side, an icon before every
  commodity name and input; the steel card after one "More Steel" reads "1 of 2". Nothing changed after
  looking.

| Claim | Command | Result (quoted) |
|---|---|---|
| Unit tests | `npm test` | `Test Files 55 passed (55)` / `Tests 767 passed (767)` (+48 on 719) |
| No `act()` warning | `npm test`, output searched for "not wrapped in act" | 0 matches |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3, in files not touched) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 11.5s`, `✓ Generating static pages (4/4)` |
| Smoke | `PORT=3175 npx playwright test --workers=1` | `1 skipped` / `19 passed (3.1m)`; the skip is the old `test.fixme` rail cursor |
| Commit 8d21fc1 alone | `npx vitest run` in a temporary worktree at 8d21fc1 | `Test Files 50 passed (50)` / `Tests 728 passed (728)` |

How to see it in the app: `npm run dev`, then (1) move two civilians onto the same farm: the farm shows
a stack "2"; select a third civilian and click that stack: it moves there or starts its job; (2) open
the Capital, order lumber, steel and fabric 2 each and press End Turn six times: lumber and steel read
"0 of 0" with "Order 2: only 0 can be made (short of inputs)", and labour shows 4 committed; (3) open
the Market: an icon before each name; (4) press End Turn 15 times and scroll to Valdoria's island: a
few rail lines from the capital to green depots.

## 2026-11-10 M4.1 review fix round

Size: S (five review items). One agent (Opus 5.5, as briefed), no subagents, no advisor calls. Branch
`claude/m4-1-feedback`, worktree `.claude/worktrees/decisions`. The AI's strategy and the score are
unchanged (Nathan's decision, OPEN in "Resuming here").

- Journal (item 1): decision 6 corrected (the "pays back later" claim was false; measured scores in
  it and in "Resuming here"), decision 4 gains the cross-turn case, the M4 table notes 390 here vs 378
  on main (probably FR-113). The 9 scores and the turn-15 stock were re-measured on this branch after
  the fixes with a one-off probe (not committed) and match: `t15 s1 382/390 | t15 s2 365/381 | t15 s3
  367/396 | t25 s1 460/469 | t25 s2 461/488 | t25 s3 472/477 | t40 s1 649/659 | t40 s2 652/674 | t40
  s3 664/676`, `{"grain":77,"livestock":25,"fruit":26,"cannedFood":40}`.
- Refusal check (item 2): `scriptedRail.test.ts` counts the `order-rejected` events of nation 2 that
  `resolveTurn` returns (the old check validated the player's own, already validated orders). It can
  fail: with an order for an unknown worker added to each turn's orders (then removed) the run gave
  `× FR-124 no order of nation 2 is refused ...` / `→ expected 15 to be +0`; restored: `Tests 10 passed (10)`.
- Rail bound (item 3): only depots in the capital's rail component count. New player 7 links, bound
  10 (passes); frozen M4 player 13 links, bound 11; the test now also asserts that the M4 player breaks it.
- Engineer on the best site (item 4): `startConstruction` when the best depot site is his own tile.
  Finding: the old `moveAndStartConstruction` to the same tile was not refused (validate.ts treats a
  same-tile move-and-start as a plain start; a probe gave `{"ok":true}` and no `order-rejected`), so this
  is clarity, not a behaviour fix. New FR-122 test: red `"kind": "moveAndStartConstruction"` vs expected
  `startConstruction`, green after. Score row unchanged (382 vs 390).
- "Move <type> here" (item 5, review note 6): while a civilian is selected on another tile, that tile's
  civilian button or stack is named and titled "Move <selected type> here"; the icon stays. FR-115 test
  red: `expected 'rancher' to be 'Move forester here'`, `expected '2 civilians: choose one' to be 'Move
  farmer here'`; green after.
- Review notes 5 and 7: carried forward in "Resuming here".

| Claim | Command | Result (quoted) |
|---|---|---|
| Unit tests | `npm test` | `Test Files 55 passed (55)` / `Tests 768 passed (768)` (+1 on 767). A first run under load from other sessions gave `10 failed`, all `Test timed out`; the 7 files alone: `Tests 84 passed (84)`; the second full run is the one quoted |
| No `act()` warning | `npm test` output searched for "not wrapped in act" | 0 matches |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3, in files not touched) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 11.5s`, `✓ Generating static pages (4/4)` |
| Smoke | `PORT=3177 npx playwright test --workers=1` | `1 skipped` / `19 passed (4.8m)`; the skip is the old `test.fixme` rail cursor |
