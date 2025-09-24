---
description: Repository Information Overview
alwaysApply: true
---

# Imperialism Game React Information

## Summary
A Next.js-based implementation of the classic strategy game "Imperialism" using React. The project is in active development following a detailed roadmap that outlines the implementation of game features including map rendering, worker mechanics, transport networks, industry, trade, diplomacy, military, and technology systems.

## Structure
- **src/app**: Main application code
  - **components**: React components for UI elements (MapView, Tile, HUD, etc.)
  - **definisions**: Game rules and conversion tables
  - **hooks**: Custom React hooks
  - **store**: Zustand state management slices
    - **phases.ts**: Orchestrates turn advancement and per-phase logic (diplomacy, trade, production, combat, interceptions, logistics). Contains helpers like `runTurnPhases` and `computeLogisticsTransport` used by the game slice.
  - **testing**: Mock data for development
  - **types**: TypeScript type definitions for game entities
- **public**: Static assets and images

## Project Architecture
Must refer to [architecture.md](../../docs/architecture.md) for more details on the project's architecture.

## Entry Points
**Main Application**: src/app/page.tsx
**Layout Template**: src/app/layout.tsx
**Store Configuration**: src/app/store/rootStore.ts

## Game instructions
Refer to [manual.md](../../docs/manual.md). 

## Project development progress 
Refer to [ROAD_MAP.md](../../docs/ROAD_MAP.md)
