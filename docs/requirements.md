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
| FR-001 | The game engine lives in `src/app/engine/` and imports no React, Zustand, Next, `@/store` or `@/components`, and uses no DOM globals or `Math.random`/`Date.now`; an ESLint rule enforces this. | tested |
| FR-002 | `GameState` carries `seed: number`. WHEN a turn resolves THEN every random draw comes from an RNG derived only from the seed and the turn number, so no random state lives outside `GameState`. | tested |
| FR-003 | Every action the UI offers today is an `Order`, a union discriminated on `kind`. Every order names its `nationId` and its worker or tile ids explicitly; no order starts more than one worker. | tested |
| FR-004 | WHEN an order is validated THEN `validateOrder(state, order)` returns `{ ok: true }` or `{ ok: false, reason }` with a reason from a fixed string-literal union, and never changes the state. | tested |
| FR-005 | WHEN a valid order is applied THEN `applyOrder` performs its immediate effects (move the worker, start the job, charge the treasury or warehouse). WHEN the order is invalid THEN it returns the same state object unchanged. | tested |
| FR-006 | WHEN a worker order names a worker that is working THEN it is refused with `worker-busy`; WHEN the worker already moved this turn THEN it is refused with `worker-moved`. This holds for move, move-and-start, start and engineer rail-on-move. | tested |
| FR-007 | Move-and-start is all or nothing: WHEN the job cannot start on the target THEN neither the move nor the charge happens and the reason is returned (`insufficient-funds` when money is short); there is no retry with an unlimited treasury. | tested |
| FR-008 | WHEN an engineer moves onto an adjacent tile to build rail THEN the order is refused unless the engineer is available and unmoved, the tile is a valid rail site with no unfinished construction job (`tile-occupied`), and the nation can pay. | tested |
| FR-009 | WHEN a port is started (chosen or picked automatically) THEN the tile must have a river or an adjacent ocean tile, otherwise `invalid-site`. | tested |
| FR-010 | Transport orders: WHEN allocations are set THEN every amount is a non-negative number; WHEN capacity is bought THEN one coal and one iron ore per unit are taken from the warehouse and the increase is queued for next turn, all or nothing; WHEN a queued increase is reduced THEN the materials are refunded. | replaced by FR-039 (freight cars cost lumber, steel and labour) |
| FR-011 | `resolveTurn(state, ordersByNation, seed)` returns `{ state, events }`. It is the only place where the turn's orders are applied (nations in state order), the queued transport capacity is applied, all systems run, workers are reset and the turn and year advance. A rejected order produces an `order-rejected` event with its reason. | tested |
| FR-012 | Every turn system has the shape `(state, ctx) => state`, where `ctx` carries the RNG, the turn's accepted orders and an events sink. | tested |
| FR-013 | No engine function mutates its input: WHEN the input state is deep-frozen THEN orders, systems (the rail network helpers included) and `resolveTurn` run without error and the input stays deep-equal to its snapshot. | tested |
| FR-014 | Replay determinism: WHEN the same initial state and the same order list run for 10 turns twice THEN the final states are deep-equal. | tested |
| FR-015 | Two nations from `mockNation.ts` play 20 turns headlessly, each through the same order API, driven by a scripted player. Both treasuries change and after every turn no worker is on two tiles, no treasury is negative and no job is orphaned. | tested |
| FR-016 | A scripted player is a function `(state, nationId) => Order[]` in `engine/ai/scriptedPlayer.ts`; it only proposes orders that `validateOrder` accepts in sequence. | tested |
| FR-017 | Until part B wires the store to orders, the store's worker actions (`workerHelpers`, `handleEngineerMovement`, `startEngineerWork`, the worker start functions) are thin adapters over `validateOrder`/`applyOrder`, so FR-006 to FR-009 hold in the running app. | replaced by FR-022, FR-023 (part B removed the adapters) |

### M1 part B: store and UI on the order API

Written 2026-11-03 at the start of M1 part B.

| Id | Requirement | Status |
|---|---|---|
| FR-018 | The store holds exactly one engine `GameState` under `game` and keeps UI and session state beside it (camera, overlays, selection, modal flags, the active nation, the last refused order, the event log). `GameState` carries no UI fields: `activeNationId`, `newsLog`, `turnOrder` and the worker's `jobDescription` are gone. Only `game` is ever passed to the engine. | tested |
| FR-019 | WHEN a new game starts THEN it gets a seed, stored in `game.seed`: the one given, or else one drawn at random. Test fixtures use seed 1. | tested |
| FR-020 | WHEN the UI submits an order THEN `submitOrder(order)` validates it against `game` with the engine and returns the result: a valid order replaces `game` with the engine's result and clears the last refusal; a refused order leaves `game` untouched and keeps `{ order, reason }` in UI state; an order for a nation other than the active one is refused with `not-owner`. | tested |
| FR-021 | Orders take effect when submitted. WHEN the turn ends THEN `advanceTurn` calls `resolveTurn(game, {}, game.seed)`, stores the returned state, appends `{ turn, year, events }` to the event log (the last 20 turns are kept) and clears the last refusal. | tested |
| FR-022 | Every UI action that changes the game is an order sent through `submitOrder`: tile clicks, the tile panel's start and cancel buttons, the construction dialog, the capital's capacity slider and the transport allocation sliders. No component or hook writes game state or calls the engine's apply or resolve functions. | tested |
| FR-023 | A tile click with a worker selected tries its orders in turn and stops at the first one accepted or at `insufficient-funds`: a job on another tile is tried as move-and-start, then as a plain move (pre-M1 behaviour); an engineer moving next to its rail network tries rail-on-move first, then the plain move. Every order carries the active nation's id. | tested |
| FR-024 | The worker's job text is derived for display from the tile's job and the worker's status (`workerJobLabel`: "Mining to level 1", "Constructing depot", "Prospecting", "Moved"). The HUD shows the last turn's events and the last refused order in plain words. | tested |
| FR-025 | In the running app a player can, three turns in a row, select a worker, move it and start a job, and end the turn, with no console errors (`e2e/play-turns.spec.ts`). Playwright reads its port from `PORT` (default 3000) and starts this checkout's dev server unless `PW_REUSE_SERVER=1`. | tested |

### M1 review fix round

Written 2026-11-03 after the M1 review.

| Id | Requirement | Status |
|---|---|---|
| FR-026 | Orders and data keys are validated against own keys only (untrusted JSON from replay logs and AI players): a name that exists only on `Object.prototype` (`toString`, `constructor`, `__proto__`) is refused as an order target and never written into a nation's warehouse. | tested |

## M2 Economic loop

Written 2026-11-03 at the start of M2 part A (engine). Sources: `docs/rules/01` to `05`; open
numbers reference `docs/rules/gaps.md`. Part B (UI) adds its own rows after these.

| Id | Requirement | Status |
|---|---|---|
| FR-027 | Calendar: a new game starts on turn 1 in Spring 1815. Each turn is one season (Spring, Summer, Fall, Winter, in that order) and the year advances after Winter. `seasonOf(turn)` gives the season. | planned |
| FR-028 | Job durations come from one table (`definisions/workerDurations.ts`): prospecting 1 turn, rail 1, depot 3, port 3, fort 3, every development level 3 for every worker type. `constants/gameConstants.ts` holds no durations. [NEEDS CLARIFICATION] gaps.md A4: level-ups other than the miner's and the forester's first are not documented; default 3. | planned |
| FR-029 | Job costs, charged when the job is ordered: development to level 1, 2, 3 costs $100, $1,000, $5,000; depot $2,000; port $3,000; fort level 1 $5,000; rail by the terrain of the tile it is built on: $100 on farm, plains, desert and other flat land, $150 on tundra and either forest, $200 on hills, $300 on swamp. [NEEDS CLARIFICATION] gaps.md B3: rail on mountains is not documented, default $300; gaps.md A4: prospecting is not documented, default $100. | planned |
| FR-030 | Construction sites (refused with `invalid-site`): rail only where `canBuildRailAt` allows (also for `startConstruction`), and not on hills (barren or fertile) before Compound Steam Engine, swamp before Iron Railroad Bridge, mountains before Dynamite; a depot not on a tile with a depot and not next to a depot, a port or the capital (gaps.md F6: "not adjacent"), and not on hills before Compound Steam Engine; a port not where a port already is and not on hills or mountains; a fort only where the fort level is 0 (the capital counts as level 1; levels 2 and 3 need technology). A technology counts when `technologyState.technologies` holds it with `purchased: true`. | planned |
| FR-031 | WHEN a job ordered this turn is cancelled THEN its cost is refunded (rules 03: orders can be cancelled until End Turn and the cash comes back). WHEN a job ordered on an earlier turn is cancelled THEN it stops without a refund. | planned |
| FR-032 | A finished job leaves its tile in the resolution that finishes it: the worker is available next turn, another job may start on the tile next turn, and the completion event is the only trace. Jobs carry no `completed` or `completedOnTurn` flags. The map's "done" mark reads the last turn's completion events. | planned |
| FR-033 | Every nation has the production buildings textile mill, lumber mill, steel mill (mills, start capacity 2), clothing factory, furniture factory, metal works (factories, start capacity 1), refinery (a mill, capacity 0 until built, only after Oil Drilling) and food processing (no capacity limit). Standing production orders are kept between turns, except food processing, whose orders are cleared after each production phase. [NEEDS CLARIFICATION] gaps.md A6: a new game starts with the six mills and factories built (the Introductory and Easy rule and the gaps.md fallback). | planned |
| FR-034 | Recipes per output unit (rules 05 section 2): fabric 2 cotton-or-wool (any mix); clothing 2 fabric; lumber or paper 2 timber (one shared capacity); furniture 2 lumber; steel 1 coal + 1 iron ore; hardware or armaments 2 steel (one shared capacity); fuel 2 oil; each takes 2 labour. Canned food is made in batches of 2 cans from 2 grain + 1 fruit + 1 livestock-or-fish + 2 labour. [NEEDS CLARIFICATION] gaps.md B6: a single can for one odd labour unit is not modelled; canned food orders are even. | planned |
| FR-035 | Labour: a nation's labour is untrained x1 + trained x2 + expert x4, not counting sick workers and workers in training. Standing production orders and the freight cars ordered this turn (2 each) commit labour. `labourOf(nation)` returns `{ total, committed, free }`. | planned |
| FR-036 | `setProduction { nationId, building, output?, amount }` sets the building's standing order for that output (default: the building's first output). Refused: an unknown or unbuilt building or an output it does not make (`invalid-target`); an amount that is not a non-negative integer, or odd for canned food (`invalid-amount`); an amount above the building's capacity less its other output's order (`limit-reached`); an amount whose inputs exceed the warehouse stock (`insufficient-resources`) or whose labour, with all other standing orders, exceeds the nation's labour (`insufficient-labour`). Lowering an order is always accepted. Applying it changes nothing but the order. | planned |
| FR-037 | Production phase: WHEN a turn resolves THEN, for each nation, the freight cars ordered are built first and then each building in a fixed order produces min(order, capacity, what the warehouse inputs allow, what the remaining labour allows). Inputs and labour are taken as each runs; all outputs reach the warehouse after every building ran, so a product made this turn is not an input this turn. Each product made gives a `goods-produced` event. No warehouse stock ever becomes negative. | planned |
| FR-038 | `expandBuilding { nationId, building }` raises a capped building one step: mills and the refinery 0, 2, 4, 8, 16, 24, then +8; factories 0, 1, 2, 4, 8, 12, then +4 (0 to the first step is the first construction). It costs 1 lumber + 1 steel per capacity point added, taken when ordered, all or nothing (`insufficient-resources`), no labour. The new capacity counts from next turn (after this turn's production phase) and gives a `building-expanded` event. Food processing, and the refinery before Oil Drilling, are refused (`invalid-target`). | planned |
| FR-039 | Transport orders: allocations are non-negative numbers (as FR-010). `changeTransportCapacity` with `delta > 0` orders freight cars: 1 lumber + 1 steel per car taken from the warehouse at once and 2 labour per car committed, all or nothing (`insufficient-resources`, `insufficient-labour`); a negative delta gives back part of this turn's order with a refund. The cars are built in the production phase, count for this turn's shipping, and give a `freight-cars-built` event; a car the labour no longer covers is not built and its materials are refunded. | planned |
| FR-040 | Food: WHEN a turn resolves, after shipments reach the warehouse, THEN every industrial worker eats 1 food. Workers are fed experts first, then trained, then untrained; worker slot i in that order prefers grain, fruit, grain, livestock-or-fish, repeating. First every slot eats its preferred raw food, then the unfed eat canned food, then any other raw food (the worker is sick: no labour next turn), and a worker with nothing starves and leaves the workforce. Events `workers-sick` and `workers-starved` report the counts. [NEEDS CLARIFICATION] gaps.md B7: who goes hungry first is not documented; default the untrained, and sickness lasts until the next meal. | planned |
| FR-041 | Training: `trainWorkers { nationId, from, delta }` trains untrained to trained for $100 + 1 paper each, or trained to expert for $1,000 + 2 paper each, paid when ordered (a negative delta cancels this turn's trainees with a refund). Refused: experts (`invalid-target`), more trainees than healthy workers of that grade (`invalid-amount`), not enough cash (`insufficient-funds`) or paper (`insufficient-resources`), or a trainee's labour that is not free (`insufficient-labour`). A trainee gives no labour this turn and is promoted at the end of the production phase (`workers-trained` event). | planned |
| FR-042 | Migration: `recruitWorkers { nationId, delta }` takes 1 canned food + 1 clothing + 1 furniture per worker when ordered, no cash and no labour (a negative delta gives back this turn's order). The new untrained workers join after this turn's meal and eat from the next turn on (`workers-recruited` event). At most max(1, floor(provinces / 4)) per turn (`limit-reached`). [NEEDS CLARIFICATION] gaps.md B8: the cap is unconfirmed and the remake has no provinces yet, so at least 1. | planned |
| FR-043 | The engine owns the world a new game needs: `engine/newGame.ts` imports nothing from `@/testing`. A new game is the 40x40 default map with one nation that has $10,000, 4 untrained, 2 trained and 1 expert worker, 15 freight cars, the six mills and factories built and a start warehouse (grain 20; fruit, livestock, timber, cotton, wool, coal, iron ore, lumber, steel and canned food 10 each). Test fixtures stay in `src/app/testing`. [NEEDS CLARIFICATION] gaps.md A6: the start warehouse is not documented. | planned |
| FR-044 | Acceptance: in a headless game, grain from a farm next to the capital reaches the warehouse through transport and, after a food processing order, ends up as canned food; the same game without the farm's grain makes no canned food. | planned |
| FR-045 | Two scripted nations play 20 turns headlessly and both produce goods and feed their workers; the FR-015 invariants hold after every turn, and no warehouse stock or worker count is ever negative. | planned |
