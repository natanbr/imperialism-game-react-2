# Development Roadmap

## Completed Phases ✅

### Phase 1: Core Map & UI ✅
- Static 15×15 map rendering with terrain colors
- Tile styling and resource icons
- Tile interaction (click to show info panel)
- All terrain types implemented

### Phase 2: Workers (Civilian Units) ✅
- Worker placement and selection
- Worker movement (adjacent tiles)
- Advance turn button in HUD
- Prospector actions (discover hidden resources)
- All worker types: Farmer, Rancher, Forester, Miner, Driller, Engineer
- Worker status indicators (green/yellow/red)
- Visual job completion indicators
- Worker job duration system
- Warehouse screen (popup modal)

### Phase 3: Transport Network ✅
- Turn-based resource transport to warehouse
- Brick pattern map (half-tile shift, 6 adjacent tiles)
- Depot/Port active/inactive states
- Railroad connectivity calculation (BFS algorithm)
- Railroad visualization (lines between tiles)
- Capital acts as depot (collects from adjacent tiles)
- Active depot/port validation (must connect to capital via rail)

### Phase 4: Industry ✅
- Capital screen (full-screen popup)
- Transport capacity management
- Transport capacity purchase (coal + iron cost)
- Nation cash system
- Transportation allocation modal (distribute capacity per resource)
- Gold/Gems cash conversion (100$/1000$ per unit)
- Worker job costs (100$ prospecting, 100$-5000$ structures)
- Capital view organization (Labour, Industry sections)
- Industry buildings: Trade School, Mills, Factories
- Production recipes (grain→food, cotton→fabric, etc.)
- Worker training system (untrained→trained→expert)
- Industry production integration

### Phase 5: Refactoring ✅
- Worker consolidation using factory pattern
- Tile component breakdown (hooks + sub-components)
- Design token system
- CSS modules for all major components
- CapitalModal breakdown into focused sub-components
- Removed inline styles from all major components

## Current Phase: Phase 5 - Trade & Diplomacy

### Step 5.1 – Trade Screen
**Goal**: Implement Bid & Offers screen
- [ ] Create Trade modal UI
- [ ] Implement player offer system
- [ ] Implement bidding for resources
- [ ] Add merchant marine capacity limits
- [ ] Test: Offer furniture → treasury increases

### Step 5.2 – Diplomacy Screen
**Goal**: Implement relations, treaties, grants
- [ ] Create Diplomacy modal UI
- [ ] Implement relations system (-100..+100)
- [ ] Add treaty types: trade, alliance, non-aggression, colony
- [ ] Add foreign aid system
- [ ] Test: Offer non-aggression pact → relation improves

## Phase 6: Military

### Step 6.1 – Army Units
**Goal**: Add regiments (infantry, cavalry, artillery)
- [ ] Create Armoury in Capital
- [ ] Implement regiment building (armaments + horses)
- [ ] Add regiment placement in provinces
- [ ] Test: Build regiment → appears in capital province

### Step 6.2 – Movement & Combat
**Goal**: Move armies, resolve battles
- [ ] Implement army movement between provinces
- [ ] Add strategic combat resolution (firepower, morale, entrenchment)
- [ ] Optional: Add tactical combat resolution
- [ ] Test: Attack adjacent province → battle report generated

## Phase 7: Technology

### Step 7.1 – Tech Investment
**Goal**: Add Technology screen
- [ ] Create Technology modal UI
- [ ] Implement tech investment system (cash → unlocks)
- [ ] Add tech tree unlocks (new units, workers, industry)
- [ ] Test: Buy "Feed Grasses" → Rancher becomes available

## Phase 8: Victory & Council

### Step 8.1 – Council of Governors
**Goal**: Implement victory condition
- [ ] Create council voting system (every 10 years)
- [ ] Calculate votes (each province = 1 vote)
- [ ] Nominate two leading powers
- [ ] Test: Trigger council → votes displayed

## Outstanding Tasks

### High Priority
- [ ] Two depots can't be built on adjacent tiles
- [ ] Limit goods transported by port (ship capacity)
- [ ] Worker can't start work same turn they moved
- [ ] Re-calculate railroad connections after city capture
- [ ] Military/workers consume food (strike if insufficient)

### Medium Priority
- [ ] Generate rivers on map
- [ ] Add more terrain variety
- [ ] Implement weather/seasonal effects

### Low Priority
- [ ] Add sound effects
- [ ] Add animations
- [ ] Add game settings/preferences

## Development Principles

### Each Step Should Be:
- **Atomic**: Can be assigned to single developer/AI
- **Testable**: UI or state change is visible/verifiable
- **Rule-Based**: Follows manual's game rules
- **Independent**: Can be completed without blocking others

### Testing Strategy:
- Write unit tests for all new systems
- Add integration tests for complex workflows
- Test UI interactions manually
- Maintain >80% code coverage

### Code Quality:
- Follow established patterns in ARCHITECTURE.md
- Extract constants to gameConstants.ts
- Use CSS modules + design tokens
- Keep components <150 lines
- Write pure functions for systems

## Notes
- All completed phases have been implemented and tested
- Current focus: Trade & Diplomacy systems
- Next major milestone: Military implementation
- Final milestone: Victory conditions
