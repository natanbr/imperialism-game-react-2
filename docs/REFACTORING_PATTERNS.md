# Refactoring Patterns for AI Agent Optimization

**Created:** 2025-10-09
**Purpose:** Document established patterns for code refactoring optimized for AI agent token usage

## Overview

This document describes the refactoring patterns applied to the codebase to optimize for AI agent interactions. The goal is to minimize token usage while maintaining code quality and functionality.

## Core Principles

### 1. Single Responsibility Principle (SRP)
- **One file, one purpose**: Each file should have a single, well-defined responsibility
- **Small files over large files**: Easier to read, understand, and modify
- **Target size**: 50-150 lines per file (excluding CSS)

### 2. Separation of Concerns
- **Logic**: Custom hooks in `src/app/hooks/`
- **Presentation**: Components in `src/app/components/`
- **Styling**: CSS modules alongside components
- **Constants**: Shared constants in `src/app/constants/`
- **Types**: Type definitions in `src/app/types/`

### 3. Modular Architecture
- **Component hierarchy**: Break large components into smaller sub-components
- **Directory structure**: Group related files in subdirectories
- **Index files**: Re-export for clean imports

## Established Patterns

### Pattern 1: Component Refactoring (Tile Example)

#### Before (273 lines, monolithic)
```
Tile.tsx
├── Inline styles (86+ objects)
├── Business logic (action determination)
├── Event handlers (50+ lines)
├── Rendering logic (all in one file)
└── Color/icon mappings
```

#### After (Modular structure)
```
components/Tile/
├── index.ts                    # Re-exports
├── Tile.module.css            # All styles
├── TileBase.tsx               # Base rendering (~40 lines)
├── TileResource.tsx           # Resource display (~30 lines)
├── TileInfrastructure.tsx     # Infrastructure (~40 lines)
├── TileWorkers.tsx            # Worker buttons (~40 lines)
└── TileJobs.tsx               # Job indicators (~35 lines)

hooks/
├── useTileActions.ts          # Action logic (~65 lines)
├── useTileVisuals.ts          # Visual computation (~55 lines)
└── useTileClickHandler.ts     # Event handling (~85 lines)

components/
└── TileRefactored.tsx         # Main component (~100 lines)
```

#### Benefits for AI Agents
1. **Selective Reading**: Agent can read only `useTileActions.ts` to understand action logic
2. **Isolated Changes**: Modifying styles only requires reading the CSS module
3. **Clear Dependencies**: Each file's purpose is immediately clear from its name
4. **Reduced Context**: No need to load entire 273-line file to understand one aspect

### Pattern 2: Custom Hooks

#### Purpose
Extract complex logic from components into reusable, testable hooks.

#### Structure
```typescript
// hooks/useTileActions.ts

/**
 * Hook to determine what action a selected worker can perform on a tile
 *
 * @param tile - The tile to check actions for
 * @param selectedWorker - The currently selected worker
 * @param map - The game map
 * @returns The possible action the worker can perform, or null
 */
export function useTileActions(
  tile: Tile,
  selectedWorker: Worker | null,
  map: GameMap
): PossibleAction {
  return useMemo(() => {
    // Logic here
  }, [dependencies]);
}
```

#### Guidelines
- **Documentation**: Use JSDoc comments for parameters and return values
- **Type Safety**: Always specify input/output types
- **Memoization**: Use `useMemo` or `useCallback` for expensive operations
- **Single Purpose**: Each hook should do one thing well

### Pattern 3: CSS Modules with Design Tokens

#### Design Tokens (`src/app/styles/tokens.css`)
```css
:root {
  /* Spacing */
  --spacing-xs: 2px;
  --spacing-sm: 4px;
  --spacing-md: 8px;
  --spacing-lg: 16px;

  /* Colors */
  --color-selected: #ff0000;
  --color-border-default: #555;

  /* Transitions */
  --transition-fast: 200ms ease;
}
```

#### Component CSS Module
```css
/* components/Tile/Tile.module.css */

.tile {
  width: var(--tile-width);
  height: var(--tile-height);
  transition: box-shadow var(--transition-fast);
}

.workerButton {
  border-radius: var(--spacing-sm);
  padding: 0 var(--spacing-xs);
}
```

#### Usage in Component
```typescript
import styles from './Tile.module.css';

export const TileBase = () => (
  <div className={styles.tile}>
    <button className={styles.workerButton}>...</button>
  </div>
);
```

#### Benefits
- **No inline styles**: Reduces component file size
- **Centralized values**: Change design tokens once, affects all components
- **Type safety**: CSS modules provide compile-time checking
- **Performance**: Styles cached by browser

### Pattern 4: Sub-Component Decomposition

#### When to Decompose
- Component exceeds 150 lines
- Rendering multiple distinct UI sections
- Repetitive rendering patterns
- Complex conditional rendering

#### How to Decompose

1. **Identify sections**: Look for logical UI boundaries
2. **Extract props**: Determine minimal data each section needs
3. **Create sub-component**: Move section to new file
4. **Keep it pure**: Sub-components should be presentation-only
5. **Co-locate files**: Keep related files in same directory

#### Example Structure
```typescript
// TileInfrastructure.tsx
export interface TileInfrastructureProps {
  depot: boolean;
  depotActive: boolean;
  port: boolean;
  portActive: boolean;
}

export const TileInfrastructure: React.FC<TileInfrastructureProps> = ({
  depot,
  depotActive,
  port,
  portActive,
}) => {
  // Minimal, focused rendering logic
};
```

### Pattern 5: Directory Organization

```
src/app/
├── components/
│   ├── ComponentName/           # For complex components
│   │   ├── index.ts             # Re-exports
│   │   ├── ComponentName.tsx    # Main component
│   │   ├── ComponentName.module.css
│   │   ├── SubComponent1.tsx
│   │   └── SubComponent2.tsx
│   └── SimpleComponent.tsx      # For simple components
├── hooks/
│   ├── useComponentLogic.ts
│   └── useComponentBehavior.ts
├── constants/
│   └── gameConstants.ts
├── styles/
│   └── tokens.css
└── types/
    └── ComponentTypes.ts
```

## Migration Guide

### For Existing Components

1. **Assess complexity**: Count lines, identify inline styles, check responsibilities
2. **Create design tokens**: Extract magic values to tokens.css
3. **Extract hooks**: Move logic to custom hooks
4. **Create sub-components**: Break down rendering into logical sections
5. **Create CSS module**: Convert inline styles to CSS classes
6. **Refactor main component**: Use new hooks and sub-components
7. **Test**: Verify functionality unchanged
8. **Update imports**: Replace old component with new

### For New Components

1. **Start small**: Keep initial file small and focused
2. **Use design tokens**: Reference tokens.css for all values
3. **Plan ahead**: Consider splitting if component will grow
4. **Hooks first**: Extract complex logic immediately
5. **CSS modules only**: Never use inline styles

## AI Agent Best Practices

### For Reading Code
1. **Check index files first**: Understand component exports
2. **Read hooks separately**: Understand logic without UI
3. **Read CSS separately**: Understand styling without logic
4. **Read types separately**: Understand data structures independently

### For Modifying Code
1. **Identify scope**: Which file(s) need changes?
2. **Read minimal context**: Only read affected files
3. **Preserve patterns**: Follow established structure
4. **Update related files**: Keep hooks/components/styles in sync

### For Writing Code
1. **Follow patterns**: Use existing components as templates
2. **Keep files small**: Split early rather than later
3. **Document decisions**: Add JSDoc comments
4. **Use types**: Leverage TypeScript for safety

## Metrics

### Token Usage Comparison

**Before Refactoring** (Tile component):
- Reading full component: ~3,000 tokens
- Understanding action logic: ~3,000 tokens (must read entire file)
- Modifying styles: ~3,000 tokens (must read entire file)

**After Refactoring**:
- Reading full component: ~1,500 tokens (main file only)
- Understanding action logic: ~800 tokens (useTileActions.ts only)
- Modifying styles: ~600 tokens (Tile.module.css only)

**Token Savings**: ~50-75% depending on task

## Future Considerations

### Phase 3: State Management
- Separate UI state from game state
- Create focused store slices
- Optimize selectors with memoization

### Phase 4: Code Quality
- Extract debug utilities
- Standardize error handling
- Remove dead code

## References

- Main refactoring plan: `REFACTORING_PLAN.md`
- Project guidelines: `CLAUDE.md`
- Design tokens: `src/app/styles/tokens.css`
- Example refactoring: `src/app/components/Tile/`
