# Journal archive: M1 headless core

Moved from `docs/journal.md` on 2026-11-03 at the start of M2 (FLOW: the journal stays under 400
lines; a milestone's entries are archived when it ends). The entries are unchanged.

## 2026-11-03 M1 part A: headless core, engine only

Size: L (milestone part). Night shift, one agent (Opus 5.5), no subagents, no advisor calls.
Branch `claude/m1-headless-core` from `origin/main` a976dc0. `npm ci` ran without a path error.

Plan-lite:
- Change: new `src/app/engine/` (Order union, validate, apply, resolveTurn, systems as
  `(state, ctx)`, turn RNG, scripted player). Old paths (`src/app/systems/*`,
  `store/helpers/*`, worker start functions, `turnSlice.advanceTurn`) become thin adapters.
- Consumers: the store and UI through the adapters today; part B makes the store submit
  orders directly; v3 AI players call `validateOrder`/`applyOrder`/`resolveTurn`.
- Test rows: FR-001 `lintGuard`; FR-002 `rng`, `resolveTurn` (seed), `determinism`
  (interleaving); FR-003/004 `validate`; FR-005 `apply`; FR-006 to FR-009 `validate`, `apply`,
  `legacyAdapters`; FR-010 `validate`, `apply`; FR-011/012 `resolveTurn`, `purity`; FR-013
  `purity`, `apply`, `resolveTurn`; FR-014 `determinism`; FR-015/016 `twoNations`; FR-017
  `legacyAdapters` plus the pre-M1 store and worker tests (all green through the adapters).
- Verify: `npm run test:engine`, `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Objection: two ways to give orders exist (applyOrder now, or the order list to resolveTurn);
  they could drift. Mitigated by the test "giving the orders to resolveTurn equals applying
  them first and resolving with none"; part B should pick one path for the UI.

Tasks:

| Task | FRs | Commit |
|---|---|---|
| T-01 [test+impl] engine package, lint guard, `seed`, turn RNG, `test:engine` | FR-001, FR-002 | 0077a38 |
| T-02 [impl] move systems and pure helpers into the engine, `(state, ctx)`, adapters | FR-012 | 6cd41c1 |
| T-03 [test+impl] rail network helpers stop mutating the input | FR-013 | 276f97e |
| T-04 [test+impl] Order, validateOrder, applyOrder, legacy adapters, 4 bug fixes | FR-003 to FR-010, FR-017 | 2ff5762 |
| T-05 [test+impl] resolveTurn; `advanceTurn` delegates to it | FR-002, FR-011, FR-012 | 2f6d1b2 |
| T-06 [test+impl] scripted player, replay and two-nation 20-turn tests | FR-014 to FR-016 | 8f467e6 |
| T-07 [docs] journal, requirement status | all | this commit |

Red summaries (each test file written and run before its code):
- T-01: `Test Files 2 failed (2)` / `Tests 10 failed | 1 passed (11)`; rules missing and
  `Cannot find module '@/engine/rng'`.
- T-03: `Tests 5 failed (5)`; `TypeError: Cannot add property 3,1, object is not extensible`
  (addRailroad pushed into the frozen input's graph).
- T-04: `Test Files 3 failed | 3 passed (6)` / `Tests 100 failed | 24 passed (124)`. Stubs threw
  `not implemented`; the 7 legacy regression tests failed on the real bugs, for example
  `expected 'port' not to be 'port'` (startEngineerWork, inland port) and
  `expected { workerId: 'nation-1-engineer', …(3) } to deeply equal { workerId: 'someone-else', …(3) }`
  (rail-on-move overwrote another job).
- T-05: `Tests 10 failed (10)`; `Error: not implemented`.
- T-06: `Tests 4 failed | 2 passed (6)`; empty player, `expected 0 to be greater than 20`.

Green summary: `npm run test:engine` `Test Files 9 passed (9)` / `Tests 140 passed (140)`;
`npx vitest run` `Test Files 19 passed (19)` / `Tests 231 passed (231)` (91 before M1).

Evidence:

| Claim | Command | Result (quoted) |
|---|---|---|
| Baseline before M1 | `npx vitest run`, `npm run lint`, `npx tsc --noEmit` | `Tests 91 passed (91)`; `✖ 10 problems (0 errors, 10 warnings)`; exit 0 |
| FR-001 engine guard | `npx vitest run tests/engine/lintGuard.test.ts` | `11 tests` passed (react, zustand, `@/store`, `../store/...`, `@/components`, `next/link`, window, document, Math.random, Date.now refused; types allowed) |
| FR-003 to FR-010 orders | `npx vitest run tests/engine/validate.test.ts tests/engine/apply.test.ts` | `Tests 95 passed (95)` |
| FR-006 to FR-009, FR-017 bugs closed | `tests/engine/legacyAdapters.test.ts` | `10 tests` passed (7 were red before the fix) |
| FR-011, FR-012, FR-002 turn | `tests/engine/resolveTurn.test.ts` | `10 tests` passed |
| FR-013 purity | `tests/engine/purity.test.ts` + frozen inputs in apply/validate/resolveTurn | `5 tests` passed |
| FR-014 replay | `tests/engine/determinism.test.ts` | `3 tests` passed |
| FR-015, FR-016 two nations | `tests/engine/twoNations.test.ts` | `3 tests` passed; turn 21, year 1905, 0 rejected orders, treasuries 1000/800 → 300/200, 34 constructions and 31 developments completed |
| All tests | `npx vitest run` | `Test Files 19 passed (19)` / `Tests 231 passed (231)` |
| Lint | `npm run lint` | `✖ 8 problems (0 errors, 8 warnings)` (all in files M1 did not create; was 10) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 1960ms`, exit 0 |
| App check | not run | Playwright reuses any server on :3000 (`reuseExistingServer`), possibly another worktree's; left for the M1 app check |

Decisions taken alone (safest default), each open to review:
- Objection: the engine's move-and-start is all or nothing for every reason. The store
  adapter keeps the old UI fallback: a job refused for a reason other than money still makes
  the plain (validated) move. Part B decides whether to keep that fallback.
- Objection: a worker that moved and started a job now stays marked as moved (was reset), and
  cancelling that job leaves it `moved` (was `available`); a second cancel sends it home. This
  closes the second move per turn (FR-006). One old assertion in `minerWorker.test.ts` changed
  from `available` to `moved` for this reason.
- Objection: `minerWorker.test.ts` shared one mutable base state, so the same worker id stood on
  several tiles; each test now uses `structuredClone(baseState)`. No assertion changed.
- Objection: validation adds terrain rules the old start functions lacked (prospecting only on
  prospectable terrain; each development worker only on its terrains, the generic developer
  anywhere). The UI already offered only these, so nothing visible changes.
- Objection: rail through `startConstruction` keeps the old rule (no rail-site check; an old
  test builds rail on the capital tile). Only rail-on-move checks the site. Cancelling a job
  still refunds nothing. Both are rules questions for M2, not M1.
- Objection: `changeTransportCapacity` is all or nothing (the store action bought as many as
  coal and iron allowed); the Capital dialog already clamps to the affordable amount.
- Objection: the store seed is fixed at 1 until a new-game flow exists. The RNG formula is the
  old one, now fed `state.seed` instead of the year; it only draws for a prospect on a tile
  without a resource, which the UI cannot start.
- Objection: debug and setup setters (`setTransportNetwork`, `setNationTransportCapacity`,
  `setNations`, `setMap`, `setOilDrillingTech`, `setActiveNation`, `addNews`) are not orders:
  no UI control calls them and they are not player actions.
- Objection: the two-nation fixture (`createTwoNationGame` in `mockNation.ts`) hides gold next
  to each capital so both nations keep an income and the 20-turn game stays active after turn 3.

Part B must do:
- Remove the adapters: `src/app/systems/{developmentSystem,logisticsSystem,transportConnectivitySystem,railroadSystem,runTurnPhases,utils/rng}.ts`,
  `store/helpers/{treasuryHelpers,workerHelpers}.ts`, the engine re-exports in
  `store/helpers/mapHelpers.ts` (keep `computeRailSegmentsPixels`, it is view code),
  `workers/startEachWorker.ts`, the `start*Work` functions and `handleEngineerMovement`; move the
  old tests in `tests/systems`, `tests/store`, `tests/workers` that import them to the engine API.
- Store and UI call sites that still bypass orders: `nationSlice.purchaseTransportCapacityIncrease`
  (CapitalModal) and `transportSlice.setTransportAllocations` (useTransportAllocations) keep their
  own logic; `workerActionsSlice` reaches the engine only through the adapters;
  `turnSlice.advanceTurn` passes no orders and drops the events.
- UI state inside GameState: `activeNationId`, `turnOrder` (a constant), `newsLog`, worker
  `jobDescription` (display text), job `completed`/`completedOnTurn` ("for UI pulse"); and the
  store passes its whole object (camera, overlay, selection, controls, actions) into the engine.

## 2026-11-03 M1 part B: store and UI on the order API

Size: L (milestone part). Night shift, one agent (Opus 5.5, xhigh), no subagents, no advisor
calls. Branch `claude/m1-headless-core` at 1b79ff3 (part A). `npm ci` ran clean.

Plan-lite:
- Change: the store holds one `GameState` under `game` beside the UI state; `submitOrder(order)`
  (validate, then apply) is the only way the UI changes the game; `advanceTurn` calls
  `resolveTurn(game, {}, game.seed)` and keeps the events; UI fields leave `GameState`; the
  part A adapters go and their tests move onto the engine API.
- Consumers: every component and hook that changed game state (tile click, tile panel,
  construction dialog, capital slider, transport sliders, End turn); M4/v3 AI players, which
  plug into the same `resolveTurn` call.
- Test rows: FR-018 store shape (`tests/store/gameStore.test.ts`); FR-019 seed (same file);
  FR-020, FR-021 submit and turn (`gameStore.test.ts`, spies in `engineBoundary.test.ts`);
  FR-022 source scan (`uiWritesOnlyOrders.test.ts`); FR-023 click policy
  (`tests/ui/tileClickOrders.test.ts`, the part A fallback tests move here); FR-024 text
  helpers (`tests/ui/gameText.test.ts`); FR-025 `e2e/play-turns.spec.ts`.
- Verify: `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`,
  `PORT=3123 npx playwright test`.
- Objection: orders apply when submitted, so `resolveTurn` gets no orders from the UI and the
  store keeps no order log; a replay of a played game is not possible from the store alone.
  Chosen because part A's `applyOrder` already does the immediate effects the UI must show
  (the worker moves, the money goes), and `resolveTurn(s, orders)` equals applying them first.

Tasks:

| Task | FRs | Commit |
|---|---|---|
| T-08 [docs] FR-018 to FR-025, plan; FR-017 replaced | all | 02eb02c |
| T-09 [refactor] `GameState` loses `activeNationId`, `newsLog`, `turnOrder` | FR-018 | 0c827a0 |
| T-10 [test+impl] store = `game` + UI state, `submitOrder`, `advanceTurn`, seed, event log, HUD news, click policy; components and hooks build orders | FR-018 to FR-024 | 2941fae |
| T-13a [test] Playwright port from `PORT`, own dev server | FR-025 | 678ef21 |
| T-13b [test+fix] e2e plays three turns; edge scroll over the HUD fixed | FR-025 | 878b454 |
| T-12 [refactor] adapters removed, old tests on the engine API | FR-017 replaced | 6e985a3 |
| T-11 [test+impl] worker job text derived (`workerJobLabel`), not stored | FR-018, FR-024 | 8d93964 |
| T-14 [docs] `ARCHITECTURE.md` rewritten | none | 498610a |
| T-15 [docs] journal, requirement status, screenshot | all | this commit |

Red summaries (tests written and run before the code):
- T-10: `Test Files 5 failed (5)` / `Tests 20 failed | 3 passed (23)`;
  `TypeError: (0 , createGameStore) is not a function` (18), `Cannot find module
  '@/hooks/tileClickOrders'`, `Cannot find module '@/components/gameText'`, and the source scan
  `expected [ …(4) ] to deeply equal []` (4 UI files still called pre-M1 store actions).
- T-13b: first `element(s) not found` for `[data-tile-id="20-20"]` (tiles had no id); then,
  after the second Advance Turn, `locator.click: Test timeout of 30000ms exceeded` with
  `element is not stable`: the map slid down by itself (edge scroll, see decisions).
- T-11: `Test Files 3 failed | 19 passed (22)` / `Tests 12 failed | 258 passed (270)`;
  `TypeError: (0 , workerJobLabel) is not a function` (11) and
  `expected { id: 'nation-1-farmer', …(8) } to not have property "jobDescription"`.

Green summary: `npx vitest run` `Test Files 22 passed (22)` / `Tests 270 passed (270)`. From
231 after part A: +52 in the new store and UI files (8 of them are part A adapter tests moved
there, 1 is the old turnSlice test), -11 in removed files (`legacyAdapters.test.ts` 10,
`turnSlice.test.ts` 1), -2 for the dead treasury ledger. `npm run test:engine`
`Tests 196 passed (196)`.

Evidence:

| Claim | Command | Result (quoted) |
|---|---|---|
| Baseline at part A | `npx vitest run`, `npm run lint`, `npx tsc --noEmit` | `Tests 231 passed (231)`; `✖ 8 problems (0 errors, 8 warnings)`; exit 0 |
| FR-018 to FR-022 store | `npx vitest run` | `tests/store/gameStore.test.ts (17 tests)`, `engineBoundary.test.ts (2 tests)`, `industrySlice.test.ts (7 tests)` passed |
| FR-022 to FR-024 UI | `npx vitest run` | `tests/ui/tileClickOrders.test.ts (20 tests)`, `gameText.test.ts (9 tests)`, `uiWritesOnlyOrders.test.ts (4 tests)` passed |
| Old tests on the engine API | `npx vitest run` | `tests/engine/orders/workPricesRegressions.test.ts (23 tests)`, `workPrices.test.ts (11 tests)`, `startConstruction.test.ts (13 tests)`, `tests/engine/systems/*` 19 tests, `tests/workers/minerWorker.test.ts (15 tests)` passed |
| All unit tests | `npx vitest run` | `Test Files 22 passed (22)` / `Tests 270 passed (270)` |
| Lint | `npm run lint` | `✖ 4 problems (0 errors, 4 warnings)` (was 8; the 4 left are older: a hook dependency, `industrySlice.ts`, `logisticsSystem.test.ts` twice) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 1875ms`, `✓ Generating static pages (4/4)` |
| FR-025 and the smoke suite | `PORT=3123 npx playwright test --reporter=list` (3123 free before; this checkout's server) | `1 skipped` / `7 passed (23.2s)`, including `play-turns.spec.ts … three times (4.2s)` |
| App check screenshot | same run with `SCREENSHOT_PATH=docs/journal/m1-screenshot.png` | turn 3, cash 400, prospector selected, rail from 20-20 to 19-20, news "Rail finished at 19-20." |

Part A's UI leftovers in `GameState` (part B item 5):
- `activeNationId`: moved to the store. It says which nation this client plays; the engine
  treats every nation alike and takes orders for any of them.
- `turnOrder`: removed. A constant copy of the phase names; `TURN_PHASES` in the engine is the
  real order and nothing read the copy.
- `newsLog`: removed. The store's `eventLog` keeps the engine's events per turn for the HUD.
- worker `jobDescription`: removed. Display text, now derived by `workerJobLabel(tile, worker)`.
- job `completed` / `completedOnTurn`: kept, because the engine's rules read them (objection
  below).

Tests deleted (all others moved with their assertions):
- `legacyAdapters.test.ts` "startEngineerWork never picks a port on an inland tile" and "picks a
  port on a coastal tile that already has a depot": the automatic construction kind had no
  caller and is removed; the port-site rule is covered by the FR-009 rows of `validate.test.ts`.
  Its other 8 tests moved to `tests/ui/tileClickOrders.test.ts` (same assertions, now through
  the click policy).
- `workPricesRegressions.test.ts` "treasury ledger" (2 tests): `createTreasuryLedger` had no
  caller after part A and is deleted.

Decisions taken alone (safest default), each open to review:
- Objection: a click whose job is refused for a reason other than money still moves the
  worker (the pre-M1 fallback, kept as UI policy in `hooks/tileClickOrders.ts`). When that plain
  move is accepted it clears the refusal, so the HUD does not say why the job did not start.
  Dropping the fallback would show the reason, but the click would no longer move a prospector
  onto a prospectable tile without a hidden resource, which the cursor still offers.
- Objection: the job flags `completed` / `completedOnTurn` stay in `GameState`. They began as
  the "done" pulse, but the engine's rules read them: a finished development job blocks a new
  one on that tile for one more turn. Removing them changes that rule; M2 should settle it from
  the rules, and then the pulse can read the completion events in the store's `eventLog`.
- Objection: `submitOrder` refuses orders for a nation other than `activeNationId`
  (`not-owner`). New rule; a hot-seat or debug view must switch the active nation first.
- Objection: the debug and setup setters (`setNations`, `setNationTransportCapacity`, `setMap`,
  `setOilDrillingTech`, `setActiveNation`, `addNews`, `setTransportNetwork`) went with their
  slices; no code called them. Oil drilling tech can no longer be switched on from the console;
  a technology order belongs to a later milestone.
- Objection: Playwright never reuses a running server unless `PW_REUSE_SERVER=1` (before, it
  reused one outside CI). A run on a busy port now fails instead of testing the wrong app.
- Objection: fixed a bug the new e2e test found. The map's edge scroll ran while the mouse was
  on the HUD near the bottom edge, so clicking Advance Turn slid the map down until the mouse
  moved; the new news panel makes the HUD taller and put the button in that zone. Over the HUD
  only the right edge scrolls now. No unit test; the e2e spec is the regression test (it failed
  with `element is not stable` before the fix).
- Objection: the construction dialog sends `startConstruction` (the engineer stands on the
  tile) instead of `moveAndStartConstruction`; validation is the same for a worker on its own
  tile. The capital's capacity slider moves only when its order is accepted.
- Objection: a new game draws its seed with `Math.random` in the store. The seed shows in the
  HUD's debug box only once a tile is selected, so the server-rendered page never disagrees
  with the browser about it.
- Objection: `getProspectorActions` printed eight `console.log` lines for every tile on every
  render while a prospector was selected; removed together with `startProspectorWork` from the
  same file.
- Not done: `docs/REVIVAL_PLAN.md` section 6 still says rules live in `manual.md` (orchestrator
  file, outside part B). `store/industrySlice.ts` stays unwired and mutating until M2.

How to see it in the app: `npm run dev`, click the farmer on the capital (20-20), then the farm
east of it (21-20): the farmer moves and works, cash drops to 500. Press Advance Turn: the HUD
shows "News, turn 1 (1900)". Select any tile to see the game's seed in the debug box.

## 2026-11-03 M1 review fix round

Size: S (review fixes). Night shift, one agent (Opus 5.5), no subagents, no advisor calls.
Detached checkout of `origin/claude/m1-headless-core` at 25e61d3. `npm ci` ran clean.

Fixes:
- FR-026 (new): `validate.ts` checks `Object.hasOwn(CONSTRUCTION_COST, structure)` instead of
  `structure in CONSTRUCTION_COST`; `logisticsSystem.ts` checks `Object.hasOwn(newWarehouse, key)`.
  The warehouse key comes from data: the collected resources come from the map's tiles and the
  plan from the `setTransportAllocations` order, both untrusted JSON in a replay log. Before, a
  key such as `toString` wrote a string into the warehouse.
- Lint guard (FR-002): `new Date()` with no argument (`no-restricted-syntax`), `performance.now()`
  (`no-restricted-properties`, next to `Date.now`, because it also catches
  `const { now } = performance`) and the `crypto` global (`no-restricted-globals`).
  `new Date(x)` with an argument stays allowed; it does not read the clock.
- Replay test that draws from the RNG (`tests/engine/determinism.test.ts`): three turns from a
  blind prospect built directly; seed 3 twice gives deep-equal states, seed 4 finds another
  mineral.
- Objection: no order can reach the random draw today (validate refuses prospecting a tile with
  no resource), so the test builds the state directly; fix in M2.

Red summaries (tests written and run before the code):
- FR-026: `Test Files 2 failed (2)` / `Tests 5 failed | 85 passed (90)`; for `toString`
  `expected { ok: true } to deeply equal { ok: false, reason: 'invalid-target' }`.
- Lint guard: `Test Files 1 failed (1)` / `Tests 4 failed | 11 passed (15)`.
- RNG replay test: passed at once (the behaviour already works). With `createTurnRng` changed
  for one run to ignore the seed: `Tests 1 failed | 3 passed (4)`,
  `AssertionError: expected 'ironOre' not to be 'ironOre'`. Reverted; `git status` showed
  `rng.ts` unchanged.

Evidence:

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-026 rows and the warehouse test | `npx vitest run tests/engine/validate.test.ts tests/engine/systems/logisticsSystem.test.ts` | `Test Files 2 passed (2)` / `Tests 90 passed (90)` |
| Lint probes | `npx vitest run tests/engine/lintGuard.test.ts` | `Test Files 1 passed (1)` / `Tests 15 passed (15)` |
| RNG replay test | `npx vitest run tests/engine/determinism.test.ts` | `Tests 4 passed (4)` |
| All unit tests | `npx vitest run` | `Test Files 22 passed (22)` / `Tests 280 passed (280)` (270 + 10 new) |
| Lint | `npm run lint` | `✖ 4 problems (0 errors, 4 warnings)` (the same 4 older warnings) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 1970ms`, `✓ Generating static pages (4/4)` |

Commits: b425ee9 (FR-026), 15bdc6e (lint guard), 736365a (RNG replay test), this commit (journal).
