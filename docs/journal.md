# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0 to M4 are merged into `main` (PR 9, 10, 12 to 15, 17); their entries are archived in
  `docs/journal/archive-M1.md` to `-M4.md`. Decisions Q5 to Q16 settled (NR-012 to NR-018).
- M4.1 (PR 18), M4.2 (PR 19) and M4.3 (PR 20, main 274ef62) are merged; entries archived in
  `docs/journal/archive-M4.1.md` to `-M4.3.md`. Q17, Q19 and Q20 answered as NR-029, NR-028, NR-027.
- 2026-11-12 M4.4 (NR-027, NR-028; FR-140 to FR-142) merged (PR 21, main e018d85). Recruiting not
  built (probe in `scripts/probes/m4-4/`); decision card Q21 open, option (a) "no recruiting" taken
  meanwhile. v1 (M0 to M4.4) is complete.
- 2026-11-12 night shift (NR-030): v2 planning and implementation. Plan on branch `claude/v2-plan`
  (this worktree, the old docs worktree `imperialism-game-revival-fee36d`); one branch per milestone
  after it. The progress page files now live on these branches too (copied from the docs branch).

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- UI: the cursors are still emoji. Not built from M3: Q15 (c) "repeat last turn's trades".
- The NR-016 list of other same-turn effects (archive-M4, part A entry) waits for a decision.
- M5 design item (M4 review note 5): partly settled by FR-115 (with a civilian selected elsewhere, a
  click on a tile's civilians is the selected civilian's order there); with none selected, a click on
  a tile's centre still selects its civilian, not the tile.
- M4.1 review note 5: the rail path search (`railPath` in `engine/ai/railPlan.ts`) treats a tile with
  a temporary job (prospecting, development) as blocked, so the engineer takes a longer route, or finds
  none, rather than waiting the few turns until the job ends.
- M4.1 review note 7 (decision 4): Expand, freight cars, training and sales can still cut a standing
  order without a refusal (as on main, now visible in the dialog), and an older dead order whose inputs
  come back takes its labour back the next turn, cutting a newer order. Not changed in M4.1.
- M4.3 review finding 4: `isDepotSite` checks only hills; it does not call `railTerrainAllowed`. Today a
  depot needs no rail on its own tile, so it does not matter; when technologies become lockable, a
  depot site SHALL also require `railTerrainAllowed` (the section into it is built on it).
- M4.3 review finding 5: `railPath` (`engine/ai/railPlan.ts`) finds the path with the fewest tiles, not
  the fewest missing sections, so it can ignore rail already built that a slightly longer path would reuse.
- M4.3 review finding 6 (hypothesis, not run): the score drop since M4.3 may come partly from
  `bestDepotSite`'s gain counting every gathered unit equally; weighing each unit by what the economy
  actually uses (food eaten, inputs of running buildings, what sells) may pick better sites.
- M4.3 review finding 7: the transport popup's dialog uses `aria-label` where `aria-labelledby` (its
  visible title) fits; no `aria-modal`, no focus moved into it on open or back on close, and Escape
  does not close it. Accessibility pass in M5.
- M4.4 review note 7: a stale store entry (an allocation in `transportAllocationsByNation` for a commodity
  that now has nothing to ship) flashes its group once per open, until the next slider move writes the
  clamped allocations back. The popup's local state clamps it right after the first render; the store keeps it.
- M4.4 review note 10: in the lever table the "free worker" rows add a worker who eats raw food, so what they
  lose is a freight car's load of inputs every turn, not the cost of recruiting. Only the guarded rows (a
  free worker after a labour-bound turn, R1, R2) support the conclusion that recruiting does not pay; the
  rows with a free worker every turn (sick and starved workers) say little about a policy.

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

## 2026-11-12 M4.4 Recruiting AI and empty groups (FR-140 to FR-142)

Size: M (one dialog; the scripted player's run; a probe). One agent (Opus 5.5), no subagents, no advisor calls;
ultracode was not on. Branch `claude/m4-4-recruiting-ai` from main 274ef62, worktree `.claude/worktrees/decisions`.
FR rows first (`docs/requirements.md`, "M4.4").

Plan-lite:
- Change: the transport popup lists only what rules 04 lets the network carry and hides the groups that are
  all 0 / 0 (NR-027, FR-141, FR-142); the run's furniture bound counts 2 lumber a furniture (FR-140);
  recruiting measured before it is built (NR-028; a process step, so no FR row).
- Consumers: the popup (HUD and capital); `computerOrders` at End Turn and the headless tests.
- Tests: `ui/transportPopup.test.tsx` (FR-133 to FR-135, FR-141, FR-142), `e2e/m4-3.spec.ts` (FR-135,
  FR-142), `engine/scriptedScore.test.ts` (FR-140, FR-125).
- Verify: the gate below and a probe of seeds 1 to 4, turns 1 to 40 (kept in `scripts/probes/m4-4/`: a
  measurement tool, not a test; `npm test` does not run it).
- Objection: the probe says recruiting does not pay, so NR-028's main ask is not built (decision 1).

### What limits the scripted player (NR-028)

Probe: the FR-140 player on the real `newGame()`, nation 2 scripted, nation 1 idle; per turn the labour at
production (after training and freight cars), the labour the production phase used (`goods-produced` times
the labour per unit), the capacity and the stock. Files in `scripts/probes/m4-4/`: `m44.probe.ts` (the probe
and the free-worker injection, set by `FREE_UNTIL`, `FREE_WHEN_BOUND`, `FREE_FROM`, `FREE_CAR`),
`start.probe.ts`, `sum.mjs` and `show.mjs` (summaries), `recruiting-policies.txt` (R1 and R2, written as a
definition: the probe applied them by hand to `economy.ts` and reverted them), `vitest.config.ts` and a
`README.md` with the commands. The unchanged player and two free-worker rows were re-run from the committed
probe on 2026-11-12 and give the table's numbers; the R1, R2 and more-freight-car rows were not re-run.

| Seed | Labour, turns 1-39 | Used | Idle | Idle in turns 1-10 / 11-20 / 21-30 / 31-39 | Units made / capacity points | Turns with less than 2 labour idle |
|---|---|---|---|---|---|---|
| 1 | 688 | 498 | 190 (28%) | 29% / 54% / 7% / 24% | 259 / 1672 (15%) | 1-5, 22, 23, 25-27, 39 |
| 2 | 688 | 496 | 192 (28%) | 30% / 54% / 7% / 24% | 258 / 1648 (16%) | 1-5, 22, 23, 25-27, 39 |
| 3 | 694 | 492 | 202 (29%) | 32% / 52% / 10% / 26% | 256 / 1652 (15%) | 1-5, 20, 23-26 |
| 4 | 678 | 484 | 194 (29%) | 29% / 54% / 9% / 26% | 252 / 1688 (15%) | 1-5, 23, 24, 26, 30, 31, 39 |

- Two limits stack, and inputs bind at the margin. (1) The workforce: its labour caps use at about 344 units over
  the game (at 2 labour a unit; seed 1, 339 to 347 over the seeds), 20 to 21% of the 1648 to 1688 capacity
  points. About 79% of the capacity could never run on this workforce, even with unlimited inputs. (2) The
  inputs gathered and shipped: the run made about 255 units (252 to 259, 15% of the capacity points), below
  the labour cap, so at the margin the inputs run out before the labour does. The labour binds only on turns 1
  to 5 (the start stock) and on 5 or 6 later turns.
- What that means for recruiting: recruiting alone adds nothing, because inputs bind first. Recruiting plus
  more inputs is untested, except one combination (a free worker plus a free freight car, no gain: see the
  lever table and option (c) below); more coal, iron and timber from depots was not tried with recruiting.
- The M4.2 note "7 workers give 28 labour" was wrong as a number (the real peak is 22 to 24) but right in
  direction: the workforce is small for the capacity. It counted 7 experts: training brings the 7 to 16
  labour by turn 4 and to 22 or 24 from turns 24 to 30 (seed 1 ends with 3 trained and 4 experts, 22).
- Turns 11 to 20 leave half the labour idle: no coal, iron or timber in stock (seed 1: coal and iron 0 from
  turn 9 to 19, timber 0 from turn 2 to 13) until the depots reach them (coal and iron from turn 20).
- From turn 20 the freight cars limit: seed 1 at turn 40 gathers 82 units a turn and ships 26; coal 16, iron
  16 and timber 10 wait in stock at the end. Goods over 40 turns (seed 1): clothing 31, furniture 1,
  hardware 0, all sold (nothing unsold at the end).
- A worker eats one raw food a turn, and the meal is shipped before coal, iron and timber (FR-127), so each
  migrant takes one car's load of inputs every turn, on top of the canned food, clothing and furniture.

Lever table (sums of seeds 1 to 4; the frozen M4 player: 1547 / 1883 / 2646). A "free" worker is one untrained
worker added after the turn's resolution with no goods paid, the timing of a recruit ordered that turn (an
upper bound for any recruiting policy on this player); a turn is labour-bound when its production left less
than 2 labour idle.

| Step | Turn 15 | Turn 25 | Turn 40 | Lowest ratio | Workers at turn 40 |
|---|---|---|---|---|---|
| M4.3 player (start) | 2471 | 3174 | 5925 | 1.55 | 7 |
| FR-140 furniture bound (kept) | 2471 | 3205 | 5955 | 1.55 | 7 |
| + a free worker every turn 1 to 10 | 2266 | 2464 | 2972 | 1.01 | 17 |
| + a free worker every turn 1 to 20 (79 to 81 sick and 7 or 8 starved per seed) | 2266 | 2440 | 2444 | 0.91 | 19 or 20 |
| + a free worker after each labour-bound turn 1 to 32 | 2448 | 3013 | 4925 | 1.54 | 10 |
| + the same, turns 6 to 32 (after the start stock) | 2471 | 3235 | 5513 | 1.55 | 9 to 11 |
| + the same, with a free freight car for each | 2471 | 3235 | 5791 | 1.55 | 9 to 12 |
| + a free worker and car after each labour-bound turn 1 to 32 | 2484 | 3217 | 5817 | 1.56 | 10 to 12 |
| Policy R1: recruit on a labour-bound turn, 8 or more turns to go, a meal of cans kept, food for the new mouth, goods from stock | 2471 | 3229 | 6007 | 1.55 | 7 (no recruit: furniture is never in stock) |
| Policy R2: R1, and the run makes one furniture and the holds keep one clothing for it | 2475 | 3125 | 5605 | 1.57 | 9 (recruits on turns 22 and 29 or 30) |
| Policy R2 on any turn with the goods in stock | 2112 | 2633 | 4368 | 1.32 (FR-125 fails) | 11 |

- R1's +52 at turn 40 comes from its other change (one more can kept from the holds), not from a worker: the
  numbers move by about 50 from small changes, so only the larger differences count.
- More freight cars (context, not recruiting; FR-127 orders one a turn): up to 2 a turn 2471 / 3060 / 5864,
  up to 3 a turn 2471 / 3141 / 6041; with a free worker and car after each labour-bound turn on top, 5985
  and 6013 at turn 40. No change of the car rule was made.
- Result: no recruiting policy raises the score; even free migrants lower turn 40. The brief says stop and
  report, so no policy is built, and FR-125 is unchanged (no requirement weakened).

Score (FR-125, new / frozen and the ratio; nation 1 idle), and M4.3 for comparison:

| Seed | Turn 15 | Turn 25 | Turn 40 | M4.3 turn 15 / 25 / 40 |
|---|---|---|---|---|
| 1 | 616 / 390 (1.58) | 817 / 468 (1.75) | 1493 / 650 (2.30) | 616 / 786 / 1475 |
| 2 | 624 / 381 (1.64) | 816 / 471 (1.73) | 1496 / 668 (2.24) | 624 / 785 / 1481 |
| 3 | 614 / 396 (1.55) | 783 / 471 (1.66) | 1490 / 663 (2.25) | 614 / 786 / 1437 |
| 4 | 617 / 380 (1.62) | 789 / 473 (1.67) | 1476 / 665 (2.22) | 617 / 817 / 1532 |

Workers: 7 on every seed at every turn (no recruit). With policy R2 they would be 7 to turn 22, 8 from turn
23 and 9 from turn 30 or 31. No "recruited at least N by turn 25" test was added: the probe supports N = 0.

Decision for Nathan (card M4.4-1): the recruiting AI is not built.
- What happened: NR-028 asked the AI to recruit so it uses its capacity; the probe shows inputs bind before
  labour (the labour caps use at about 21% of the capacity, the run makes 15%), and each migrant costs a car's
  load every turn plus about $1,900 of goods.
- Options: (a) no recruiting AI in v1, NR-028's recruiting closed as measured (suggestion); (b) build R2 anyway
  so the AI's workforce grows (7 to 9), at -350 points at turn 40 over the 4 seeds (-6%); the probe saw no
  refusal and nobody sick or starved, and the 1.5 margin holds (lowest 1.57); (c) an AI task on transport and
  inputs first (cars, depots for coal, iron and timber), then recruit when labour becomes the limit. No
  measured gain so far: more freight cars gave +86 (+1.4%), worker plus cars 5985 and 6013 against 5955;
  changes below about 50 are noise.
- Objection to (a): the AI never grows its workforce, which a human player would do; the score formula
  rewards capacity, not output, so the AI's behaviour stays odd (expand, not run).
- Status: held for Nathan's answer. The orchestrator took (a) meanwhile; the game has no recruiting AI, and
  NR-028's status in `docs/requirements.md` says so (furniture bound fixed, recruiting not built).

Red before green:
- FR-140 on the old bound: `AssertionError: expected { furniture: 1 } to deeply equal {}`; with the fix
  `Tests 1 passed | 33 skipped (34)`. A first version of the test passed on the old code: on the start
  buildings the expansion spends every pair before the run, so the test now uses buildings whose next
  step costs 4 pairs or more.
- FR-142 on the old popup (with the new `commodityKinds.ts`): `Tests 4 failed | 7 passed (11)`, for example
  `expected [ 'Food', 'Raw materials', …(3) ] to deeply equal [ 'Food', 'Raw materials' ]`.

Tests changed because an FR changed (FR-141, FR-142), none skipped or deleted: `ui/transportPopup.test.tsx`
(the FR-133 rows are the rows shown, with a horses tile next to the capital so Other resources shows; FR-135
checks the groups shown) and the FR-135 e2e in `e2e/m4-3.spec.ts` (2 regions, 10 rows and 2 columns at the
start instead of 5, 23 and 3; the screenshot name comes from `TRANSPORT_SHOT`, default unchanged). New: the
FR-140 test and five FR-141 and FR-142 tests. Review fix round: three FR-135 cases in
`ui/transportPopup.test.tsx` (the popup's `columnCount` is 2 for a new game, 3 with a horses tile, 1 with
nothing to ship); they fail when `Math.min(3, ...)` is lowered to 2 (`expected '2' to be '3'`), when
`Math.max(1, ...)` becomes `Math.max(0, ...)` (`expected '0' to be '1'`) and when the columns go back to a fixed
3 (`expected '3' to be '2'`). The cap of 3 itself cannot be reached from the popup in v1 (at most 3 groups
show), so raising 3 to 4 would not be caught.

Screenshot `docs/journal/m4-4-popup.png` (`SCREENSHOT_DIR=docs/journal TRANSPORT_SHOT=m4-4-popup.png`, the popup
test only), looked at: 1280x720, a new game; two groups, Food (Grain 0 / 4, Livestock 0 / 0, Fruit 0 / 4,
Fish 0 / 0) and Raw materials (Cotton 0 / 2, the rest 0 / 0), side by side, icons before the names, no scroll
bar; no Materials, Goods, Paper or Canned Food. Fixed after looking: the first picture had the two groups in
the first two of three columns and the third empty; the columns now follow the groups shown (FR-142).

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-140, FR-125 | `npx vitest run tests/engine/scriptedScore.test.ts tests/engine/scriptedRail.test.ts tests/engine/twoNations.test.ts` | `Tests 57 passed (57)`; `FR-125 seed 1: t15 616/390 (1.58) depots 2 links 7/10 \| t25 817/468 (1.75) depots 4 links 12/20 \| t40 1493/650 (2.30) depots 5 links 14/27` |
| FR-141, FR-142 | `npx vitest run tests/ui/transportPopup.test.tsx` | `Tests 11 passed (11)` |
| Unit tests | `npm test` | `Test Files 58 passed (58)` / `Tests 842 passed (842)` (+6 on 836); 0 "not wrapped in act" |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3 as on main) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 12.7s`, `✓ Generating static pages (4/4)` |
| Smoke | `PORT=3187 npx playwright test --workers=1` | `1 skipped` / `21 passed (4.2m)`; the skip is the old `test.fixme` rail cursor |
| Screenshot | `SCREENSHOT_DIR=docs/journal TRANSPORT_SHOT=m4-4-popup.png PORT=3187 npx playwright test e2e/m4-3.spec.ts -g "transport popup" --workers=1` | `1 passed (22.7s)` |

How to see it in the app: `npm run dev`, press "Transportation of Commodities": Food and Raw materials side by
side; no Materials, Goods, Paper or Canned Food rows. Build a depot that reaches a horses, gold or gems tile and
the Other resources group appears. Recruiting: nothing to see (not built).

Review fix round (2026-11-12; tests and docs only, no production code changed, so no UI or e2e change and the
Playwright suite was not re-run; the smoke row above is the M4.4 run):

| Claim | Command | Result (quoted) |
|---|---|---|
| Unit tests | `npm test` | `Test Files  58 passed (58)` / `Tests  845 passed (845)` (+3 FR-135 cases on 842) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3; `scripts/probes/m4-4` adds none) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 6.7s`, `✓ Generating static pages (4/4)` |
