# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0 to M3 are merged into `main` (PR 9, 10, 12, 13, 14); their entries are archived in
  `docs/journal/archive-M1.md`, `-M2.md`, `-M3.md`. Not built from M3: Q15 (c) "repeat last turn's trades".
- M3.5 merged (PR 15): rail line fix, two-island map, Game Icons and the minimalist look (FR-079 to FR-096).
- 2026-11-09: Nathan settled decisions Q5 to Q15 (NR-012 to NR-018). The agent merges milestone PRs;
  no ultracode unless clearly worth it; no NotebookLM, follow Imperialism (1997). Q16 settled by the
  orchestrator: no coast tiles on the new map.
- 2026-11-09 M4 part A (engine and store, FR-097 to FR-105) on branch `claude/m4-two-nations`, pushed,
  no PR yet: nation 2 "Valdoria" on island 2, played by the scripted player at End Turn; freight cars
  carry goods from the next turn (NR-016). Next: part B (the UI to watch nation 2), then the M4 review.

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- UI: the cursors are still emoji. Not built from M3: Q15 (c) "repeat last turn's trades".
- M4 part B: the news panel mixes both nations' events with no nation name; nation 2's civilians are
  clickable (their orders are refused `not-owner`); no New game button for `startNewGame`; the NR-016
  list of other same-turn effects (2026-11-09 M4 part A entry) waits for a decision.
- From the M3.5 review: (2) the capital's worker buttons are 10 px (pending Nathan's look approval).
  (3) Palette-scan gaps: `fill`/`stroke`/`boxShadow`, other colour names, `oklch()`, `layout.tsx`.
  (4) The selection ring is partly covered by the shore border. (5) `act()` warnings in two M3 UI tests.
  (7) `--color-bad` text is 4.35:1 on `--color-surface`, below AA. Items (1) and (6) done in M4 part A.

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

## 2026-11-09 M4 part A: second nation, engine and store (FR-097 to FR-105)

Size: L (start world, turn loop and store). One agent (Opus 5.5, xhigh), unattended, no subagents, no
advisor calls; ultracode was not on. Branch `claude/m4-two-nations` from `origin/main` 161e2e0, in the
worktree `.claude/worktrees/decisions`.

Plan-lite:
- Change: `newGame` founds two nations with one helper `foundNation` (palette slot, controller); End
  Turn asks `computerOrders` (scripted player) for nation 2 and logs every nation's orders; freight cars
  wait one turn; M3/M3.5 housekeeping.
- Consumers: the map's borders (slot colour), the store's `advanceTurn`, logistics and the food
  forecast, the capital dialog's freight line, part B (the UI to watch nation 2).
- Tests: FR-097 to FR-099 and FR-102 to FR-104 in `tests/engine/secondNation.test.ts`; FR-101 in
  `tests/engine/freightCars.test.ts`, `systems/productionSystem.test.ts`, `ui/capitalDialog.test.tsx`;
  FR-099, FR-100, FR-105 (d) in `tests/store/computerNations.test.ts` and `engineBoundary.test.ts`;
  FR-105 (a, b) in `rulesData.test.ts` and `gameOver.test.ts`; FR-097 also in `ui/territory.test.tsx`.
- Verify: the gate below.
- Objection: the human's log entry is every order the store applied, in order, including ones later
  lowered or cancelled (sell 2, then sell 1). The replay is exact, but the log is not a list of final
  orders; a v3 replay viewer may want to compact it.

Red before green:
- `npx vitest run tests/engine/secondNation.test.ts`: `Test Files 1 failed (1)`, `Failed to resolve
  import "@/engine/ai/players"` (no registry yet).
- FR-101, with `promoteFreightCars` in place and production unchanged: 4 failed, among them
  `expected 48 to be 45` (3 more units shipped in the turn the cars were ordered) and the forecast
  `{ mouths: 7, fed: 3, ... }` instead of nobody fed.
- `npx vitest run tests/store/computerNations.test.ts`: 8 of 9 failed (the state after End Turn
  differed: nation 2 gave no orders; `orderLog` undefined; `startNewGame is not a function`).

Decisions (each with its objection):
- Nation 2 is "Valdoria" (fictional), `capital-2` on `CAPITAL_SITES[1]` (14-9), slot 2, scripted.
  Objection: none.
- Colours: kept the M3.5 tokens `--color-nation-1` #a8322d (muted red) and `--color-nation-2` #2c5c9e
  (muted blue), already part of the approved look; only how a nation picks its token changed.
  Objection: the red is close to `--color-bad` (the unconnected depot ring); part B may want to check.
- `Nation.controller` is required; every test-fixture nation is "human", so the fixture-based store
  and UI tests resolve exactly as before. Objection: none.
- Freight cars reuse `transportCapacityPendingIncrease`: ordered cars before the production phase,
  built cars after it, added to `transportCapacity` by `promoteFreightCars` after every phase. No new
  field. Objection: the field means two things within one turn; nothing reads it between production
  and housekeeping (labour is only checked in the order phase).
- `startNewGame` is a store action only; no New game button yet (part B). The FR-022 test leaves it
  out of the "no other action changes the game" sweep because it replaces the game.
- FR-100 is within the ~40-line budget (about 20 lines in `gameSlice.ts`), so it records the human's
  orders too, not only the AI's.
- The scripted player needed no change for FR-102 (numbers below).
- The M3.5 entries moved to `docs/journal/archive-M3.5.md` to keep this file under 400 lines.

Nation 2 in 10 turns (seed 1, nation 1 idle, `tests/engine/secondNation.test.ts` FR-102): resource
levels 5 to 17, 10 rail links, score 240 to 310 (treasury 50,
industry 90, development 170), cash $10,000 to $5,017, freight cars 15 to 21, no order refused. Seeds
2, 3, 7 and 42 give the same levels and rail, 12 developments finished and 9 resources found,
and scores 306 to 313 (a throwaway probe, not committed).

Tests whose expectation the new FRs made wrong, and were updated (none skipped or deleted):
- `startWorld.test.ts`: FR-080 raised levels next to both capitals; FR-081 nation 1's workers and
  tiles only; FR-082's "island 2 unclaimed" now holds for the empty map, and the new game gives it to
  nation 2. `newGame.test.ts` FR-081 and `gameStore.test.ts` FR-027: two nation ids.
- `productionSystem.test.ts`, the two FR-039 car rows: the built cars wait in the pending count.
- `territory.test.tsx` FR-087: two nations' borders; `accessibleNames.test.tsx` FR-095: the "not
  owned" orchard is made by the test (no land is unowned now).
- `gameStore.test.ts` FR-022 leaves out `startNewGame`; FR-018 also checks `orderLog`, `ordersThisTurn`.
- e2e: two capitals (islands), both nations ranked instead of "nation 1 is rank 1" (game over), the
  player's workers and rail picked by the new `data-nation-id` (look, play-turns), the player's
  capital in the cursor spec's wait.

NR-016 ("orders can be changed until End Turn and take effect when the turn ends"): other orders whose
effect shows within the same turn. Listed, not changed:

| Order | What shows at once | Reversible this turn |
|---|---|---|
| `moveWorker` and every `moveAnd...` order | the civilian stands on the new tile at once and cannot move again this turn | yes, `cancelWorkerAction` sends it back |
| job orders (prospect, develop, rail, depot, port, fort) | the cost leaves the treasury when ordered (FR-029), so the HUD cash and score drop at once | yes, refunded if cancelled this turn (FR-031) |
| `sellCommodity` | the offered units leave the warehouse when ordered (FR-061) | yes, a lower amount returns them |
| `buyCommodity` | the bid is paid from the treasury when ordered (FR-062) | yes, refunded |
| `changeTransportCapacity` | 1 lumber + 1 steel per car leave the warehouse; 2 labour per car show as committed (FR-039) | yes |
| `expandBuilding` | the lumber and steel leave the warehouse (FR-038, FR-057) | yes |
| `trainWorkers` | cash and paper paid at once (FR-058), and the trainee's labour is gone from this turn's pool at once | yes |
| `recruitWorkers` | canned food, clothing and furniture leave the warehouse (FR-042) | yes |

All are payments or reservations made when the order is given; none changes the map, the market or
production before End Turn, and every one can be undone until then. The one that changes this turn's
play is training (the trainee's labour is withdrawn as soon as it is ordered). `setProduction` and
`setTransportAllocations` already act only at End Turn.

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-097 to FR-099, FR-102 to FR-104 covered | `npx vitest run tests/engine/secondNation.test.ts` | `Tests 18 passed (18)` |
| FR-101 covered | `npx vitest run tests/engine/freightCars.test.ts tests/engine/systems/productionSystem.test.ts tests/engine/resolveTurn.test.ts` | `Test Files 3 passed (3)` |
| FR-099, FR-100, FR-105 (d) covered | `npx vitest run tests/store` | `Test Files 3 passed (3)` |
| Unit tests | `npm test` | `Test Files 48 passed (48)` / `Tests 691 passed (691)` (+37 on main's 654) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3 warnings as on main) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 8.1s`, `✓ Generating static pages (4/4)` |
| Smoke | `PORT=3170 npx playwright test --reporter=line --workers=1` | `1 skipped` / `15 passed (3.9m)`; the skip is the old `test.fixme` rail cursor |

The first smoke run with default workers on a cold dev server failed 13 tests, most on `page.goto:
Test timeout of 30000ms exceeded`; with `--workers=1` (as the brief allows) only the real two-nation
selector failures were left, fixed in the e2e commit.

