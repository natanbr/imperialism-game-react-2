# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Framework: Next.js (app router) with React 19 and TypeScript 5
- State: Zustand store composed from feature slices (see src/app/store)
- Game logic: Pure “systems” that transform GameState per turn (see src/app/systems)
- Tests: Vitest with V8 coverage; tests expected under tests/**/*.test.ts; helpers/fixtures in src/app/testing
- Linting: ESLint (flat config) extending next/core-web-vitals and next/typescript
- Path alias: @/* -> src/app/* (tsconfig + vitest alias)

Commands
Use npm (package-lock.json present).
- Install
  - npm ci
- Dev server (Turbopack)
  - npm run dev
  - App: http://localhost:3000
- Build
  - npm run build
- Start production build
  - npm run start
- Lint entire repo
  - npm run lint
- Lint specific file
  - npx eslint src/app/store/rootStore.ts
- Test (one-shot)
  - npm run test
- Test in watch mode
  - npm run test:watch
- Run a single test file
  - npm run test -- tests/path/to/file.test.ts
- Run tests matching a name/pattern
  - npm run test -- -t "pattern"
- Coverage report (text + HTML)
  - npx vitest run --coverage

Architecture and structure (big picture)
- Next.js app router (src/app)
  - layout.tsx defines global layout, imports globals.css and fonts
  - page.tsx is a client component that composes MapView, HUD, and modals (Warehouse, Capital, Construction, Transport Allocation)
- State management (src/app/store)
  - Zustand store assembled in rootStore.ts by composing multiple feature slices:
    - Core game: gameSlice, turnSlice, mapSlice, nationSlice, technologySlice, transportSlice, workerActionsSlice
    - UI/controls: controlsSlice (with cameraSlice, overlaySlice), tileSelectionSlice
  - Selectors in selectors.ts (reselect is available) centralize derived data
  - Slices expose actions used by UI components and systems
- Deterministic turn processing (src/app/systems)
  - runTurnPhases orchestrates the game-turn pipeline using a seeded PRNG (Mulberry32) for deterministic randomness
  - System order:
    1) developmentSystem
    2) diplomacySystem
    3) tradeSystem
    4) productionSystem
    5) combatSystem
    6) interceptionsSystem
    7) transportConnectivitySystem
    8) logisticsSystem
  - Each system is a pure function: (state[, rng]) => newState
- Domain model and constants
  - Types under src/app/types (GameState, Map, Nation, Army, Technology, Workers, etc.)
  - Static definitions under src/app/definisions (resourceDefinitions, terrainDefinitions, workerDefinitions, durations, conversions, prices)
  - Worker logic under src/app/workers (abstract base and concrete worker types)
- UI components (src/app/components)
  - MapView and Tile render the world and interactions; HUD subcomponents show stats, actions, and turn info; modal components manage player decisions
- Hooks and utilities
  - src/app/hooks (e.g., useEdgeScroll, useTransportAllocations) implement UI behaviors and derived state helpers
  - src/app/store/helpers contain map/worker helper logic used by slices/systems
- Testing
  - Unit tests are organized under tests/**/*.test.ts (vitest config)
  - src/app/testing provides mockMap, mockNation, and worldInit to build testable game states

Key config highlights
- tsconfig.json
  - Strict TypeScript, bundler module resolution, path alias @/* => ./src/app/*
- vitest.config.ts
  - test.include: tests/**/*.test.ts; alias '@' => '/src/app'; coverage: v8 with text and HTML reporters
- eslint.config.mjs
  - Flat config using next/core-web-vitals and next/typescript; ignores build artifacts (.next, out, build, node_modules)
- next.config.ts
  - Default/empty base for Next.js configuration (extend here as needed)

Notes for future Warp usage
- Prefer absolute imports with the @ alias for app code shared across components, slices, and systems
- When adding new systems, ensure their execution order is intentional by updating runTurnPhases accordingly
- New slices should be composed in rootStore.ts to participate in global state; update selectors to expose derived data consistently
- Tests: place files under tests/** to be discovered by Vitest; use src/app/testing helpers to construct minimal GameState fixtures
