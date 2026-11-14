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
                           migrantCap, foodForecast, railLinksOf; since M5 WORLDS, the country and
                           province queries, transferProvince, pairKey, relationLevel, intentOrder
    newGame.ts             the start state: Spring 1815 on a world of WORLDS (default "two-islands"),
                           START_TECHNOLOGIES, rail networks built, start diplomacy, no intents; on a
                           world with provinces the FR-203 start forces (army/startForces.ts)
    army/armies.ts         M8 (FR-204): reads of state.armies (armiesOf, armyAt, findRegiment, forceSize,
                           strength, strengthIn, upkeepOf, capitalProvinceOf), the screens' helpers
                           (armyMarkers, regimentStatus, marchTargets, recruitingOf, freeWorkersOf;
                           pendingArmyOrders and beforeRecruiting, FR-263, FR-264), and
                           the edits orders and phases share (raiseRegiments, placeRegiments,
                           removeRegiments, mapRegiments, withRecruiting), which keep one army per country
                           per province
    army/upkeepForecast.ts FR-261: the upkeep End Turn will charge and the cash it will find; upkeepIn, one
                           province's share (FR-266)
    army/startForces.ts    FR-203: field army, militia, capital forts, extra horses
    calendar.ts            seasons; the year advances after winter; yearOfTurn (the year of any turn)
    council/council.ts     M10 (FR-290 to FR-294): the Council of Governors as pure queries: isCouncilTurn,
                           nextCouncilTurn, councilStanding, councilNominees, councilVote (ballots, rows, the
                           winner), councilMeeting (what resolveTurn calls), councilCell, abstainedProvinces;
                           an abstaining ballot says why (`abstention`, FR-310), so the screen explains a
                           meeting from its event; standing ties in intentOrder of the state's turn (FR-309); numbers in
                           definisions/council.ts, types in types/Council.ts
    rng.ts                 seeded RNG: createTurnRng(seed, turn); RNG_STREAMS and createStreamRng
                           for the per-system streams (FR-150)
    diplomacy/relations.ts the diplomacy state (FR-151): pairKey, startDiplomacy, relationOf,
                           relationLevel, RELATION_SWATCHES
    diplomacy/queries.ts   M6 reads: warBetween, warActive (for the M9 attack rule),
                           diplomacyIntentsOf (this turn's, with cost), proposalsOf,
                           pendingProposalsFor, proposalAnswer, militaryStrength (FR-174, FR-204:
                           `strength` of all the country's regiments)
    diplomacy/scriptedAnswers.ts  FR-174: acceptsAlliance, acceptsPeace, losingWar
    orders/                Order.ts (union + RejectReason), validate.ts, apply.ts,
                           industryOrders.ts (production, expansion, cars, training, migration),
                           diplomacyOrders.ts (the five diplomacy orders: validate and apply),
                           armyOrders.ts (setRecruitment, moveArmy, cancelArmyMove, disbandRegiments,
                           cancelDisband),
                           queries.ts (read-only lookups and construction-site rules)
    industry/              labour.ts (labourOf: total, committed, free), industryState.ts
                           (createIndustry, buildingOf, migrantCap), foodForecast.ts (the meal
                           this turn would serve)
    world/                 twoIslands.ts (the 24x16 two-island map as a text template,
                           CAPITAL_SITES), startWorld.ts (START_FOUNDINGS, foundNation, settleIsland, civilians,
                           START_TECHNOLOGIES), worlds.ts (WORLDS: "two-islands", "continent"),
                           continent.ts (the minor land, MINOR_FOUNDINGS, the province split),
                           countries.ts (countryName, isGreatPower, countryOfTile, minorNationAt),
                           provinces.ts (provinceOf, provincesOf, adjacentProvinces, transferProvince)
    turn/                  resolveTurn.ts, phases.ts (TURN_PHASES), context.ts (TurnContext, GameEvent),
                           intents.ts (intentOrder, byIntentOrder, addIntent, dropResolvedIntents)
    systems/               one file per turn system, each (state, ctx) => state
    map/mapHelpers.ts      neighbours, adjacency, rail sites
    ai/scriptedPlayer.ts   a Player is (state, nationId) => Order[]
    ai/economy.ts          the scripted player's economy: transport, training, cars, expansion, run, trade
    ai/railPlan.ts         read-only rail and tile planning: depot sites, rail paths, tilesByReach
    ai/players.ts          PLAYERS (controller -> Player) and computerOrders(state) (FR-099)
    ai/diplomacy.ts        the scripted player's peace offers when losing a war (FR-174)
    ai/scriptedArmy.ts     M8 (FR-213): armyThreat, planGarrison (1 Regulars a turn under a threat)
    ai/scriptedPartners.ts M7 (FR-245): planConsulate, partnerSupply, partnerDemand (its bid and offer caps)
    market/                market.ts (the world market, nextPrices), partners.ts (M7 reads: marketModeOf,
                           minorOffers, minorDemand, partnerRanking, favouritePartner, tradeBarrier,
                           settledTradeBarrier, diplomacyAfterThisTurn, boardOfTrade), settlePartners.ts
                           (the "partners" deals), dealBook.ts (FR-244 data)
  store/
    rootStore.ts           createGameStore(options) and the app's useGameStore
    gameSlice.ts           game, activeNationId, lastRejection, eventLog, orderLog, submitOrder,
                           advanceTurn, startNewGame
    controls/              UI slices: tile selection, camera, overlays, dialogs
    selectors.ts           memoized selectors (reselect)
  components/              React components; gameText.ts (display text: orders, refusals, news,
                           commodity names, the date, the food warning), railSegments.ts (map overlay),
                           Modal.tsx (the one modal dialog every game dialog is built on, FR-236)
    capital/               the capital dialog's parts: capitalView.ts (what it shows, no React),
                           ProductionCard, LabourPanel, FreightCars, Capital.module.css
    market/                the market dialog's view (marketView.ts, no React) and the CSS module
                           shared by MarketModal, BoardOfTrade, DealBookModal and GameOverModal;
                           M7: BoardOfTrade.tsx and boardView.ts (the Board of Trade, no React in the
                           view), Stepper.tsx ("− n +", both market dialogs), dealBookView.ts (the Deal
                           Book's ledger lines from the engine's dealBook)
    diplomacy/             the Diplomacy screen's parts: diplomacyView.ts (rows, controls with their
                           refusal text, the refusal lines, the Accept Offer sentence; no React),
                           CountryList (the left pane's tabs), CountryDetails (the right pane),
                           Diplomacy.module.css (also used by AcceptOfferModal)
    army/                  M8: armyView.ts (the map markers by seat tile, the march arrows in map pixels,
                           the Army screen's rows and its
                           March / Disband controls with their refusal text; no React), armouryView.ts
                           (the Armoury's cards, no React), Army.module.css (ArmyModal, ArmouryModal);
                           the markers themselves are Tile/TileArmy.tsx
  hooks/                   React hooks; tileClickOrders.ts (what a tile click asks for, no React)
  workers/                 per worker type, the action it offers on a tile (map cursor and click)
  types/                   GameState, Tile, Worker, Nation, Industry, jobs, ...
  definisions/             rule tables: prices (workPrices), durations (workerDurations, the only
                           one), recipes and worker costs (ResourceConversions), buildings
                           (industryBuildings), terrains, resources, diplomacy numbers
                           (diplomacyRules: overture costs, grant sizes and points, war effects,
                           the scripted answer thresholds)
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
`worldId`, the Great Powers (`nations`), the minor nations, provinces, diplomacy and intents (M5,
below), map, transport network and allocations, technology, difficulty. It holds game data
only (FR-018).

### Worlds, countries and the v2 seams (M5)

- **Worlds** (FR-144): `newGame({ seed, turnLimit, world })` builds a key of `WORLDS`
  (`engine/world/worlds.ts`); `newGame(seed)` is `newGame({ seed })`. The engine's default is
  `"two-islands"`, the v1 start, so every v1 call, fixture and baseline is unchanged; the store
  (`APP_WORLD` in `store/gameSlice.ts`) starts `"continent"`, and `startNewGame({ world })` picks one.
- **The continent** (FR-145): the two-island start (Great Powers founded on the two-island map first,
  because settling floods an island over land) plus the channel land of four minor nations: Arvelia,
  the one land bridge, and the islands Sundmark, Lorran and Pellis.
- **Countries** (FR-146): a country id (`CountryId`) is a Great Power (`state.nations`) or a minor
  (`state.minorNations`: id, name, capital tile, `colonyOf?`, the one home of the colony relation;
  `Nation` has no colony list). A minor has no treasury, warehouse, industry, civilians or controller
  and gives no orders, so every system and view that iterates `state.nations` sees the Great Powers
  only. `countryName`, `isGreatPower`, `countryOfTile`.
- **Provinces** (FR-147, FR-148): each land tile of a world with provinces has `provinceId`;
  `state.provinces` holds id, name, owner (a country id), seat tile and tile ids. Land changes hands
  only through `transferProvince`, the one writer of `ownerNationId` after `newGame`, so its read
  sites keep meaning "owned by this Great Power"; a minor's tiles have none (so they are closed to
  Great Power civilians, FR-149). The migrant cap counts `provincesOf(state, nationId)`. A minor's
  capital keeps the Capital terrain when it changes hands, so the rules that mean "this nation's own
  capital" ask `isGreatPowerCapital(state, tile)` (`orders/queries.ts`: the depot rule, the scripted
  player's hubs and reach); a depot site is blocked only by its own country's capital, depot or port.
- **Diplomacy** (FR-151): `state.diplomacy[pairKey(a, b)]`, one entry per pair with at least one
  Great Power: points 0 to 89 (level floor(points / 10) on nine swatches), consulates, embassies,
  pact, alliance, war (`{ aggressors, since, captures?, lastPeaceOffer? }`), boycotts, subsidies,
  locked grants, and `startTreaties` on a Great Power pair while its consulates and embassies are
  the ones of the start (a war between the two removes it; FR-240).
- **Intents** (FR-152): an order that involves a second country (M6 to M9) stores an intent with
  `addIntent`; a phase resolves the turn's intents nation by nation in `intentOrder(state, turn)`
  (founding order rotated by the turn); `resolveTurn` drops the resolved turn's intents after the
  phases. `Intent` is the stored shape (`kind` a string); each milestone narrows its own kinds
  (M6: `DiplomacyIntent` in `types/Intent.ts`).

### Diplomacy (M6)

- **Orders** (FR-161, FR-162): `proposeOverture` (consulate, embassy, pact, alliance, war, peace),
  `giveGrant`, `setTradePolicy`, `withdrawOverture`, `answerProposal` (`orders/diplomacyOrders.ts`).
  Each stores an intent and changes nothing of the target; a consulate ($500), an embassy ($5,000)
  and a grant are paid when ordered and refunded in full on a withdrawal.
- **The phase** (`systems/diplomacySystem.ts`, FR-163 to FR-173): the turn's diplomacy intents by kind
  (peace, war, consulate, embassy, pact, alliance, grants then the locked repeats, trade policies),
  each kind in `intentOrder`; every intent is checked again and fails with its cost refunded
  (`overture-failed`). It runs before the trade phase, so a consulate or policy counts in that turn's
  trades. It works on its own copies and draws no random number.
- **Proposals** (FR-166): an alliance or a peace to a human Great Power becomes `state.proposals`
  (`{ id, fromId, toId, kind, turn }`, optional on a hand-built state, read through `proposalsOf`),
  answered with `answerProposal` on the next turn; one still open at that End Turn is refused and
  removed. A scripted Great Power answers by `scriptedAnswers.ts` (FR-174) in the same End Turn; a
  minor always accepts peace.
- **Relations** (FR-168, FR-172): grants, a pact and wars move the points (trade deals too, in the trade
  phase, FR-191);
  a war's effects are summed per pair and clamped once, so the declarations' order changes nothing;
  `relation-changed` is emitted once per Great Power of a pair whose level moved in the phase, with
  `wars` (`{ aggressorId, targetId }`) when declarations of that phase moved the pair (FR-239).

### Armies (M8)

- **State** (FR-204): `state.armies`, at most one army per country per province
  (`{ id: "army-<owner>-<province>", ownerId, provinceId, regiments }`), a regiment
  `{ id: "regiment-<n>", type, name, health, movedOnTurn? }`. A higher id is a newer regiment; names are
  ordinals per owner and type (`state.regimentsRaised` counts them). `Nation.recruiting` holds this turn's
  recruits. The regiment table and the M8 rule numbers are `definisions/regiments.ts` (FR-199).
- **Orders** (`orders/armyOrders.ts`): `setRecruitment` pays at once and gives back on lowering, like
  `setProduction`; `moveArmy` and `disbandRegiments` store an intent (`army-move`, `disband`), one per
  regiment (a later order replaces the earlier); `cancelArmyMove` takes regiments out of the moves and
  `cancelDisband` out of the disbands. `setRecruitment` and the End Turn refund share `withRecruiting`
  (`army/armies.ts`). A march into another country's province is refused (`not-at-war`) unless a war with it
  is active; then it is an attack (M9, below; M8 refused it with `attack-not-available`, now gone).
- **Phases** (`systems/armySystem.ts`, `systems/combatSystem.ts`): after trade the disbands (FR-207), then
  the upkeep, $25 per arms point, disbanding the newest regiments when the treasury cannot pay (FR-202);
  in the combat phase the marches resolve together and the regiments that did not move heal 10 (FR-206,
  FR-208); after it the recruits join in the capital province, or are refunded (`recruits-refunded`) when
  the nation no longer holds it (FR-201). None draws a random number; a world without armies (two-islands)
  passes every one unchanged.
- **Upkeep forecast** (FR-261, `army/upkeepForecast.ts`): what the upkeep step will charge after this turn's
  disbands and the cash it will find after the standing locked grants; the Army screen, the Armoury and the
  HUD (`HUD/UpkeepWarning.tsx`, `selectUpkeepForecast`) show it and warn while it is short.
- **Scripted player** (FR-213): it never moves or disbands; under a threat (`armyThreat`) it recruits 1
  Regulars a turn, its run makes the armaments first, expansion leaves their steel and the world market
  gets none of its 2; it never spends below `upkeepReserve` (`ai/scriptedPlayer.ts`: two turns of upkeep,
  in the last 8 turns every turn's left).
- **Screens** (FR-210 to FR-212): `selectArmyMarkersBySeat` (`store/selectors.ts`, on `components/army/armyView.ts`)
  gives MapView each seat tile's markers; `Tile/TileArmy.tsx` draws them half over the seat's left edge (ours
  are buttons that call `openArmy(provinceId)`, store flag `armyProvinceId`). `ArmyModal.tsx` (the Army screen)
  and `ArmouryModal.tsx` (store flag `isArmouryOpen`, opened from the capital dialog on a world with
  provinces) build `moveArmy`, `cancelArmyMove`, `disbandRegiments`, `cancelDisband` and `setRecruitment` and
  ask `validateOrder` first: a control it would refuse is disabled, its reason beside it and as its description.
  This turn's own orders show on the map before End Turn (FR-263): `selectMarchArrows` (`marchArrows`) gives
  MapView one dashed arrow per pair of provinces, drawn in its own SVG overlay at z-index 4 (above the tile
  icons and civilians, below the markers), and a marker with regiments to disband carries "−1". Marches both ways
  between two provinces each keep 10 px to their own right (FR-270). The marker's centre is copied from
  Tile.module.css into `armyView.ts`; e2e/m8-armies.spec.ts measures the arrow ends against the drawn markers (FR-271).

### War (M9)

- **Attacks** (FR-216): `moveArmy` into a province of a country at war (war active) stores an `attack` intent
  (`targetId` = the province's owner); `cancelArmyMove` takes back marches and attacks; peace drops the attacks
  (FR-169). `regimentStatus` reads "attacking", `pendingArmyOrders` lists `attacks` beside `marches`.
- **Battles** (`systems/combatSystem.ts`): marches first (FR-206), then one battle per attacked province in id
  order, then healing (not for a regiment that moved or fought, `foughtOnTurn`). The round model is
  `army/combat.ts` `fightBattle` (pure, fed `ctx.rngFor("combat")` only; numbers in `definisions/combatRules.ts`);
  regiments leaving a battlefield (attackers home, routed defenders) are placed after the last battle, so none
  fights twice a turn. Every battle is fought before any capital falls: the falls of the capitals taken in the
  phase apply after the last battle, in the winners' `intentOrder` (`fallCapital`), so crossing strikes on both
  capitals go to the first in `intentOrder`. Each battle emits `battle-resolved` with the whole report
  (`types/Battle.ts`) and the province it took, then the falls' events.
- **Conquest** (`army/conquest.ts`, FR-222 to FR-224): `takeProvince` moves the land (`transferProvince`), clears
  rail, depots, ports and jobs, sends the old owner's civilians home and records the capture in the war; a fallen
  Great Power's capital takes all its land and regiments and ends its wars (`nation-fallen`); a minor's makes it
  a colony (`colonyOf`, `minor-colonised`), which trades with its owner alone at max(start price, P), and to
  which no overture, grant or policy is valid (reason "colony"); a colony passes with its capital province, and a
  fallen Great Power's colonies pass to its conqueror.
  `resolveTurn` ends the game when one Great Power is left (`gameOver.reason` "conquest", `conquestWinner`).
- **Screens' reads**: `battleEstimate`, `defendersOf`, `attackTargets`, `attackStatus` (`army/combat.ts`);
  `battleFrames`, `battleOutcome`, `battlesFoughtBy` (`army/battleReport.ts`).
- **Scripted war** (`ai/scriptedWar.ts`, FR-228, FR-274 which replaces FR-229): the capital keeps its oldest 4 arms; at war the field
  attacks at an estimate of 1.5 or more and otherwise marches toward the province facing the strongest enemy;
  at peace from turn 10 a campaign on the weakest bordering minor raises Cuirassiers (tuned, journal M9) through
  the garrison's recruit (`armsWanted` in `ai/scriptedArmy.ts`), declares war at twice its defence and attacks.
  With such a field army the upkeep reserve (`upkeepReserve`, FR-275) rises one turn of upkeep a turn from turn 28.
- **War screens** (UI, FR-230 to FR-233): React-free views in `components/army/` (`attackView.ts`, `battleView.ts`,
  `armyView.ts`'s `attackArrows` and `attackScreenControl`) read the engine and word it; `AttackModal.tsx` sends the
  attack as one `moveArmy`, `BattleModal.tsx` replays a report from the report alone and builds no order. The Army
  screen's ticks are the store's `armySelection`, kept when it closes, so a map click on a bordering enemy province
  opens the Attack screen (`attackPlanAt`, `hooks/useTileClickHandler.ts`). One dialog at a time (FR-279): the Attack
  screen closes the Army screen, and a plan with `fromArmyScreen` reopens it on close. End Turn queues the battles the player
  fought (`battleQueue`, `battlesFoughtBy`); a battle's news line (`newsItems` in `gameText.ts`) opens its replay.
- **Council screens** (UI, M10, FR-297 to FR-301): `components/council/councilView.ts` words one `council-met` event (the
  table's cells and the provinces behind them, the abstentions and their reasons, the result) from the event alone, the
  player's column first (`playerFirst` in `gameText.ts`, FR-313); `CouncilModal.tsx`
  shows the store's `councilShown` and builds no order. End Turn sets it to the meeting just held; it waits while a
  Battle screen is to be seen, and `GameOverModal.tsx` waits for it, so the order after a turn is battles, Council, final
  scores, one dialog at a time (Accept Offer does not wait: it opens over the Council screen). The meeting's news line,
  the first line of the news (FR-306), opens it again. The HUD's `TurnIndicator.tsx` names the next meeting
  (`nextCouncilTurn`) under the turn line (turn and date on one line, FR-307), and under it shows `councilVote(state)` as
  the projection (`councilProjectionText`, FR-314). The HUD has no height to spare at 1280x720 (FR-268): the projection's
  two lines came from the "No tile selected" line, which the tile panel no longer draws (FR-315).
- **Art pack** (NR-031, FR-272, FR-273): `public/assets/ink-and-wash/` as supplied; `components/art/inkArt.ts` is the
  one table from game ids to its files (regiments, forts, the red attack arrow), `art/ArtPicture.tsx` draws them. A
  march keeps its measured line and head (FR-270, FR-271) in the pack's green; an attack is the pack's own red arrow,
  scaled and turned onto the two markers (`attackArrows` matrix). Their colours are tokens copied from the SVGs.

The store (`store/rootStore.ts`) holds that state under `game`, and UI state beside it:

| Store key | What | Kind |
|---|---|---|
| `game` | the `GameState` | game |
| `activeNationId` | the nation this client plays | session |
| `lastRejection` | `{ order, reason }` of the last refused order | UI |
| `eventLog` | `{ turn, year, events, treasuries }` per resolved turn, last 20 (`treasuries`: each nation's at the turn's start and end, FR-256) | UI |
| `orderLog` | `{ turn, nationId, orders }` per nation per resolved turn, all turns (FR-100) | session |
| `ordersThisTurn` | the active nation's orders applied this turn, logged at End Turn | session |
| `selectedTileId`, `selectedWorkerId`, `hoveredTileId` | selection | UI |
| `cameraX`, `cameraY` | map scroll | UI |
| `isWarehouseOpen`, `isCapitalOpen`, ... | overlays and dialogs | UI |
| `armyProvinceId`, `armyTargetId`, `isArmouryOpen` | the Army screen's province (null: closed), the "March to" entry it reopens on when the Attack screen gives it back (FR-279), and the Armoury (FR-211, FR-212) | UI |
| `armySelection`, `attackPlan`, `battleQueue` | the Army screen's ticks kept on the map, the open Attack screen, the battle reports still to replay (FR-230 to FR-232); End Turn and New game reset them | UI |
| `councilShown` | the `council-met` event the Council screen shows, or null (FR-298, FR-299); End Turn sets the meeting just held, New game clears it | UI |

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
       TURN_PHASES         development, diplomacy, trade (deals, then prices), disband and upkeep
                           (M8), production (freight cars first), combat (M8: marches, healing),
                           recruits (M8), interceptions, transportConnectivity, logistics,
                           tradeDelivery (units bought), food
       promoteFreightCars  the cars built this turn go into service (FR-101, NR-016)
       resetWorkers        everyone may move again; working only while the job is unfinished
       advanceClock        turn + 1, year + 1 after winter (turn 1 = Spring 1815)
       conquest?           one Great Power left: gameOver reason "conquest" (M9), no Council
       Council?            turn 10, 20, 30, 40 with provinces: council-met on the state after the clock;
                           a winner (9 of 12): gameOver reason "council" with the vote (M10)
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
development system's draws), so prices depend only on the seed, the turn and the orders. Only those
two systems read `ctx.rng` (FR-150, a scan in `tests/engine/purity.test.ts`); a new system draws from
its own stream, `ctx.rngFor(name)` for a name of `RNG_STREAMS` ("diplomacy", "combat"):
`createTurnRng((seed ^ fnv1a32(name)) >>> 0, turn)`, one stream per name and turn, so its draws never
shift the price or development draws. The same initial state and orders always give the same result
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
   mutate the input; randomness only from its own stream `ctx.rngFor(name)` (add the name to
   `RNG_STREAMS` in `engine/rng.ts`; `ctx.rng` is the development and price draws only, FR-150);
   report what happened with `ctx.emit(...)`.
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
has a node for every tile with rail, a depot, a port or the capital, and one link per rail section
built (FR-136): a rail job records the tile its section starts from (`constructionJob.railFrom`, chosen
by the order, FR-137), and when it finishes the tile is linked to that tile only. Neighbouring rail tiles
are not linked by themselves, and a finished depot or port joins no section until one is built into or
out of it. (Only a map that already holds rail, a hand-made test map, starts with every neighbouring
pair linked: a map stores no sections.) The map's rail overlay draws exactly the links (`railLinksOf`,
then `components/railSegments.ts` for the pixels); the depot lights (`transportConnectivitySystem`),
logistics and the scripted player's planning (`ai/railPlan.ts`, which orders missing sections, FR-138)
read the same graph (FR-079).

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
- **Market mode** (M7, FR-242): `market.mode` is "partners" on the continent (`WORLD_MARKET` in
  `engine/world/worlds.ts`; `newGame({ market })` overrides it); a market without the key is "world",
  the v1 shape above, kept so every v1 assertion holds (`marketModeOf`). The orders are the same in
  both modes; `tradeSystem` dispatches. "partners" (`engine/market/settlePartners.ts`, pure, no random
  draw): per commodity in `BOARD_ORDER` (`definisions/partnersMarket.ts`), (1) each minor's offer
  (`minorOffers`: a unit per tile, at most 6) to the Great Powers that bid, in the minor's
  `partnerRanking` (points + subsidy / 2, ties in `intentOrder`), (2) each minor's demand
  (`minorDemand`: 2 of each good) from the Great Powers that offer, (3) Great Power to Great Power,
  in `intentOrder`; only where `settledTradeBarrier` (war, boycott, no consulate with a minor) allows:
  the diplomacy phase ran first, so the record is this turn's. Deal price floor(P x (1 ± s)); a bid's
  reserve pays first, the treasury the rest; a unit nobody can take passes on (`offer-missed`), bid units
  no seller let it have are `bid-unfilled`, unsold offers come home (`offer-unsold`). Each pair gains a
  relation point per commodity type dealt. Then `tradeSystem` moves the prices by FR-065 on the units
  the Great Powers bought minus those they sold (FR-243), the same draws as "world": the minors' fixed
  offers and demand alone move nothing. `boardOfTrade` and `dealBook` (`engine/market/dealBook.ts`)
  are the screens' data; `components/market/dealBookView.ts` writes the ledger lines.
- Before End Turn, the Board of Trade and the scripted player ask `tradeBarrier`, which runs
  `diplomacySystem` on the state (events dropped, cached per state object in a WeakMap) and reads the
  result: what the trade phase will find after this turn's diplomacy phase (FR-246).
- The scripted player in "partners" (`engine/ai/scriptedPartners.ts` and `planTrade` in
  `ai/economy.ts`, FR-245): a consulate only when the minors that favour it do not cover its holds,
  with the first minor that offers or wants what it lacks, while $2,500 stays; bids for the raw its
  mills lack (timber, coal, iron ore, cotton) capped at what its partner minors offer; offers of
  clothing, furniture and hardware capped at what they want.
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
holds and buy bids; refusals show as in the capital. That is the "world" mode; in "partners" (M7,
FR-194) `MarketModal` renders `market/BoardOfTrade.tsx` instead, on `market/boardView.ts` (the
engine's `boardOfTrade` with names and words): the rows in `BOARD_ORDER` with Price, In warehouse and
a Bid or an Offer stepper (a row with one has no control for the other; no "−" at 0), the reason a
"+" is disabled or who may be served first beside each stepper (FR-257), the minors that sell or buy
each commodity as chips ("Arvelia: 3 units", a `tradeBarrier` in words: "(no consulate)"), the
favourites once in the note, "Holds: 3 of 4 free" and the bids used. In "partners" `validateTradeOrder`
asks `partnerRefusal` (`engine/market/partners.ts`, FR-252, FR-253) before the limits: a bid needs a
minor that sells the commodity and is open to the nation, an offer a buyer open to it. A fixed frame
(at most the window's height less 16 px): the board scrolls under a sticky head, and on a new game all
17 rows fit at 1280x720. The Deal Book (`DealBookModal.tsx`, FR-195, store flag `isDealBookOpen`, HUD
button) reads only the last `eventLog` report: `dealBook` + `dealBookView`, Sold and Bought side by
side, Not traded under them (each line with its `cause`, FR-255), the bottom line ending in the Trade
net and the Treasury table from the report's `treasuries` (FR-256, with a line per type recruited, FR-262); it builds no order. Every dollar
amount goes through `money` in `components/gameText.ts` (FR-258). The Diplomacy screen (`DiplomacyModal.tsx`,
M6, store flag `isDiplomacyOpen`, opened from the HUD or the capital) renders
`diplomacy/diplomacyView.ts` in two panes (FR-237): on the left a vertical tab list, one tab per other
country (the other Great Power first, then the minors in id order) with the relation as a swatch in
`--color-relation-<level>` and in words, the treaty chips and an "n ordered" marker; on the right the
selected country's tab panel with this turn's diplomacy intents with Withdraw and the overture, grant
and trade policy controls. The selection is the dialog's own state, so it outlives a close. Each
control holds its order and, when `validateOrder` would refuse it, the refusal text: the button is
disabled, and `reasonLines` gives each refusal once in a line under its group that is the button's
description ("Stop grant" also carries a screen-only refusal while this turn's grant would be what
its order takes back; "Declare war" at war says "we are already at war with them", FR-241). Accept Offer (`AcceptOfferModal.tsx`)
opens for each `pendingProposalsFor` the player at the start of a turn; Accept/Reject (Enter/Escape)
send `answerProposal`, and closing it adds the id to `dismissedProposalIds` (reset by New game). Every dialog renders its content in `Modal.tsx` (FR-236): `role="dialog"`, `aria-modal`, named by
its title (`aria-labelledby`); the focus moves to its first control on open (Accept Offer: the dialog
itself, again for each next offer through `focusKey`) and back to the opener on close; Tab and
Shift+Tab are trapped, and the dialog remembers (on `focusin`) the element that last took the focus
and its place among the controls, so after an order disables or removes the focused control and
Chrome drops the focus to the page, Tab goes on from there; Escape (`onEscape`, else `onClose`) and a
click that starts and ends on the backdrop call `onClose`. A module-level stack lets only the newest
open dialog answer the keys (Diplomacy over Capital, the transport plan inside Capital); a part
shown inside a dialog can take Escape first with `useEscapeFirst` (a context of the dialog: the war
question keeps the peace wherever the focus is). About
renders into `document.body` (`portal`), since the HUD clips it. The game-over screen (`GameOverModal.tsx`)
shows `state.gameOver.scores` whenever the game is over, unless the player closed it
(`isGameOverHidden`, reopened by the HUD's "Final scores"). After game over the HUD's Advance
Turn is disabled and the store's `advanceTurn` returns at once, so no empty turn is logged. The End Turn key "n"
(`hooks/useKeyboardShortcuts.ts`, mounted by `page.tsx`) is ignored in a form field and while any `role="dialog"` is
in the page (FR-178). A tile is `components/Tile.tsx` plus
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
`globals.css`). MapView's SVG overlay draws, in this order, the dotted lines between two provinces of
one owner (`--color-province-border`), each nation's territory border, each minor nation's dashed border
(`--color-minor`, on top where it meets a Great Power's) and the rail, above the tile tints and below the
tile icons (`components/territoryBorders.ts`, FR-153). A minor's capital tile carries the minor's name
(`Tile/TileName.tsx`). A tile belongs to a country by `countryOfTile` (the owner of its province, else
`ownerNationId`): the tile's name, the click (another country's tile, a minor's included, is only
viewed) and the tile panel (owner, "(minor nation)", the province) all ask it (FR-155).
Cursors are still emoji SVG data URIs (`useTileVisuals`). The HUD shows "Turn: N of 40" and the date ("Spring 1815"), cash, the score, every
nation ranked by score with its colour swatch and name (`HUD/ScoreTable.tsx`, `NationSwatch.tsx`), the
food warning, the selected tile, the news of the last turn and the last refused order (`components/HUD/NewsPanel.tsx`;
`newsLines` puts the player's lines first and names the other nations on theirs). Its information
scrolls on its own (`.hud-content`); the action buttons stay below it. `.hud-content` is a flex column: the
news panel takes the height left, and its list scrolls on its own in whole lines (a size container and
`round()` in globals.css, FR-268), so the fade at the bottom never covers a line of news. New game (HUD, asked in place, and
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

- Interceptions, rail and sea moves of armies, generals and medals are not built (Q37); diplomacy is built
  in M6, armies and marches in M8, attacks, battles and conquest in M9. Trade between countries is built in
  M7 on the continent; there is no Shipyard (holds do not grow, so a hold is never short at settlement
  unless the holds drop after ordering). Since M9 a capture is recorded in the war, so FR-174's peace
  condition (a) fires.
- The maps are fixed templates, `engine/world/twoIslands.ts` (FR-080) and the continent's minor land in
  `engine/world/continent.ts` (FR-145): the same for every seed, so
  e2e specs and M4 can name tiles. Island 2 is island 1 shifted 12 columns (a shift along a row
  keeps the hex neighbours); `settleIsland(map, nationId, cityId, CAPITAL_SITES[i])` puts a capital
  on island i, raises its farm, orchard and plantation neighbours to level 1 and gives the nation
  the island. A new game settles only island 1. No coast or river tiles are placed (decision Q16).
- Transport logic gaps from `docs/rules/04` (river ports, a depot on a port, blockades, town
  development) and the power plant are not modelled.
