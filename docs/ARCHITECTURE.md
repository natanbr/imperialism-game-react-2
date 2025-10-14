# Architecture & Development Guidelines

## Overview
Next.js 15 strategy game with React 19, TypeScript, Zustand state management, and Vitest testing. Turn-based gameplay featuring workers, transport, diplomacy, trade, and combat.

## Project Structure

```
src/app/
├── components/        # React UI components
├── constants/         # Game constants (gameConstants.ts)
├── definisions/       # Game rules and data tables
├── hooks/             # Custom React hooks (logic extraction)
├── store/             # Zustand state management
│   ├── helpers/       # Pure state mutation helpers
│   └── slices/        # Domain-specific state slices
├── systems/           # Turn-based game logic (pure functions)
│   └── jobs/          # Worker job resolution
├── styles/            # CSS modules and design tokens
├── testing/           # Mock data for tests
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── workers/           # Worker type implementations

tests/                 # Vitest test files (mirrors src/app/)
docs/                  # Project documentation
```

## Architecture Layers

### 1. State Management (Zustand)

**Pattern**: Sliced store - each slice = domain-specific state + actions

**Location**: `src/app/store/`

**Core Slices**:
- `gameSlice` - Turn, year
- `mapSlice` - Tiles grid, terrain, resources
- `nationSlice` - Nations, warehouses, industry
- `workerActionsSlice` - Worker commands (move, develop, construct)
- `turnSlice` - Turn execution orchestration
- `technologySlice` - Tech research
- `transportSlice` - Network capacity
- `industrySlice` - Production recipes

**UI Slices**:
- `tileSelectionSlice` - Selected tile/worker
- `cameraSlice` - Pan/zoom state
- `overlaySlice` - Modals visibility
- `controlsSlice` - UI controls

**Composition**: `rootStore.ts` combines all slices using spread operators

**Selectors**: Memoized with `reselect` in `src/app/store/selectors.ts`

### 2. Turn-Based Game Loop

**Orchestration**: `src/app/systems/runTurnPhases.ts`

**Phase Order**:
1. Development - Worker jobs (prospect, farm, mine, etc.)
2. Diplomacy - Diplomatic offers
3. Trade - Trade deals
4. Production - Industrial production
5. Combat - Military conflicts
6. Interceptions - Blockades cancel trades
7. Transport Connectivity - Network graphs
8. Logistics - Move resources to warehouses

**System Contract**: Pure function `(state: GameState, rng?: RNG) => GameState`

**Determinism**: Seeded RNG (`src/app/systems/utils/rng.ts`) ensures reproducible outcomes

### 3. Worker System

**Types**: Prospector, Engineer, Miner, Farmer, Rancher, Forester, Driller, Developer

**Status**: Available, Moved, Working

**Architecture**:
- `src/app/store/helpers/workerHelpers.ts` - Pure state mutation helpers
- `src/app/hooks/useWorkerActions.ts` - UI interaction hooks
- `src/app/hooks/useTileInteractions.ts` - Tile click handlers
- `src/app/systems/jobs/*Job.ts` - Turn-based job resolution

**Job Flow**:
1. Player commands worker action (UI)
2. Worker status → Working, tile gets job (developmentJob/constructionJob)
3. Turn execution resolves job (decrements turns, applies effects)
4. Job completes when turnsRemaining = 0

### 4. Map & Tiles

**Structure**: 2D grid `state.map.tiles[y][x]` (row, column indexed)

**Tile Properties** (`src/app/types/Tile.ts`):
- `terrain` - TerrainType (Farm, Mountains, Swamp, etc.)
- `resource` - Type and level 0-3 (minerals/oil start hidden)
- `workers` - Array of workers on tile
- `developmentJob` / `constructionJob` - Active jobs
- `ownerNationId` / `cityId` - Ownership
- `port`, `depot`, `fortLevel`, `connected` - Infrastructure

**Adjacent Tiles**: Brick pattern with half-tile shift (6 neighbors: 2 top, 2 sides, 2 bottom)

### 5. Transport System

**Capacity**: Per-turn limit (resource units) per nation

**Connectivity**: BFS graph of connected tiles via depots/rails/ports (`transportConnectivitySystem`)

**Logistics**: `logisticsSystem` moves resources from provinces → national warehouse (respects capacity)

**Allocation**: Players distribute capacity via `TransportAllocationModal`

**Rules**:
- Depots/Ports must connect to capital or active port via railroad
- Capital acts as depot (collects from adjacent tiles)
- Only active depots/ports transfer resources

### 6. Component Architecture

**Main Page**: `src/app/page.tsx` - Renders MapView, HUD, modals

**Component Pattern**: Refactored for modularity
- **Hooks**: `src/app/hooks/` - Logic separation (useTileActions, useTileVisuals)
- **Sub-components**: `src/app/components/[Component]/` - Single responsibility
- **CSS Modules**: `[Component].module.css` with design tokens
- **Index files**: Re-export for clean imports

**Example** (Tile component):
```
src/app/components/Tile/
├── Tile.tsx           # Main component (~100 lines)
├── TileBase.tsx       # Base rendering
├── TileResource.tsx   # Resource display
├── TileWorkers.tsx    # Worker buttons
├── TileJobs.tsx       # Job indicators
├── Tile.module.css    # All styles
└── index.ts           # Re-exports
```

**Design Tokens**: `src/app/styles/tokens.css` - Spacing, colors, typography

### 7. Type Organization

**Location**: `src/app/types/`

**Key Files**:
- `GameState.ts` - Root state + turn order
- `Nation.ts`, `City.ts`, `Army.ts`, `Navy.ts` - Entities
- `Tile.ts`, `Map.ts`, `Workers.ts` - Map/workers
- `Resource.ts`, `Industry.ts`, `Technology.ts` - Economy
- `Diplomacy.ts`, `TradeRoute.ts`, `Transport.ts` - Systems
- `jobs/` - Job state types
- `actions.ts` - UI action types

### 8. Path Aliases

`@/*` → `src/app/*`

Example:
```typescript
import { GameState } from '@/types/GameState';
import { selectActiveNation } from '@/store/selectors';
```

## Development Workflow

### Adding a Worker Action
1. Define helper in `store/helpers/workerHelpers.ts` (pure function)
2. Add action to `WorkerActionsSlice`
3. Implement job resolution in `systems/jobs/`
4. Update `developmentSystem.ts` to call resolver
5. Add UI interaction in `hooks/useWorkerActions.ts`
6. Write tests in `tests/systems/`

### Adding a System
1. Create file in `src/app/systems/`
2. Export pure function `(state: GameState, rng?: RNG) => GameState`
3. Add to turn order in `runTurnPhases.ts`
4. Write tests in `tests/systems/`

### Adding a Component
1. Create component directory: `src/app/components/[Name]/`
2. Extract logic to hooks: `src/app/hooks/use[Name][Purpose].ts`
3. Create sub-components for sections
4. Create CSS module with design tokens
5. Create index file for exports

## Best Practices

### State Management
- **Slices**: Single domain responsibility
- **Actions**: Simple state updates only
- **Immutability**: Always use spread operators, never mutate
- **Selectors**: Memoize with `reselect` for derived state

### Systems
- **Purity**: No side effects, same input → same output
- **Focus**: One aspect of turn sequence only
- **Immutability**: Return new state object with changes

### Components
- **Size**: Keep main component < 150 lines
- **Logic**: Extract to hooks
- **Styles**: Use CSS modules + design tokens
- **Props**: Define interfaces, document with JSDoc
- **Events**: Use callbacks, extract complex handlers to hooks

### Testing
- **Location**: `tests/` mirrors `src/app/` structure
- **Mocks**: Use `src/app/testing/` helpers
- **Systems**: Test pure functions with input/output assertions
- **Coverage**: Run `npx vitest run --coverage`

## Code Organization Patterns

### Tile State Modifications
Always maintain immutability:
```typescript
const newTile = { ...oldTile, resource: { ...oldTile.resource, level: 2 } };
```

### Selectors for Derived State
```typescript
export const selectMyData = createSelector(
  [(state: GameStore) => state.foo, (state: GameStore) => state.bar],
  (foo, bar) => computeMyData(foo, bar)
);
```

### Constants
Extract to `src/app/constants/gameConstants.ts`:
```typescript
export const TILE_CONFIG = {
  SIZE: 100,
  BORDER_NORMAL: 1,
  BORDER_SELECTED: 3,
} as const;
```

## Key Files Reference

- **Root Store**: `src/app/store/rootStore.ts`
- **Turn Orchestration**: `src/app/systems/runTurnPhases.ts`
- **Game Definitions**: `src/app/definisions/`
- **Design Tokens**: `src/app/styles/tokens.css`
- **Game Constants**: `src/app/constants/gameConstants.ts`
- **Mock Data**: `src/app/testing/`
- **Main Page**: `src/app/page.tsx`

## Notes for AI Assistants

- **CLAUDE.md** has detailed implementation patterns
- **docs/manual.md** contains complete game rules
- **docs/ROADMAP.md** tracks development progress
- **docs/TECH_DEBT.md** lists refactoring priorities
- Always read existing code before creating new utilities
- Follow established patterns for consistency
- Write tests for all new systems/helpers
- Use design tokens for all styling
