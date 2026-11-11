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
                           migrantCap, foodForecast, railLinksOf
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
    world/                 twoIslands.ts (the 24x16 two-island map as a text template,
                           CAPITAL_SITES), startWorld.ts (START_FOUNDINGS, foundNation, settleIsland, civilians,
                           START_TECHNOLOGIES)
    turn/                  resolveTurn.ts, phases.ts (TURN_PHASES), context.ts (TurnContext, GameEvent)
    systems/               one file per turn system, each (state, ctx) => state
    map/mapHelpers.ts      neighbours, adjacency, rail sites
    ai/scriptedPlayer.ts   a Player is (state, nationId) => Order[]
    ai/economy.ts          the scripted player's economy: transport, training, cars, expansion, run, trade
    ai/railPlan.ts         read-only rail and tile planning: depot sites, rail paths, tilesByReach
    ai/players.ts          PLAYERS (controller -> Player) and computerOrders(state) (FR-099)
  store/
    rootStore.ts           createGameStore(options) and the app's useGameStore
    gameSlice.ts           game, activeNationId, lastRejection, eventLog, orderLog, submitOrder,
                           advanceTurn, startNewGame
    controls/              UI slices: tile selection, camera, overlays, dialogs
    selectors.ts           memoized selectors (reselect)
  components/              React components; gameText.ts (display text: orders, refusals, news,
                           commodity names, the date, the food warning), railSegments.ts (map overlay)
    capital/               the capital dialog's parts: capitalView.ts (what it shows, no React),
                           ProductionCard, LabourPanel, FreightCars, Capital.module.css
    market/                the market dialog's view (marketView.ts, no React) and the CSS module
                           shared by MarketModal and GameOverModal
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
                           order dispatch, warehouse dialog, HUD, market dialog, score and
                           game-over screen
  workers/                 the miner's possible actions and job starts
e2e/                       Playwright smoke suite (cursor icons, three turns played, canned food
                           ordered in the capital, a sale on the market, 40 turns to game over;
                           SCREENSHOT_DIR saves the M2 and M3 screenshots)
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
| `orderLog` | `{ turn, nationId, orders }` per nation per resolved turn, all turns (FR-100) | session |
| `ordersThisTurn` | the active nation's orders applied this turn, logged at End Turn | session |
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
`kind`, each naming its `nationId` and the exact worker, tile or building. Seventeen kinds today:
moveWorker, moveAndBuildRail, startProspecting, startDevelopment, startConstruction,
moveAndStartProspecting, moveAndStartDevelopment, moveAndStartConstruction, cancelWorkerAction,
setTransportAllocations, changeTransportCapacity (freight cars), setProduction, expandBuilding,
trainWorkers, recruitWorkers, sellCommodity, buyCommodity (world market). After game over every
order is refused with `game-over`.

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

The human's orders take effect when they are submitted, so the turn resolves with no orders from the
UI; the computer nations (controller not "human", FR-099) plan on that state and their orders
resolve with the turn:

```
store.advanceTurn()
  -> computerOrders(game)                                engine/ai/players.ts (nation 2: scriptedPlayer)
  -> resolveTurn(game, computerOrders, game.seed)        engine/turn/resolveTurn.ts
       game over already?  return the same state; each given order -> order-rejected game-over
       applyTurnOrders     orders given here, nations in state order (the computer nations')
       TURN_PHASES         development, diplomacy, trade (deals, then prices), production
                           (freight cars first), combat, interceptions, transportConnectivity,
                           logistics, tradeDelivery (units bought), food
       promoteFreightCars  the cars built this turn go into service (FR-101, NR-016)
       resetWorkers        everyone may move again; working only while the job is unfinished
       advanceClock        turn + 1, year + 1 after winter (turn 1 = Spring 1815)
       last turn?          turn == turnLimit (40): gameOver = { turn, year, scores }, game-over event
  <- { state, events }
  -> game = state; eventLog += { turn, year, events }; orderLog += one entry per nation
     (the human's applied orders, the computer nations' orders); lastRejection = null
```

Why immediate: the UI must show the effect at once (the worker moves, the money goes), and
`resolveTurn(s, { n: orders })` gives the same result as applying the orders first and resolving
with none (tested in `tests/engine/resolveTurn.test.ts` and `tests/store/gameStore.test.ts`).
The `ordersByNation` argument is the seam for other players: since M4 a computer nation's orders go
in there, `resolveTurn(game, computerOrders(game), game.seed)`. The store's `orderLog` holds every
nation's orders per turn in state order, so replaying it through `resolveTurn` from the start state
gives the same game (`tests/store/computerNations.test.ts`).

## Randomness and replay

`GameState.seed` is the only random state. A new game draws a seed (`randomSeed()` in the
store; tests pass 1). Each turn's RNG is `createTurnRng(seed, turn)`, handed to systems in the
turn context. The trade phase draws one number per tradeable commodity every turn (after the
development system's draws), so prices depend only on the seed, the turn and the orders. The same initial state and orders always give the same result
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
(`changeTransportCapacity` order); the production phase builds them and `promoteFreightCars` puts
them in service after the phases, so they carry goods from the next turn (FR-101, NR-016).

The rail graph per nation (`transportNetwork.railroadNetworks`, built in `systems/railroadSystem.ts`)
has a node for every tile with rail, a depot, a port or the capital, linked to its neighbouring
nodes. The map's rail overlay draws exactly its links (`railLinksOf`, then
`components/railSegments.ts` for the pixels), the same graph the depot lights come from (FR-079).

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

## World market, score and game over

- One market per game (`GameState.market`, `types/Market.ts`), shared by every nation:
  `prices` (whole dollars, per tradeable commodity), this turn's `orders` by nation
  (`{ sell, buy }`) and the `deliveries` on their way. `marketOf(state)` falls back to the start
  market for hand-built states. Rule table: `definisions/marketPrices.ts` (`TRADE_COMMODITIES`,
  `START_PRICES`, drift, push, bounds, `MAX_BUY_BIDS`).
- Orders (`engine/orders/tradeOrders.ts`): `sellCommodity` and `buyCommodity` set this turn's
  amount of one commodity. Offered units leave the warehouse and bids are paid at the world price
  when ordered; a lower amount gives the difference back. Units sold plus bought are at most the
  nation's cargo holds (`tradeCapacityOf`), at most 4 commodities bid on, never both sides of
  one commodity. No raw food, gold or gems.
- `tradeSystem` (phase 2): pays the sales (`goods-sold`), moves the bids to `deliveries`
  (`goods-bought`), clears the orders, then `nextPrices` (random drift of at most 3% plus 0.5% per
  net unit, at most 3%, within 50% to 250% of the start price). `tradeDeliverySystem` (after
  logistics) puts the deliveries in the warehouse, so bought units are usable next turn but feed
  this turn's meal.
- Score (`engine/score/score.ts`): `scoreOf(state, nationId)` = floor(treasury / 100) + 10 per
  capacity point of the capped buildings + 10 per resource level on own tiles, with the parts;
  `scoreTable(state)` ranks all nations. Weights: `definisions/scoreWeights.ts`.
- Game over (`engine/turn/gameOver.ts`): `turnLimitOf(state)` (`newGame({ seed, turnLimit })`,
  default 40 = Winter 1824); resolving that turn sets `gameOver = { turn, year, scores }`; after it
  `validateOrder` refuses everything with `game-over` and `resolveTurn` is a no-op.

## Components

`page.tsx` renders `MapView`, `HUD` and the modals. The capital dialog (`CapitalModal.tsx`)
renders views from `capital/capitalView.ts`: a production card per built building (inputs with
stock, the standing order and the most `validateOrder` accepts, Expand), the labour panel (labour,
grades, sick, trainees, Trade School, Capitol) and the freight cars; each button sends one order,
and `lastRejection` shows as an alert in the dialog. Dialog styles are CSS modules
(`capital/Capital.module.css`, `WarehouseModal.module.css`) on the tokens in `styles/tokens.css`.
The warehouse dialog lists every commodity by display name in three groups (`COMMODITY_GROUPS`).
The market dialog (`MarketModal.tsx`, opened from the HUD or the capital's Trade button) renders
`market/marketView.ts`: per tradeable commodity its price, stock, offer and bid with "− n +"
buttons that send `sellCommodity` / `buyCommodity` with this turn's new total, plus cash, cargo
holds and buy bids; refusals show as in the capital. The game-over screen (`GameOverModal.tsx`)
shows `state.gameOver.scores` whenever the game is over, unless the player closed it
(`isGameOverHidden`, reopened by the HUD's "Final scores"). After game over the HUD's Advance
Turn is disabled and the store's `advanceTurn` returns at once, so no empty turn is logged. A tile is `components/Tile.tsx` plus
sub-components in `components/Tile/` and three hooks: `useTileActions` (which action the
selected worker offers, from `workers/*`), `useTileVisuals` (terrain tint, grid line and the
cursor) and `useTileClickHandler` (the click, as orders). The selection ring is an element of
`TileBase` above the border overlay (FR-110). `TileWorkers` draws the player's civilians as 24 px
buttons (one alone, or a stack button with the count whose tray opens while the tile is selected and
no worker is) and another nation's as a marker, not a button (FR-108, FR-110); the store's
`selectWorker` / `setSelectedWorkerId` ignore any worker that is not the player's
(`store/controls/playersWorker.ts`), and the HUD's tile panel shows another nation's tile read-only. Look (M3.5 part B):
icons are Game Icons (CC BY 3.0, credited in the HUD's About panel) from `react-icons/gi`, named
in `components/icons.ts` (per terrain, resource and worker type; `tileIconOf` picks the one a tile
shows) and drawn by `GameIcon.tsx` with `data-icon`. Colours are CSS variables defined only in
`styles/tokens.css`; `styles/theme.ts` names them for TypeScript and holds `TILE_PX` (42) and
`HUD_PX` (a test checks both files agree, and that no colour literal sits in components, hooks or
`globals.css`). MapView's SVG overlay draws each nation's territory border
(`components/territoryBorders.ts`) and the rail, above the tile tints and below the tile icons.
Cursors are still emoji SVG data URIs (`useTileVisuals`). The HUD shows "Turn: N of 40" and the date ("Spring 1815"), cash, the score, every
nation ranked by score with its colour swatch and name (`HUD/ScoreTable.tsx`, `NationSwatch.tsx`), the
food warning, the selected tile, the news of the last turn and the last refused order (`components/HUD/NewsPanel.tsx`;
`newsLines` puts the player's lines first and names the other nations on theirs). Its information
scrolls on its own (`.hud-content`); the action buttons stay below it. New game (HUD, asked in place, and
the game-over screen) calls `hooks/mapActions.ts` `startNewGameOnCapital`: the store's `startNewGame`
clears the session (selection, dialogs, logs) and the camera goes back to the capital. The
camera is the scroll position of MapView's container (FR-083), so the browser keeps it inside the
map; the store's `cameraX`/`cameraY` mirror it (written on each scroll event) and `setCamera`
scrolls the container. The first view and the HUD's Center button centre the capital
(`components/camera.ts`, `cameraOnCapital`); the map has right padding of `--hud-width` so its last
column can scroll out from under the HUD. Edge scroll (`hooks/useEdgeScroll.ts`) scrolls the
container near the window edges; over the HUD only the right edge scrolls. e2e specs wait for
`data-ready` on `map-scroll` (set after MapView's first view) before clicking: the server-rendered
map shows before React handles clicks, and on 1280x720 the whole map fits, so the first view no
longer scrolls.

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
never imports `src/app/testing` (ESLint rule, FR-043, now FR-080).

## Not on the engine yet

- Diplomacy, combat and interceptions are stub systems. Trade is a world market with no Minor
  Nations, no bid/offer matching between nations and no Shipyard (holds do not grow).
- The map is a fixed template, `engine/world/twoIslands.ts` (FR-080): the same for every seed, so
  e2e specs and M4 can name tiles. Island 2 is island 1 shifted 12 columns (a shift along a row
  keeps the hex neighbours); `settleIsland(map, nationId, cityId, CAPITAL_SITES[i])` puts a capital
  on island i, raises its farm, orchard and plantation neighbours to level 1 and gives the nation
  the island. A new game settles only island 1. No coast or river tiles are placed (decision Q16).
- Transport logic gaps from `docs/rules/04` (river ports, a depot on a port, blockades, town
  development) and the power plant are not modelled.
