# Technical Debt & Refactoring

## Completed Refactoring ✅

### Phase 1: Foundation (Completed)
✅ Tile ID utilities created (`src/app/utils/tileIdUtils.ts`)
✅ Game constants extracted (`src/app/constants/gameConstants.ts`)
✅ Color/icon mappings centralized

### Phase 2: Component Refactoring (Completed)
✅ **Tile Component**: Reduced from 273 to ~100 lines
  - Created 3 custom hooks (useTileActions, useTileVisuals, useTileClickHandler)
  - Created 5 sub-components (TileBase, TileResource, TileInfrastructure, TileWorkers, TileJobs)
  - Converted to CSS modules

✅ **Design Token System**: Created `src/app/styles/tokens.css`

✅ **CSS Modules**: Converted all major components
  - MapView
  - WarehouseModal
  - CapitalModal

✅ **CapitalModal Breakdown**: Reduced from 284 to ~100 lines
  - Split into 5 focused sub-components
  - Each with single responsibility

## Current Issues

### Priority: CRITICAL

#### 1. Worker File Duplication
**Files**: `FarmerWorker.ts`, `MinerWorker.ts`, `RancherWorker.ts`, `ForesterWorker.ts`, `DrillerWorker.ts`
- **Issue**: ~200 lines duplicated across 5 files
- **Solution**: Consolidate using factory pattern
- **Impact**: Reduces codebase by 200 lines

#### 2. Tile ID Parsing Anti-Pattern
**Locations**: 10+ files
- **Pattern**: `const [x, y] = tileId.split("-").map(Number);`
- **Issue**: No validation, fragile, repeated
- **Status**: Utilities created, need migration
- **Action**: Replace all manual parsing with `parseTileId()` utility

### Priority: HIGH

#### 3. Large Functions Need Breaking Down

**`turnSlice.ts` - `advanceTurn` (58 lines)**
- Multiple responsibilities
- Complex nested operations
- Hard to test

**`workerHelpers.ts` - `cancelActionHelper` (58 lines)**
- High cyclomatic complexity
- Multiple conditional branches
- Difficult to test edge cases

**Action**: Extract to smaller, focused functions

#### 4. Console.log in Production
**Files**: `Tile.tsx`, `ProspectorWorker.ts`
- **Issue**: Debug statements left in production
- **Solution**: Create debug utility module
- **Action**: Replace all console.log with conditional debug helper

#### 5. TileInfoPanel Component
**File**: `TileInfoPanel.tsx` (122 lines)
- **Issue**: `renderWorkerActions` function too long (45 lines)
- **Solution**: Extract per-worker-type components
- **Impact**: Better maintainability, easier to test

### Priority: MEDIUM

#### 6. State Management Coupling
**Issue**: UI state mixed with game state in rootStore
- **Problem**: Can't save/load game state independently
- **Solution**: Separate `gameStore.ts` and `uiStore.ts`
- **Impact**: Better testability, easier persistence

#### 7. Inefficient Selectors
**Example**: `HUD.tsx` line 9
```typescript
const selectedTile = map.tiles.flat().find(tile => tile.id === selectedTileId);
```
- **Issue**: O(n²) operation on every render
- **Solution**: Use memoized selector with parseTileId
- **Impact**: Better performance

#### 8. Long Parameter Lists
**Example**: `moveAndStartDevelopment(tileId, workerId, workerType, targetLevel)`
- **Issue**: 4+ parameters violates clean code
- **Solution**: Use command objects/interfaces
- **Impact**: Better API, type safety

#### 9. Inconsistent State Mutation
**File**: `workerHelpers.ts`
- **Issue**: Manual spread operators, different patterns
- **Solution**: Consider using Immer library
- **Impact**: Consistent patterns, less verbose

### Priority: LOW

#### 10. Dead Code
- [ ] `AbstractWorker.ts` - Empty file
- [ ] `useTileInteractions.ts` - Incomplete hook
- [ ] Commented-out code in rootStore.ts

#### 11. Naming Inconsistencies
- [ ] Audit naming conventions
- [ ] Document standards
- [ ] Update incrementally

## Active Issues from Bug Fixes

### Fixed Issues ✅
- ✅ **2025-10-10**: Miner functionality - wrong start function called
- ✅ **2025-10-10**: Missing discovered resource check in factory
- ✅ **2025-10-10**: Duplicated `getStartDevelopmentFunction` helper
- ✅ **2025-10-10**: Cursor icon not using possibleAction
- ✅ **2025-10-10**: TypeScript compilation errors (case sensitivity, undefined refs)
- ✅ **2025-10-10**: Depot connectivity BFS algorithm

### Architectural Improvements Needed

#### Component Refactoring Patterns
**Established Pattern** (from Tile refactoring):
1. Extract logic to hooks (use[Component][Purpose].ts)
2. Create sub-components for sections
3. Use CSS modules with design tokens
4. Keep main component <150 lines

**Apply To**:
- [ ] TileInfoPanel (extract worker action components)
- [ ] Other large components as identified

#### State Helper Patterns
**Pattern**: Pure helper functions
- Location: `src/app/store/helpers/`
- Always maintain immutability
- Single responsibility
- Well-tested

## Refactoring Guidelines

### Before Creating New Code
1. **Search for existing utilities** - Check if function already exists
2. **Follow established patterns** - See ARCHITECTURE.md
3. **Use design tokens** - See `src/app/styles/tokens.css`
4. **Write tests** - Cover new functionality

### Component Refactoring Checklist
- [ ] Component >150 lines? → Extract hooks/sub-components
- [ ] Using inline styles? → Create CSS module
- [ ] Complex logic in render? → Extract to hooks
- [ ] Multiple responsibilities? → Split into focused components

### System/Helper Checklist
- [ ] Pure function? (no side effects)
- [ ] Immutable updates? (no mutations)
- [ ] Single responsibility?
- [ ] Tests written?
- [ ] Documentation added?

## Metrics

### Code Quality Targets
- **Function length**: <20 lines average
- **Component size**: <150 lines
- **Cyclomatic complexity**: <10
- **Test coverage**: >80%
- **Inline styles**: 0 (use CSS modules)
- **Magic values**: 0 (use constants)

### Current Status (Phase 2 Complete)
✅ Major components use CSS modules
✅ Design token system established
✅ Tile component fully refactored
✅ CapitalModal broken down
✅ Pattern established for future development

### Next Steps
1. **Phase 3**: Separate UI/game state stores
2. **Phase 4**: Clean up debug code, dead code, long parameter lists
3. **Continuous**: Apply patterns to new components as developed

## Prevention Strategies

### Code Review Checklist
- [ ] No console.log (use debug utility)
- [ ] No inline styles (use CSS modules)
- [ ] No magic values (use constants)
- [ ] No long functions (>20 lines)
- [ ] No long parameter lists (>3 params)
- [ ] Pure functions for systems
- [ ] Tests included
- [ ] Follows established patterns

### Development Guidelines
- Read existing code before creating new utilities
- Follow patterns in ARCHITECTURE.md
- Use design tokens for all styling
- Keep components focused and small
- Write tests for all new code
- Document complex logic

## Resources
- **Architecture**: `docs/ARCHITECTURE.md`
- **Manual**: `docs/manual.md`
- **Roadmap**: `docs/ROADMAP.md`
- **Claude Guide**: `CLAUDE.md`
- **Design Tokens**: `src/app/styles/tokens.css`
- **Constants**: `src/app/constants/gameConstants.ts`
