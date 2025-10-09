# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 strategy game inspired by Imperialism, built with React 19, TypeScript, Zustand for state management, and Vitest for testing. The game features turn-based gameplay with workers developing resources, transportation networks, diplomacy, trade, and combat systems.

## Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build production bundle with Turbopack
npm run start        # Start production server
```

### Testing
```bash
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
```

### Running Specific Tests
```bash
npx vitest run tests/systems/developmentSystem.test.ts        # Run single test file
npx vitest run tests/systems/ -t "test name pattern"          # Run tests matching pattern
```

## Architecture

### State Management (Zustand)

The application uses Zustand with a **sliced store pattern**. The root store (`src/app/store/rootStore.ts`) combines multiple slices:

- **GameStateSlice**: Core game state (turn, year)
- **MapSlice**: Tile grid, terrain, resources, workers
- **NationSlice**: Nations, warehouses, industry
- **WorkerActionsSlice**: Worker commands (move, prospect, develop, construct)
- **TurnSlice**: Turn execution and phase management
- **TechnologySlice**: Tech research and unlocks
- **TransportSlice**: Transport networks and capacity
- **Control slices** (TileSelectionSlice, CameraSlice, OverlaySlice, ControlsSlice): UI state

**Key pattern**: Each slice is created by a `create*Slice` function that returns both state and actions. Slices are composed using spread operators in `rootStore.ts`.

**Selectors**: Use memoized selectors with `reselect` in `src/app/store/selectors.ts` for efficient derived state computation.

### Turn-Based Game Loop

Turn execution follows a strict phase order defined in `src/app/systems/runTurnPhases.ts`:

1. **Development** (`developmentSystem`): Resolve worker jobs (prospecting, farming, mining, etc.)
2. **Diplomacy** (`diplomacySystem`): Process diplomatic offers
3. **Trade** (`tradeSystem`): Resolve trade deals
4. **Production** (`productionSystem`): Industrial production
5. **Combat** (`combatSystem`): Resolve military conflicts
6. **Interceptions** (`interceptionsSystem`): Blockades cancel trades
7. **Transport Connectivity** (`transportConnectivitySystem`): Update network graphs
8. **Logistics** (`logisticsSystem`): Move resources to warehouses

Each system is a **pure function** that takes `GameState` and returns a new `GameState`. The turn system uses seeded RNG (`src/app/systems/utils/rng.ts`) for deterministic randomness.

### Worker System

Workers are the core gameplay mechanic. Each worker has a **type** (Prospector, Engineer, Miner, Farmer, Rancher, Forester, Driller, Developer) and a **status** (Available, Moved, Working).

**Worker actions** are defined in `src/app/workers/*Worker.ts` files (legacy class-based approach being refactored to functional). The new pattern uses:
- `src/app/store/helpers/workerHelpers.ts`: Pure helper functions for worker state mutations
- `src/app/hooks/useWorkerActions.ts` and `useTileInteractions.ts`: React hooks for UI interactions
- `src/app/systems/jobs/*Job.ts`: Turn-based job resolution logic

**Worker job flow**:
1. Player commands worker to start a job (e.g., "develop this tile")
2. Worker's status changes to `Working`, tile gets a `developmentJob` or `constructionJob`
3. On turn execution, the corresponding job system resolves the job (decrement turns remaining, apply effects)
4. Job completes when turns remaining reaches 0

### Map and Tiles

The map is a 2D grid of **Tiles** (`src/app/types/Tile.ts`). Each tile has:
- **Terrain type** (e.g., Farm, Mountains, Swamp)
- **Resource** (type and level 0-3; some resources like minerals/oil start hidden)
- **Workers array**: Workers currently on this tile
- **Jobs**: `developmentJob` (resource improvement) or `constructionJob` (depot, port, fort, rail)
- **Ownership**: `ownerNationId`, optional `cityId`
- **Infrastructure**: `port`, `depot`, `fortLevel`, `connected` (transport network)

Tiles are accessed via `state.map.tiles[y][x]` (2D array indexed by row, column).

### Transport System

The transport system manages internal logistics and connectivity:

- **Transport capacity**: Each nation has a per-turn capacity limit (in resource units)
- **Connectivity**: `transportConnectivitySystem` builds graphs of connected tiles (via depots/rails/ports)
- **Logistics**: `logisticsSystem` moves resources from provinces to nation warehouses, respecting capacity limits
- **Allocation**: Players allocate capacity between different tasks via `TransportAllocationModal`

### Component Structure

- **Main page**: `src/app/page.tsx` - renders MapView, HUD, and modals
- **MapView**: Renders the tile grid, handles camera pan/zoom
- **Tile component**: Individual tile renderer with click handling
- **HUD**: Turn indicator, nation stats, action buttons
- **Modals**: WarehouseModal, CapitalModal, TransportAllocationModal, ConstructionOptionsModal

Components use Zustand hooks to access state and actions. Interaction logic is encapsulated in custom hooks (`useTileInteractions`, `useWorkerActions`, `useEdgeScroll`, `useTransportAllocations`).

### Type Organization

Types are organized by domain in `src/app/types/`:
- **GameState.ts**: Root game state and turn order
- **Nation.ts**, **City.ts**, **Army.ts**, **Navy.ts**: Entity types
- **Tile.ts**, **Map.ts**, **Workers.ts**: Map and worker types
- **Resource.ts**, **Industry.ts**, **Technology.ts**: Economy types
- **Diplomacy.ts**, **TradeRoute.ts**, **Transport.ts**: Diplomacy and logistics
- **jobs/**: Job state types (DevelopmentJob, ConstructionJob)
- **actions.ts**: UI action types (PossibleAction)

### Path Aliases

The project uses `@/*` to alias `src/app/*`. Example:
```typescript
import { GameState } from '@/types/GameState';
import { selectActiveNation } from '@/store/selectors';
```

### Testing Strategy

Tests are in `tests/` directory and mirror the `src/app/` structure. System tests use:
- **Mock data**: `src/app/testing/mockMap.ts`, `mockNation.ts`, `worldInit.ts`
- **Pure function testing**: Systems are pure functions, easy to test with input/output assertions
- **Vitest**: Use `describe`, `it`, `expect` patterns

Tests run with Node environment. Coverage reports are generated in HTML and text formats.

## Development Workflow

1. **State changes**: Add actions to appropriate slice in `src/app/store/`
2. **Turn logic**: Add/modify systems in `src/app/systems/` (ensure they remain pure functions)
3. **Worker jobs**: Implement in `src/app/systems/jobs/` with corresponding helper in `store/helpers/`
4. **UI components**: Keep presentational, connect via Zustand hooks and custom interaction hooks
5. **Types**: Update in `src/app/types/` when adding new game entities or state
6. **Tests**: Add system tests in `tests/systems/` for turn logic, component tests for UI

## Common Patterns

### Adding a New Worker Action
1. Define helper function in `store/helpers/workerHelpers.ts` (pure state mutation)
2. Add action to `WorkerActionsSlice` in `workerActionsSlice.ts`
3. Implement job resolution in `systems/jobs/` (e.g., `farmerJob.ts`)
4. Update `developmentSystem.ts` to call your job resolver
5. Add UI interaction in `hooks/useWorkerActions.ts` or `useTileInteractions.ts`
6. Write tests in `tests/systems/`

### Adding a New System
1. Create system file in `src/app/systems/systems/` or `src/app/systems/`
2. Export a pure function `(state: GameState, rng?: RNG) => GameState`
3. Add to turn order in `runTurnPhases.ts`
4. Write comprehensive tests in `tests/systems/`

### Modifying Tile State
Always use helper functions that clone tiles/workers to maintain immutability:
```typescript
const newTile = { ...oldTile, resource: { ...oldTile.resource, level: 2 } };
```

### Using Selectors
For derived state that depends on multiple slices, create memoized selectors in `store/selectors.ts`:
```typescript
export const selectMyData = createSelector(
  [(state: GameStore) => state.foo, (state: GameStore) => state.bar],
  (foo, bar) => computeMyData(foo, bar)
);
```
