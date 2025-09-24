# Development Roadmap (Detailed, Testable Steps)

## Phase 1: Core Map & UI
#### Step 1.1 – Static Map Rendering
✅- Goal: Render a fixed 15×15 grid of tiles (not random).
- Details for agent:
    - Each tile is a React component.
    - Props for each tile is: Tile.
    - Props for the map is: Map.
    - Display text: "Plains | River: Yes | Resource: Grain (L1)".
    - Use mock data covering all terrain types from the manual (plains, hills, mountains, forest, swamp, desert, tundra, coast, river, town, capital).
    - Test: Load the page → see a 15×15 grid with correct text labels.

#### Step 1.2 – Tile Styling
✅- Goal: Replace text with simple colored backgrounds + overlay text.
    - Details:
    - Assign colors per terrain (e.g., green = forest, brown = hills, blue = water).
    - Overlay resource icons (placeholder emojis or SVGs).
    - Test: Visual scan → each terrain type is distinguishable.

#### Step 1.3 – Tile Interaction
✅- Goal: Click a tile to open an info panel.
- Details:
- Info panel shows: terrain, resource, owner nation, workers present.
- Highlight selected tile.
- Test: Click any tile → info panel updates correctly.

## Phase 2: Workers (Civilian Units)
#### Step 2.1 – Worker Placement
✅- Goal: Place a worker (Prospector) on a tile.
    - Details:
    - Worker = small icon overlay on tile.
    - Initial game state: 1 Prospector at capital tile.
    - Test: Worker appears on map at start.

#### Step 2.2 – Worker Selection & Movement
<<<<<<< HEAD
- Goal: Select worker and move to adjacent tile.
=======
<<<<<<< HEAD
- Goal: Select worker and move to adjacent tile.
=======
<<<<<<< HEAD
- Goal: Select worker and move to adjacent tile.
=======
✅- Goal: Select worker and move to adjacent tile.
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
    - Details:
    - Click worker → highlight.
    - Click adjacent tile → worker moves there.
    - Movement rules: civilians can move unlimited distance in owned territory (manual), but for now restrict to 1 tile per test step.
    - Test: Select Prospector → move to neighbor tile → icon updates.

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
#### Step 2.3 – Worker Actions
- Goal: Implement Prospector action.
- Details:
- If tile = barren hills/mountains/swamp/desert/tundra → allow “Prospect” action.
- Action reveals hidden resource (coal, iron, gold, gems, oil).
- Use manual’s rule: Prospector must discover before Miner/Driller can exploit.
- Test: Move Prospector to barren hill → click “Prospect” → resource revealed.

#### Step 2.4 – Additional Worker Types
- Goal: Add Farmer, Rancher, Forester, Miner, Driller, Engineer.
- Details:
- Each worker has valid terrain + action:
- Farmer → farms/orchards/plantations.
- Rancher → open range/fertile hills.
- Forester → hardwood forest.
- Miner → barren hills/mountains (after prospecting).
- Driller → swamp/desert/tundra (after prospecting + oil tech).
- Engineer → build depot, port, fort, rail.
- Each action improves resource level (per Resource Development Table).
- Test: Place each worker → perform valid action → tile’s resource level increases.
=======
#### Step 2.2.1 - advance turn button
✅ - Goal: add a button that advances the turn
    - Details:
    - Button should be located in the bottom of the hud
    - When clicked it should advance the turn by one

>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
#### Step 2.3 – Worker Actions
- Goal: Implement Prospector action.
- Details:
- If tile = barren hills/mountains/swamp/desert/tundra → allow “Prospect” action.
- Action reveals hidden resource (coal, iron, gold, gems, oil).
- Use manual’s rule: Prospector must discover before Miner/Driller can exploit.
- Test: Move Prospector to barren hill → click “Prospect” → resource revealed.

#### Step 2.4 – Additional Worker Types
- Goal: Add Farmer, Rancher, Forester, Miner, Driller, Engineer.
- Details:
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
- Each worker has valid terrain + action:
- Farmer → farms/orchards/plantations.
- Rancher → open range/fertile hills.
- Forester → hardwood forest.
- Miner → barren hills/mountains (after prospecting).
- Driller → swamp/desert/tundra (after prospecting + oil tech).
- Engineer → build depot, port, fort, rail.
- Each action improves resource level (per Resource Development Table).
- Test: Place each worker → perform valid action → tile’s resource level increases.
<<<<<<< HEAD
=======
=======
    - Each worker has valid terrain + action:
    - same as prospector, after workers they will it will take them few turns to do their job
    - add visual indicator when worker finished thier job 
    - add table for the duration of each worker to comple their job
    - Farmer → farms/orchards/plantations.
    - Rancher → open range/fertile hills.
    - Forester → hardwood forest.
    - Miner → barren hills/mountains (after prospecting).
    - Driller → swamp/desert/tundra (after prospecting + oil tech).
    - Engineer → build depot, port, fort, rail.
    - Each action improves resource level (per Resource Development Table).
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)

## Phase 3: Transport Network
#### Step 3.1 – Capital Auto-Connection
- Goal: Capital tile acts as depot + port.
- Details:
- Any adjacent improved tile auto‑connected to capital.
<<<<<<< HEAD
- Test: Improve farm next to capital → resource appears in warehouse.
=======
<<<<<<< HEAD
- Test: Improve farm next to capital → resource appears in warehouse.
=======
<<<<<<< HEAD
- Test: Improve farm next to capital → resource appears in warehouse.
=======
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)

#### Step 3.2 – Engineer Builds Depot
- Goal: Engineer can build depot on a tile.
- Details:
- Depot connects adjacent improved tiles to network.
- Show depot icon.
- Test: Build depot near farm → farm’s output flows to warehouse.

#### Step 3.3 – Transport Capacity
- Goal: Add transport capacity limit.
- Details:
- Each turn, only X resources can be moved.
- Show slider UI (like manual’s Transport screen).
- Test: If capacity < production, some resources remain untransported.

## Phase 4: Industry
#### Step 4.1 – Warehouse
- Goal: Add warehouse screen showing stockpiles.
- Details:
- Display all resources, materials, goods.
- Update each turn from transport.
- Test: Improve farm → grain appears in warehouse.

#### Step 4.2 – Industry Buildings
- Goal: Add Textile Mill, Lumber Mill, Steel Mill, Food Processing.
- Details:
- Implement recipes (2 cotton → 1 fabric, etc.).
- Require labour + inputs.
- Test: Transport cotton → produce fabric.

#### Step 4.3 – Labour & Training
- Goal: Add untrained/trained/expert workers.
- Details:
- Each worker = 1/2/4 labour.
- Training consumes paper + cash.
- Test: Train worker → labour pool updates.

## Phase 5: Trade & Diplomacy
#### Step 5.1 – Trade Screen
- Goal: Implement Bid & Offers screen.
- Details:
- Player can offer goods, bid for resources.
- Merchant marine capacity limits trades.
- Test: Offer furniture → treasury increases.

#### Step 5.2 – Diplomacy Screen
- Goal: Implement relations, treaties, grants.
- Details:
- Relations = -100..+100.
- Treaties: trade, alliance, non‑aggression, colony.
- Test: Offer non‑aggression pact → relation improves.

## Phase 6: Military
#### Step 6.1 – Army Units
- Goal: Add regiments (infantry, cavalry, artillery).
- Details:
- Build in Armoury using armaments + horses.
- Place in provinces.
- Test: Build regiment → appears in capital province.

#### Step 6.2 – Movement & Combat
- Goal: Move armies between provinces, resolve battles.
- Details:
- Strategic resolution: compare firepower, morale, entrenchment.
- Tactical resolution: optional later.
- Test: Attack adjacent province → battle report generated.

## Phase 7: Technology
#### Step 7.1 – Tech Investment
- Goal: Add Technology screen.
- Details:
- Player invests cash → unlocks new units, workers, industry.
- Test: Buy “Feed Grasses” → Rancher becomes available.

## Phase 8: Victory & Council
#### Step 8.1 – Council of Governors
- Goal: Every 10 years, council votes.
- Details:
- Each province = 1 vote.
- Two leading powers nominated.
- Test: Trigger council → votes displayed.

✅ Summary
We now have a step‑by‑step roadmap where:
- Each step is atomic (can be assigned to an AI agent).
- Each step is testable (UI or state change visible).
- Each step follows the manual’s rules (terrain, workers, economy, diplomacy, military).
