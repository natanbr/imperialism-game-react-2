# Quick Start: Applying Refactoring Patterns

**For AI Agents and Developers**

This guide provides quick steps to apply the established refactoring patterns to other components.

## Files to Reference

1. **Patterns**: `docs/REFACTORING_PATTERNS.md` - Detailed patterns and guidelines
2. **Summary**: `docs/PHASE_2_SUMMARY.md` - What was done in Phase 2
3. **Plan**: `REFACTORING_PLAN.md` - Overall refactoring roadmap
4. **Example**: `src/app/components/Tile/` - Fully refactored component

## Quick Refactoring Checklist

### For Large Components (>150 lines)

- [ ] **Step 1: Extract Constants**
  - Find magic numbers/strings
  - Add to `src/app/constants/gameConstants.ts` or `src/app/styles/tokens.css`
  - Replace all usages

- [ ] **Step 2: Create Hooks**
  - Identify complex logic (calculations, state derivation, event handlers)
  - Create hooks in `src/app/hooks/`
  - Name pattern: `use[ComponentName][Purpose].ts`
  - Example: `useTileActions.ts`, `useTileVisuals.ts`

- [ ] **Step 3: Create Sub-Components**
  - Identify rendering sections (workers, resources, info panels, etc.)
  - Create sub-components in `src/app/components/[ComponentName]/`
  - Name pattern: `[ComponentName][Section].tsx`
  - Example: `TileWorkers.tsx`, `TileResource.tsx`

- [ ] **Step 4: Create CSS Module**
  - Create `[ComponentName].module.css` next to component
  - Convert all inline styles to CSS classes
  - Use design tokens from `tokens.css`
  - Follow naming: `.component`, `.componentSection`, `.componentElement`

- [ ] **Step 5: Refactor Main Component**
  - Import hooks and sub-components
  - Replace logic with hook calls
  - Replace rendering with sub-components
  - Remove all inline styles

- [ ] **Step 6: Create Index File**
  - Create `index.ts` in component directory
  - Re-export all sub-components
  - Allows clean imports: `import { TileWorkers } from '@/components/Tile'`

### For Small Components (<150 lines)

- [ ] **Extract constants** (if any magic values)
- [ ] **Create CSS module** (if has inline styles)
- [ ] **Extract hooks** (if has complex logic)
- Leave as single file (don't over-engineer)

## Template: Creating a Hook

```typescript
// src/app/hooks/useMyComponentLogic.ts

import { useMemo } from 'react';
import { MyType } from '@/types/MyType';

/**
 * Hook description
 *
 * @param param1 - Description
 * @param param2 - Description
 * @returns Description
 */
export function useMyComponentLogic(
  param1: MyType,
  param2: string
): ReturnType {
  return useMemo(() => {
    // Your logic here
    return computedValue;
  }, [param1, param2]); // Don't forget dependencies!
}
```

## Template: Creating a Sub-Component

```typescript
// src/app/components/MyComponent/MyComponentSection.tsx

import React from 'react';
import styles from './MyComponent.module.css';

export interface MyComponentSectionProps {
  data: DataType;
  onAction: (id: string) => void;
}

/**
 * Component description
 */
export const MyComponentSection: React.FC<MyComponentSectionProps> = ({
  data,
  onAction,
}) => {
  return (
    <div className={styles.section}>
      {/* Your JSX here */}
    </div>
  );
};
```

## Template: CSS Module

```css
/* src/app/components/MyComponent/MyComponent.module.css */

/* Container */
.component {
  padding: var(--spacing-md);
  background: var(--color-background);
}

/* Sections */
.section {
  margin-bottom: var(--spacing-sm);
}

/* Elements */
.button {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--spacing-xs);
  transition: background var(--transition-fast);
}

/* States */
.buttonHover:hover {
  background: var(--color-hover);
}

.buttonActive {
  background: var(--color-active);
}
```

## Template: Main Component

```typescript
// src/app/components/MyComponent/MyComponent.tsx

import React from 'react';
import { useGameStore } from '@/store/rootStore';
import { useMyComponentLogic } from '@/hooks/useMyComponentLogic';
import { MyComponentSection } from './MyComponentSection';
import styles from './MyComponent.module.css';

export interface MyComponentProps {
  id: string;
}

/**
 * Main component description
 */
export const MyComponent: React.FC<MyComponentProps> = ({ id }) => {
  // Store selectors
  const data = useGameStore((s) => s.data);
  const action = useGameStore((s) => s.action);

  // Custom hooks
  const computedData = useMyComponentLogic(data, id);

  return (
    <div className={styles.component}>
      <MyComponentSection
        data={computedData}
        onAction={action}
      />
    </div>
  );
};
```

## Template: Index File

```typescript
// src/app/components/MyComponent/index.ts

export { MyComponent } from './MyComponent';
export { MyComponentSection } from './MyComponentSection';
export type { MyComponentProps } from './MyComponent';
```

## Common Patterns

### Pattern: Extract Event Handler to Hook

**Before:**
```typescript
const handleClick = () => {
  // 20 lines of logic
};
```

**After:**
```typescript
// In hook file
export function useMyClickHandler(data: Data) {
  return useCallback(() => {
    // 20 lines of logic
  }, [data]);
}

// In component
const handleClick = useMyClickHandler(data);
```

### Pattern: Extract Visual Computation

**Before:**
```typescript
const color = condition1 ? 'red' : condition2 ? 'blue' : 'green';
const border = isSelected ? '3px solid red' : '1px solid gray';
```

**After:**
```typescript
// In hook file
export function useMyVisuals(condition1, condition2, isSelected) {
  return useMemo(() => ({
    color: condition1 ? 'red' : condition2 ? 'blue' : 'green',
    border: isSelected ? '3px solid red' : '1px solid gray',
  }), [condition1, condition2, isSelected]);
}

// In component
const { color, border } = useMyVisuals(condition1, condition2, isSelected);
```

### Pattern: Extract Sub-Component

**Before:**
```typescript
<div>
  {items.map(item => (
    <div key={item.id}>
      {/* 15 lines of JSX */}
    </div>
  ))}
</div>
```

**After:**
```typescript
// In ItemDisplay.tsx
export const ItemDisplay = ({ item }) => (
  <div>
    {/* 15 lines of JSX */}
  </div>
);

// In main component
<div>
  {items.map(item => (
    <ItemDisplay key={item.id} item={item} />
  ))}
</div>
```

## Design Tokens Reference

Available in `src/app/styles/tokens.css`:

- **Spacing**: `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`
- **Colors**: `--color-selected`, `--color-border-default`, etc.
- **Transitions**: `--transition-fast`, `--transition-normal`
- **Shadows**: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- **Font sizes**: `--font-size-xs`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`

## Constants Reference

Available in `src/app/constants/gameConstants.ts`:

- **TILE_CONFIG**: Tile dimensions and borders
- **TIME_CONFIG**: Turns per year, starting values
- **WORKER_ICONS**: Icons for each worker type
- **TERRAIN_COLORS**: Colors for each terrain type
- **RESOURCE_ICONS**: Icons for each resource type
- **RESOURCE_VALUES**: Monetary values for resources
- **DEVELOPMENT_CONFIG**: Development parameters
- **CONSTRUCTION_CONFIG**: Construction parameters

## When to Refactor

### High Priority
- Component >200 lines
- >30 inline style objects
- Complex event handlers (>30 lines)
- Multiple responsibilities in one file
- Repeated code patterns

### Medium Priority
- Component >150 lines
- >15 inline style objects
- Growing complexity
- Hard to test

### Low Priority
- Component <150 lines
- Few inline styles
- Single responsibility
- Easy to understand

## Tips for AI Agents

1. **Read the example first**: Look at `src/app/components/Tile/` before starting
2. **Start small**: Extract one hook or sub-component at a time
3. **Test frequently**: Run build after each change
4. **Use types**: Let TypeScript guide you
5. **Follow naming**: Consistent names make files easy to find
6. **Document**: Add JSDoc comments to hooks
7. **Keep it DRY**: Reuse existing hooks and components when possible

## Quick Commands

```bash
# Run tests
npm run test

# Build project
npm run build

# Start dev server
npm run dev

# Run specific test
npx vitest run tests/path/to/test.ts
```

## Need Help?

- **Patterns**: See `docs/REFACTORING_PATTERNS.md`
- **Example**: Study `src/app/components/Tile/`
- **Plan**: Check `REFACTORING_PLAN.md` for context
- **Guidelines**: Read `CLAUDE.md` for project conventions
