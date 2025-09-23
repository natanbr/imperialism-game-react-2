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
This project is a React reproduction of the classic strategy game "Imperialism". It uses Next.js as its framework and Tailwind CSS for styling. The project structure is organized into components, hooks, store slices, and types to facilitate modular development.
**Strict Mode**: Enabled! Always use explicit type, never use any as it result in errors. 
**State Management**: Zustand for global state with slice pattern
**Component Structure**:
- MapView: Main game map display
- Tile: Individual map tiles with terrain, resources, and workers
- HUD: Game interface elements
- TileInfoPanel: Detailed information about selected tiles

**Game Entities**:
- Map & Tiles: Terrain types, resources, and geographic features
- Workers: Units that develop resources (Prospector, Farmer, etc.)
- Resources: Raw materials and processed goods
- Nations: Player and AI-controlled countries
- Industry: Production facilities and conversion chains
- Transport: Resource movement network
- Military: Army and navy units

## Development Progress
The project follows a phased roadmap:
1. Core Map & UI: ✅ Completed
2. Workers (Civilian Units): Partially implemented
3. Transport Network: Planned
4. Industry: Planned
5. Trade & Diplomacy: Planned
6. Military: Planned
7. Technology: Planned
8. Victory & Council: Planned

## Entry Points
**Main Application**: src/app/page.tsx
**Layout Template**: src/app/layout.tsx
**Store Configuration**: src/app/store/rootStore.ts

about the game
### Imperialism Game Summary for Code Generation

#### Game Overview
Imperialism is a turn-based strategy game set in the 19th century where players control a nation and compete to become the dominant world power through economic development, diplomacy, trade, and military conquest.

### Core Game Goal
The primary objective is to achieve dominance through the **Council of Governors** system:
- Every 10 years, a council votes to determine the leading power
- Each province controlled = 1 vote
- Two leading powers are nominated
- Victory is achieved by gaining the most votes/influence

### Game Flow & Turn Structure
Each turn follows a specific phase order:
1. **Diplomacy Phase** - Diplomatic offers exchange
2. **Trade Phase** - Trade deals resolve
3. **Combat Phase** - Military conflicts resolve
4. **Transportation-Connectivity** - Compute active depots/ports via rail connectivity to capital or ocean ports
5. **Production Phase** - Industrial production occurs
6. **Interceptions Phase** - Blockades cancel trades
7. **Logistics Phase** - Internal transport + successful trades to warehouse

### Core Game Systems

#### 1. Territory & Map System
- **grid-based map** with various terrain types
- **Terrain Types**: Plains, Hills, Mountains, Forest, Swamp, Desert, Tundra, Coast, River, Town, Capital
- **Provinces**: Territorial units that provide votes in the Council of Governors
- **Tiles**: Individual map squares that can contain resources, workers, and improvements

#### 2. Resource & Economic System
**Resource Categories:**
- **Raw Resources**: Grain, Fruit, Livestock, Fish, Cotton, Wool, Timber, Coal, Iron Ore, Gold, Gems, Oil, Horses
- **Materials**: Fabric, Lumber, Paper, Steel, Fuel, Canned Food
- **Finished Goods**: Clothing, Furniture, Hardware, Armaments

**Resource Development:**
- Resources have development levels (0-3) that increase production
- Level 0 = base production, Level 3 = maximum development
- Hidden resources (Coal, Iron, Gold, Gems, Oil) must be discovered by Prospectors

**Production Chains:**
- 2 Cotton/Wool → 1 Fabric → Clothing (2 Fabric = 1 Clothing)
- 2 Timber → 1 Lumber → Furniture (2 Lumber = 1 Furniture)
- 1 Iron Ore + 1 Coal → 1 Steel → Hardware/Armaments (2 Steel = 1 unit)
- 2 Oil → 1 Fuel
- Complex food processing: 2 Grain + 1 Fruit + 1 Livestock/Fish → 2 Canned Food

#### 3. Worker System (Civilian Units)
**Worker Types & Functions:**
- **Prospector**: Discovers hidden resources in barren terrain
- **Farmer**: Develops farms/orchards/plantations
- **Rancher**: Develops open range/fertile hills for livestock
- **Forester**: Develops hardwood forests for timber
- **Miner**: Extracts minerals from discovered deposits
- **Driller**: Extracts oil (requires technology)
- **Engineer**: Builds infrastructure (depots, ports, forts, railways)

**Worker Mechanics:**
- Workers can move unlimited distance in owned territory
- Each worker type has specific valid terrain and actions
- Actions improve resource development levels over time

#### 4. Transport & Infrastructure
- **Capital**: Acts as automatic depot + port
- **Depots**: Connect adjacent improved tiles to transport network
- **Transport Capacity**: Limited resources can be moved per turn
- **Merchant Marine**: Ships with cargo holds for international trade

#### 5. Industry System
**Industrial Buildings:**
- **Textile Mill**: Processes cotton/wool into fabric
- **Lumber Mill**: Processes timber into lumber/paper
- **Steel Mill**: Combines iron ore + coal into steel
- **Food Processing**: Creates canned food from raw ingredients
- **Clothing Factory, Furniture Factory, Metal Works, Refinery**

**Labor System:**
- **Untrained Workers**: 1 labor unit
- **Trained Workers**: 2 labor units  
- **Expert Workers**: 4 labor units
- Training requires paper + cash investment

#### 6. Trade & Diplomacy
**Trade System:**
- **Bid & Offers Screen**: Players offer goods and bid for resources
- **Merchant Marine Capacity**: Limits number of simultaneous trades
- **Trade Policies**: Subsidies, boycotts between nations

**Diplomatic Relations:**
- **Attitude Scale**: -100 to +100 relationship values
- **Treaty Types**: Alliance, Non-Aggression, Peace, Trade, Colony
- **Grants**: Financial aid between nations (one-time or recurring)

#### 7. Military System
**Unit Types:**
- **Regiments**: Infantry, Cavalry, Artillery
- **Production**: Built in Armory using armaments + horses
- **Deployment**: Units placed in provinces for defense/attack

**Combat Resolution:**
- **Strategic Combat**: Compare firepower, morale, entrenchment
- **Tactical Combat**: Optional detailed battle resolution

#### 8. Technology System
- **Investment-Based**: Players invest cash to unlock new capabilities
- **Unlocks**: New worker types, industrial buildings, military units
- **Example**: "Feed Grasses" technology unlocks Rancher workers

### Key Game Mechanics for Implementation

#### Victory Conditions
- **Council of Governors**: Every 10 years, vote based on province control
- **Dominance Metrics**: Territory control, economic power, military strength

#### Resource Flow
1. **Extraction**: Workers develop resource tiles
2. **Transport**: Resources moved via transport network to warehouse
3. **Processing**: Raw materials converted to finished goods in industry
4. **Trade**: Surplus goods traded internationally for cash/resources

#### Nation Management
- **Treasury**: Cash for investments, worker training, military
- **Warehouse**: Stockpile of all resources, materials, and goods
- **Debt System**: Nations can borrow against credit limits
- **Colonies**: Control of minor nations for additional resources/votes


This summary provides the essential game mechanics, systems, and flow needed for accurate code generation when implementing features for the Imperialism game remake.

## Map Layout & Adjacency (Brick Pattern)
- The map uses a brick pattern layout: every odd row is shifted horizontally by half a tile width.
- Each tile has up to 6 adjacent tiles:
  - Top neighbors: if row is odd → (x, y-1) and (x+1, y-1); if row is even → (x-1, y-1) and (x, y-1).
  - Side neighbors: (x-1, y) and (x+1, y).
  - Bottom neighbors: if row is odd → (x, y+1) and (x+1, y+1); if row is even → (x-1, y+1) and (x, y+1).
- Always respect bounds: 0 ≤ x < cols, 0 ≤ y < rows.
- Visual shift is purely presentational; logical adjacency depends on row parity as described.
- Current usage: Logistics/transport adjacency follows these rules; worker movement remains unchanged.

### Shared Map Helpers
- **getAdjacentTiles(map, x, y)**: Returns neighboring `Tile[]` per brick-pattern adjacency.
- **isAdjacentToOcean(map, x, y)**: Returns `true` if any neighboring tile is `Coast` or `Water`. Use for port placement rules and coastal checks.