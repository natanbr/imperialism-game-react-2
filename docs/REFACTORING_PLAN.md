# Refactoring Plan

## Issues Identified During Engineer Depot Bug Fix (2025-10-10)

**Note**: These suggestions were identified while fixing the engineer depot construction bug. They should be properly explored and validated before applying.

### Priority: HIGH
- **TileInfoPanel.tsx:47-91** - `renderWorkerActions` function is too long (~45 lines) and handles multiple worker types
  - **Issue**: Single function with multiple conditional branches for different worker types violates Single Responsibility Principle
  - **Suggested Fix**: Extract into separate components or functions per worker type (e.g., `ProspectorActions`, `DeveloperActions`, `EngineerActions`)
  - **Impact**: Improves maintainability, testability, and reduces token usage when reading/editing specific worker logic

### Priority: MEDIUM
- **workerActionsSlice.ts & EngineerWorker.ts** - Inconsistent API between `startConstruction` and `moveAndStartConstruction`
  - **Issue**: `startConstruction` originally didn't accept `kind` parameter but `moveAndStartConstruction` did (fixed in this bug fix)
  - **Suggested Fix**: Review all worker action signatures for consistency; consider using a unified worker action interface
  - **Impact**: Better developer experience, reduces bugs from API mismatches

- **TileInfoPanel.tsx** - Mixed inline styles and CSS classes
  - **Issue**: Some buttons use inline styles while others use CSS classes, making styling inconsistent
  - **Suggested Fix**: Move all styling to CSS classes or CSS modules for consistency
  - **Impact**: Better maintainability, easier theming, better performance

### Priority: LOW
- **EngineerWorker.ts:40-56** - `getEngineerActions` function appears unused
  - **Issue**: Exported function that implements correct logic for determining engineer actions but isn't used in the codebase
  - **Suggested Fix**: Either integrate this function into the UI logic or remove if truly unused
  - **Impact**: Reduces dead code, improves codebase clarity

- **TileInfoPanel.tsx** - Worker action buttons could be more accessible
  - **Issue**: Buttons lack aria-labels and proper semantic attributes
  - **Suggested Fix**: Add aria-labels, aria-disabled, and tooltip components for better accessibility
  - **Impact**: Improved accessibility for users with disabilities

