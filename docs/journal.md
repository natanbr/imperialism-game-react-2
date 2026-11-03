# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`.
- M0 merged (PR 9, after one review + fix round). Docs/process merged (PR 10).
- Rules knowledge base done 2026-11-03: `docs/rules/` (12 files). Code-vs-rules mismatches are
  tagged `CODE MISMATCH:` in each topic file; M2 fixes them. Top v1 gaps in `docs/rules/gaps.md`.
- Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU (data `docs/report/roadmap.json`).
- M1 part A (engine) done 2026-11-03 on branch `claude/m1-headless-core`, pushed, no PR yet:
  `src/app/engine/` (11 order kinds, validateOrder, applyOrder, resolveTurn, scripted player),
  FR-001 to FR-017 tested, `npm run test:engine` 140 green. Store and UI still reach the engine
  through adapters.
- Next: M1 part B on the same branch (list in the part A entry, "Part B must do"), then the M1
  review (Opus 5.5 high) and the app check, then the PR.

## 2026-11-02 Revival setup

Size: L (process). Decisions: continue not restart; gold $200 / gems $500; delete superseded
branches and untrack old tool configs; v3 AI scripted and LLM behind one interface. Light
flow adopted from the work-repo SDD flow; reviews batched per milestone to cut cost.

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
