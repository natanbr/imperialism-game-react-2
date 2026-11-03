# Architecture

How the code is built. Rewritten 2026-11-03 for M1 (headless core). Goals and milestones:
`docs/REVIVAL_PLAN.md`. Rules of the original game: `docs/rules/README.md`. How work runs:
`docs/FLOW.md`. Requirements: `docs/requirements.md`.

## Overview

A web remake of Imperialism (1997): Next.js 15, React 19, TypeScript strict, Zustand, Vitest,
Playwright. The code has three layers, and each one only depends on the one below it:

```
components/, hooks/        React: read the store, build Orders, call submitOrder / advanceTurn
        |
store/                     Zustand: one GameState (`game`) plus UI state
        |
engine/                    headless game core: Orders, validation, turn resolution, systems
```

The engine never imports React, Zustand, Next, the store, components or hooks, and never uses
DOM globals, `Math.random` or `Date.now`. An ESLint rule enforces this for `src/app/engine/**`
(`eslint.config.mjs`, tested by `tests/engine/lintGuard.test.ts`).

## Folders

```
src/app/
  engine/                  the headless core (no UI imports)
    index.ts               public API: Order types, validateOrder, applyOrder, tryApplyOrder,
                           resolveTurn, newGame, scriptedPlayer, GameEvent, seasonOf, labourOf,
                           migrantCap, foodForecast
    newGame.ts             the start state: Spring 1815, startWorld(), START_TECHNOLOGIES, rail
                           networks built
    calendar.ts            seasons; the year advances after winter
    rng.ts                 seeded RNG: createTurnRng(seed, turn)
    orders/                Order.ts (union + RejectReason), validate.ts, apply.ts,
                           industryOrders.ts (production, expansion, cars, training, migration),
                           queries.ts (read-only lookups and construction-site rules)
    industry/              labour.ts (labourOf: total, committed, free), industryState.ts
                           (createIndustry, buildingOf, migrantCap), foodForecast.ts (the meal
                           this turn would serve)
    world/                 defaultMap.ts (the 40x40 map), startWorld.ts (start nation, land,
                           civilians, START_TECHNOLOGIES)
    turn/                  resolveTurn.ts, phases.ts (TURN_PHASES), context.ts (TurnContext, GameEvent)
    systems/               one file per turn system, each (state, ctx) => state
    map/mapHelpers.ts      neighbours, adjacency, rail sites
    ai/scriptedPlayer.ts   a Player is (state, nationId) => Order[]
  store/
    rootStore.ts           createGameStore(options) and the app's useGameStore
    gameSlice.ts           game, activeNationId, lastRejection, eventLog, submitOrder, advanceTurn
    controls/              UI slices: tile selection, camera, overlays, dialogs
    selectors.ts           memoized selectors (reselect)
  components/              React components; gameText.ts (display text: orders, refusals, news,
                           commodity names, the date, the food warning), railSegments.ts (map overlay)
    capital/               the capital dialog's parts: capitalView.ts (what it shows, no React),
                           ProductionCard, LabourPanel, FreightCars, Capital.module.css
  hooks/                   React hooks; tileClickOrders.ts (what a tile click asks for, no React)
  workers/                 per worker type, the action it offers on a tile (map cursor and click)
  types/                   GameState, Tile, Worker, Nation, Industry, jobs, ...
  definisions/             rule tables: prices (workPrices), durations (workerDurations, the only
                           one), recipes and worker costs (ResourceConversions), buildings
                           (industryBuildings), terrains, resources
  testing/                 test fixtures only: worldInit (5x5 test world), mockNation (two nations)
  constants/, styles/, utils/
tests/
  engine/                  orders, turn, systems, determinism, two nations (npm run test:engine)
  store/                   the store: shape, submitOrder, advanceTurn, what reaches the engine
  ui/                      click policy, display text, the "UI only submits orders" scan, and
                           component tests (*.test.tsx, jsdom + Testing Library): capital dialog
                           order dispatch, warehouse dialog, HUD
  workers/                 the miner's possible actions and job starts
e2e/                       Playwright smoke suite (cursor icons, three turns played, canned food
                           ordered in the capital; SCREENSHOT_DIR saves the M2 screenshots)
```

## Game state and UI state

`GameState` (`types/GameState.ts`) is the whole game as the engine sees it: turn, year, `seed`,
nations, map, transport network and allocations, technology, difficulty. It holds game data
only (FR-018).

The store (`store/rootStore.ts`) holds that state under `game`, and UI state beside it:

| Store key | What | Kind |
|---|---|---|
| `game` | the `GameState` | game |
| `activeNationId` | the nation this client plays | session |
| `lastRejection` | `{ order, reason }` of the last refused order | UI |
| `eventLog` | `{ turn, year, events }` per resolved turn, last 20 | UI |
| `selectedTileId`, `selectedWorkerId`, `hoveredTileId` | selection | UI |
| `cameraX`, `cameraY` | map scroll | UI |
| `isWarehouseOpen`, `isCapitalOpen`, ... | overlays and dialogs | UI |

Only `game` is ever passed to the engine (tested with spies in
`tests/store/engineBoundary.test.ts`). Display text is derived, not stored: a worker's job text
comes from `workerJobLabel(tile, worker)`, news lines from `eventText(event)`, refusals from
`refusalText(...)` (all in `components/gameText.ts`).

A finished job leaves its tile in the resolution that finishes it (FR-032): jobs carry no
`completed` flags, and the map's "done" pulse reads the last turn's completion events
(`selectTilesCompletedLastTurn` in `store/selectors.ts`).

## Order flow (a player action)

Everything a player can do is an `Order` (`engine/orders/Order.ts`): a union discriminated on
`kind`, each naming its `nationId` and the exact worker, tile or building. Fifteen kinds today:
moveWorker, moveAndBuildRail, startProspecting, startDevelopment, startConstruction,
moveAndStartProspecting, moveAndStartDevelopment, moveAndStartConstruction, cancelWorkerAction,
setTransportAllocations, changeTransportCapacity (freight cars), setProduction, expandBuilding,
trainWorkers, recruitWorkers.

```
click / button / slider
  -> hook or component builds Order(s) with nationId = activeNationId
  -> store.submitOrder(order)
       order for another nation?   -> refused: not-owner
       engine tryApplyOrder(game, order)
         validateOrder(game, order) -> { ok: false, reason }  -> lastRejection = { order, reason }, game unchanged
                                    -> { ok: true }            -> game = applyOrder(game, order), lastRejection = null
  <- returns the ValidationResult
```

- `validateOrder` never changes the state and returns a reason from a fixed list
  (`RejectReason`), so the UI and AI players can switch on it.
- `applyOrder` performs the immediate effects: move the worker, start the job, charge the
  treasury or warehouse. A refused order returns the same state object.
- A tile click can try several orders (`hooks/tileClickOrders.ts`): a job on another tile is
  tried as move-and-start, then as a plain move; an engineer moving next to its rail network
  tries rail-on-move first. `submitFirstAccepted` stops at the first accepted order, or at
  `insufficient-funds` (an unaffordable job never turns into a plain move).
- No component or hook writes the store or calls the engine's apply or resolve functions
  (`tests/ui/uiWritesOnlyOrders.test.ts` scans the sources).

## Turn flow (Advance Turn)

Orders take effect when they are submitted, so the turn resolves with no orders from the UI:

```
store.advanceTurn()
  -> resolveTurn(game, {}, game.seed)                    engine/turn/resolveTurn.ts
       applyTurnOrders     orders given here, nations in state order (none from the UI)
       TURN_PHASES         development, diplomacy, trade, production (freight cars first),
                           combat, interceptions, transportConnectivity, logistics, food
       resetWorkers        everyone may move again; working only while the job is unfinished
       advanceClock        turn + 1, year + 1 after winter (turn 1 = Spring 1815)
  <- { state, events }
  -> game = state; eventLog += { turn, year, events }; lastRejection = null
```

Why immediate: the UI must show the effect at once (the worker moves, the money goes), and
`resolveTurn(s, { n: orders })` gives the same result as applying the orders first and resolving
with none (tested in `tests/engine/resolveTurn.test.ts` and `tests/store/gameStore.test.ts`).
The `ordersByNation` argument is the seam for other players: from M4 an AI nation's orders go in
there, `resolveTurn(game, { [ai]: player(game, ai) }, game.seed)`. The store keeps no order log,
so a played game cannot be replayed from the store alone (see the journal objection).

## Randomness and replay

`GameState.seed` is the only random state. A new game draws a seed (`randomSeed()` in the
store; tests pass 1). Each turn's RNG is `createTurnRng(seed, turn)`, handed to systems in the
turn context. The same initial state and orders always give the same result
(`tests/engine/determinism.test.ts`); two scripted nations play 20 turns headlessly in
`tests/engine/twoNations.test.ts`. The seed shows in the HUD's debug box when a tile is selected.

## How to add an order kind

1. `engine/orders/Order.ts`: add the interface, add it to the `Order` union and `ORDER_KINDS`;
   add a `RejectReason` only if no existing one fits.
2. `engine/orders/validate.ts`: a `case` with every rule, returning a reason when refused.
3. `engine/orders/apply.ts`: a `case` with the immediate effects, returning a new state.
4. `components/gameText.ts`: the order's name in `ORDER_TEXT` (TypeScript asks for it).
5. The UI builds the order with `nationId: activeNationId` and calls `submitOrder`.
6. Tests first: rows in `tests/engine/validate.test.ts` and `tests/engine/apply.test.ts` with
   the FR id; the frozen-input checks there cover purity.

## How to add a turn system

1. `engine/systems/<name>.ts`: `export const <name>: TurnSystem = (state, ctx) => state`. Never
   mutate the input; randomness only from `ctx.rng`; report what happened with `ctx.emit(...)`.
2. A new event type goes into `GameEvent` (`engine/turn/context.ts`) and gets a line in
   `eventText` (`components/gameText.ts`) so the HUD shows it.
3. Add the system to `TURN_PHASES` in `engine/turn/phases.ts`, in the manual's phase order.
4. Tests first in `tests/engine/systems/`; `tests/engine/purity.test.ts` runs every phase on a
   deep-frozen state.

## Map and tiles

`state.map.tiles[y][x]`; tile ids are `"x-y"` (`utils/tileIdUtils.ts`). Rows are a brick
pattern: odd rows are shifted half a tile, so each tile has six neighbours
(`engine/map/mapHelpers.ts`). A tile has terrain, an optional resource (type, level 0 to 3,
hidden until prospected for minerals and oil), its workers, at most one prospecting,
development and construction job, the owner, and infrastructure (`port`, `depot`, `fortLevel`,
`connected`).

## Transport

Each nation has a per-turn transport capacity. `transportConnectivitySystem` builds the rail
graph from the capital, depots and ports; `logisticsSystem` moves collected resources into the
warehouse up to the capacity, following the player's allocation
(`setTransportAllocations` order) and filling the rest greedily. Capacity is freight cars from
the railyard: 1 lumber + 1 steel each when ordered and 2 labour each in the production phase
(`changeTransportCapacity` order); the cars count for that turn's shipping.

## Industry, labour and food

Each nation has `industry` (`types/Industry.ts`): its production buildings with a capacity, a
capacity ordered this turn and standing production orders; its industrial workforce (untrained,
trained, expert); the sick workers and the trainees of this turn; and the migrants ordered this
turn. Labour is never stored: `labourOf(nation)` derives it (1, 2, 4 per healthy worker not in
training) and what the standing orders and this turn's cars commit.

- Orders (`engine/orders/industryOrders.ts`): `setProduction` (a standing order per output,
  checked against capacity, stock and labour; lowering is always allowed), `expandBuilding`
  (1 lumber + 1 steel per capacity point, counts from next turn), `trainWorkers` (cash + paper,
  the trainee gives no labour this turn), `recruitWorkers` (canned food + clothing + furniture).
- `productionSystem` (phase 3): cars first, then each building in `BUILDING_ORDER` makes
  min(order, capacity, inputs, labour); outputs reach the warehouse after all buildings ran;
  expansions take effect; food processing forgets its orders; trainees are promoted.
- `foodSystem` (after logistics): every worker eats one food (preferred raw, then canned, then
  any raw and falls sick, else starves; the untrained take the bad places first), then this
  turn's migrants join.
- Rule tables: `definisions/ResourceConversions.ts` (recipes, labour per worker, car, training,
  migrant and expansion costs) and `definisions/industryBuildings.ts` (buildings, order, capacity
  steps).

- `foodForecast(state, nationId)` (FR-049) runs the turn's phases on the current state with no
  further orders and reads the meal: `{ mouths, fed, sick, starved, short }`. The HUD's food
  warning reads it through `selectFoodForecast` (memoized on `game`).
- Start technologies (FR-051, decision Q8 default): a new game holds Compound Steam Engine, Iron
  Railroad Bridge and Dynamite (`START_TECHNOLOGIES` in `world/startWorld.ts`), so rail and depots
  reach hills, swamp and mountains. The technology state is shared by all nations in v1. The test
  fixtures start with no technology, so the FR-030 site rules keep their tests.

## Components

`page.tsx` renders `MapView`, `HUD` and the modals. The capital dialog (`CapitalModal.tsx`)
renders views from `capital/capitalView.ts`: a production card per built building (inputs with
stock, the standing order and the most `validateOrder` accepts, Expand), the labour panel (labour,
grades, sick, trainees, Trade School, Capitol) and the freight cars; each button sends one order,
and `lastRejection` shows as an alert in the dialog. Dialog styles are CSS modules
(`capital/Capital.module.css`, `WarehouseModal.module.css`) on the tokens in `styles/tokens.css`.
The warehouse dialog lists every commodity by display name in three groups (`COMMODITY_GROUPS`). A tile is `components/Tile.tsx` plus
sub-components in `components/Tile/` and three hooks: `useTileActions` (which action the
selected worker offers, from `workers/*`), `useTileVisuals` (colours and the cursor) and
`useTileClickHandler` (the click, as orders). The HUD shows turn and date ("Spring 1815"), cash, the
food warning, the selected tile, the news of the last turn and the last refused order (`components/HUD/NewsPanel.tsx`). Edge scroll
(`hooks/useEdgeScroll.ts`) moves the camera near the window edges; over the HUD only the right
edge scrolls.

## Testing

```bash
npm test                         # all unit tests (Vitest)
npm run test:engine              # tests/engine only
PORT=3123 npx playwright test    # e2e on a free port; starts this checkout's dev server
```

Playwright reads `PORT` (default 3000) and starts its own dev server unless `PW_REUSE_SERVER=1`,
so a run never tests another worktree's server by accident. Engine tests use the two-nation
fixture (`testing/mockNation.ts`, helpers in `tests/engine/fixtures.ts`); tests that predate M1
use the 5x5 `initWorld` map and one engine order per old helper call
(`tests/engine/orders/singleNationOrders.ts`). `invariantViolations` in `tests/engine/fixtures.ts`
also checks the economy after every headless turn: no negative stock or worker count. The engine
never imports `src/app/testing` (ESLint rule, FR-043).

## Not on the engine yet

- Diplomacy, trade, combat and interceptions are stub systems.
- The map comes from `engine/world/defaultMap.ts` until a map generator exists.
- Transport logic gaps from `docs/rules/04` (river ports, a depot on a port, blockades, town
  development) and the power plant are not modelled.
