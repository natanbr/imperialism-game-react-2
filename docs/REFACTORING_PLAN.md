# Refactoring Plan

## Issues Identified During Miner Functionality Bug Fix (2025-10-10)

**Note**: These suggestions were identified while fixing the miner functionality bug. They should be properly explored and validated before applying.

### Priority: HIGH
- **workerHelpers.ts:116-123** - `startDevelopmentHelper` was calling wrong start function (FIXED IN THIS BUG)
  - **Issue**: Called `startDeveloperWork` for all development worker types instead of worker-specific functions
  - **Fix Applied**: Created `getStartDevelopmentFunction` helper that maps worker types to correct start functions
  - **Impact**: All development workers (Farmer, Miner, Rancher, Forester, Driller) now work correctly

- **developmentWorkerFactory.ts:30, 67** - Missing discovered resource check (FIXED IN THIS BUG)
  - **Issue**: Factory functions didn't check if resources were discovered before allowing development
  - **Fix Applied**: Added `if (tile.resource.discovered === false) return tile;` check
  - **Impact**: Miners and Drillers can now only develop resources that were exposed by Prospector

### Priority: MEDIUM
- **workerActionsSlice.ts:97-136** - `moveAndStartDevelopment` implementation could be cleaner
  - **Issue**: Duplicated worker lookup logic and complex inline implementation
  - **Suggested Fix**: Extract to a helper function similar to other worker action helpers
  - **Impact**: Better code organization and easier testing

- **workerHelpers.ts & workerActionsSlice.ts** - Duplicated `getStartDevelopmentFunction` helper (FIXED 2025-10-10)
  - **Issue**: Same helper function existed in two files (workerHelpers.ts:125-142 and workerActionsSlice.ts:27-44)
  - **Fix Applied**: Exported `getStartDevelopmentFunction` from workerHelpers.ts and imported in workerActionsSlice.ts, removed duplicate
  - **Impact**: DRY principle maintained, single source of truth for worker type mapping
  - **Root Cause**: Created helper functions in isolation without checking for existing utilities
  - **Prevention**: Updated fix.md with guidelines to search for existing utilities before creating new ones

---

## Issues Identified During Depot Connectivity Bug Fix (2025-10-10)

**Note**: These suggestions were identified while fixing the depot connectivity bug. They should be properly explored and validated before applying.

### Files Reviewed - No Issues Found ✅
During this bug fix, the following files were reviewed and found to follow good practices:
- **developmentSystem.ts** - Clean structure with well-separated pure functions for job resolution
- **railroadSystem.ts** - Good separation of concerns with consistent helper function patterns (`addRailroad`, `addDepot`, `addPort`)
- **transportConnectivitySystem.ts** - Clean BFS implementation with well-separated helper functions
- **runTurnPhases.ts** - Clear turn phase orchestration

---

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

