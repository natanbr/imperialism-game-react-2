# Requirements

Permanent ids. Format and rules: `docs/FLOW.md`. Rows are written at spec time for each
milestone; a changed requirement gets a new id and the old row says `replaced by FR-###`.

Status values: `planned`, `tested` (test exists and is green), `replaced`, `dropped`.

## Project-level (stated by Nathan, 2026-11-02)

| Id | Requirement | Status |
|---|---|---|
| NR-001 | Nathan's involvement stays low: agents run milestones unattended and test their own work. | planned |
| NR-002 | Token use is kept low: cheaper models and scripted checks first; QA reviews may be postponed to the milestone end but never skipped. | planned |
| NR-003 | Game rules are kept as a compact knowledge base so agents never re-read the PDF manual. | planned |
| NR-004 | A visual progress page (overview, detail, blockers, decisions) is kept current at every checkpoint. | planned |
| NR-005 | Gold is worth $200 and gems $500 per unit (manual values). | planned |
| NR-006 | Nation AI (v3) supports both scripted and LLM players behind one `(view) => Order[]` interface. | planned |

## M1 Headless core

Written 2026-11-03 at the start of M1 part A (engine). Part B (store and UI wiring) adds its
own rows after FR-017.

| Id | Requirement | Status |
|---|---|---|
| FR-001 | The game engine lives in `src/app/engine/` and imports no React, Zustand, Next, `@/store` or `@/components`, and uses no DOM globals or `Math.random`/`Date.now`; an ESLint rule enforces this. | planned |
| FR-002 | `GameState` carries `seed: number`. WHEN a turn resolves THEN every random draw comes from an RNG derived only from the seed and the turn number, so no random state lives outside `GameState`. | planned |
| FR-003 | Every action the UI offers today is an `Order`, a union discriminated on `kind`. Every order names its `nationId` and its worker or tile ids explicitly; no order starts more than one worker. | planned |
| FR-004 | WHEN an order is validated THEN `validateOrder(state, order)` returns `{ ok: true }` or `{ ok: false, reason }` with a reason from a fixed string-literal union, and never changes the state. | planned |
| FR-005 | WHEN a valid order is applied THEN `applyOrder` performs its immediate effects (move the worker, start the job, charge the treasury or warehouse). WHEN the order is invalid THEN it returns the same state object unchanged. | planned |
| FR-006 | WHEN a worker order names a worker that is working THEN it is refused with `worker-busy`; WHEN the worker already moved this turn THEN it is refused with `worker-moved`. This holds for move, move-and-start, start and engineer rail-on-move. | planned |
| FR-007 | Move-and-start is all or nothing: WHEN the job cannot start on the target THEN neither the move nor the charge happens and the reason is returned (`insufficient-funds` when money is short); there is no retry with an unlimited treasury. | planned |
| FR-008 | WHEN an engineer moves onto an adjacent tile to build rail THEN the order is refused unless the engineer is available and unmoved, the tile is a valid rail site with no unfinished construction job (`tile-occupied`), and the nation can pay. | planned |
| FR-009 | WHEN a port is started (chosen or picked automatically) THEN the tile must have a river or an adjacent ocean tile, otherwise `invalid-site`. | planned |
| FR-010 | Transport orders: WHEN allocations are set THEN every amount is a non-negative number; WHEN capacity is bought THEN one coal and one iron ore per unit are taken from the warehouse and the increase is queued for next turn, all or nothing; WHEN a queued increase is reduced THEN the materials are refunded. | planned |
| FR-011 | `resolveTurn(state, ordersByNation, seed)` returns `{ state, events }`. It is the only place where the turn's orders are applied (nations in state order), the queued transport capacity is applied, all systems run, workers are reset and the turn and year advance. A rejected order produces an `order-rejected` event with its reason. | planned |
| FR-012 | Every turn system has the shape `(state, ctx) => state`, where `ctx` carries the RNG, the turn's accepted orders and an events sink. | planned |
| FR-013 | No engine function mutates its input: WHEN the input state is deep-frozen THEN orders, systems (the rail network helpers included) and `resolveTurn` run without error and the input stays deep-equal to its snapshot. | planned |
| FR-014 | Replay determinism: WHEN the same initial state and the same order list run for 10 turns twice THEN the final states are deep-equal. | planned |
| FR-015 | Two nations from `mockNation.ts` play 20 turns headlessly, each through the same order API, driven by a scripted player. Both treasuries change and after every turn no worker is on two tiles, no treasury is negative and no job is orphaned. | planned |
| FR-016 | A scripted player is a function `(state, nationId) => Order[]` in `engine/ai/scriptedPlayer.ts`; it only proposes orders that `validateOrder` accepts in sequence. | planned |
| FR-017 | Until part B wires the store to orders, the store's worker actions (`workerHelpers`, `handleEngineerMovement`, `startEngineerWork`, the worker start functions) are thin adapters over `validateOrder`/`applyOrder`, so FR-006 to FR-009 hold in the running app. | planned |
