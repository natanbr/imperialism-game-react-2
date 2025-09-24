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
✅- Goal: Select worker and move to adjacent tile.
    - Details:
    - Click worker → highlight.
    - Click adjacent tile → worker moves there.
    - Movement rules: civilians can move unlimited distance in owned territory (manual), but for now restrict to 1 tile per test step.
    - Test: Select Prospector → move to neighbor tile → icon updates.

#### Step 2.2.1 - advance turn button
✅ - Goal: add a button that advances the turn
    - Details:
    - Button should be located in the bottom of the hud
    - When clicked it should advance the turn by one

#### Step 2.3 – Worker Actions
✅ - Goal: Implement Prospector action.
- Details:
- If tile = barren hills/mountains/swamp/desert/tundra → allow “Prospect” action.
- Action starts a search and id recurce founf itreveals the hidden resource (coal, iron, gold, gems, oil) in the next turn
- Use manual’s rule: Prospector must discover before Miner/Driller can exploit.

#### Step 2.4 – Additional Worker Types
✅ - Goal: Add Farmer, Rancher, Forester, Miner, Driller, Engineer.
- Details:
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

### Warehouse
✅ - Goal: Add warehouse screen (popup modal) showing stockpiles.
- Details:
    - add open warehouse button to the hud to open warehouse screen
    - Display all resources, materials, goods owned by the nation.

## Phase 3: Transport Network
#### 3.1 Step Update each turn from transport.
✅ - Goal: update nation resources (warehouse) each turn with the transported resources.
- Details:
    - Each turn, resources are transported along the network.
    - Resources should be added to the warehouse. 
    - resources are collected from all tiles adjusted to the capital, depot and port and the tile the deport and port is on. 

### 3.2 - Update map structure 
✅ - goal: map shuld be structured in a with briks pattern (half tile shift)
- Details:
    - add half tile shift to the map.
    - each tile has 2 adjacent tiles on top, two on each side and two bellow. 
    The tiles on top and on bottom has only half lower border shared each
    - document this information about the defenition of adjucent tiles in the repo.md file for next tasks

#### Step 3.3 – depot + port improvments
✅ - Goal: improve depot and port building (by engineer)
- Details:
    - depot and ports will have a active and inactive state
    - active depot will transport the resources from the adjacent tiles, inactive doesn't (won't increase the warehouse stockpile)
    - depot must be connected to the capital via railroad or active port 
    - railroad must be connected and pass though the land of the same nation
    - let's add small green and red flag next to the port and depot to indicate if its active or not
- Architecture guidelines:
    - the railroad connectivity will be calculated in the `runTurnPhases` as a new step between combat and production

#### Step 3.4 - Visualize railroad connection
✅ - goal: visualize railroad connection between tiles
- Details:
    - for now let's visualize railroads by drawing lines on top of tiles
    - attaching an image as an example
    - this code will get more complicate over time therfore I would like it to be contained and extracted into a railroad visualization helper. 
    - in the attached screenshot the tiles are not visible so I manual drew tiles for example. 

#### Step 3.4.1 - railroad edge case senarios
✅- capital, port, depot tiles already have railroad starting point 
- rail can be built only if the adjesent tile already has railroad 
in other workds HUD railroad button will be enabled only if the adjecent tile can be connected to current tile via railroad

TODOS:
- two depots can't be built on adjusent tiles
- limit the goods trasported by the port depending on nation ships capacity 
- worker can't start work on the same turn it was moved
- after city is captrured re-calcualte all railroad connections 

#### Step – Capital screen
✅ - goal: add the imperializem game capital screen
 - Details
    - The capital screen will be a full screen popup
    - the capital screen will contain different sections for the different productions, military etc

#### Step Capital – Transport Capacity 
- Goal: Add transport capacity limit. 
- Details:
- verify each nation has a transport capacity number
- add transport section to the capital
- Each turn, only X resources can be moved. 
- In the transport section Show slider UI to incrase the transport capacity by X (the sliding value).

- show a popup when clicking on the capacity section to distribute the transported capacity per resource

## Phase 4: Industry

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

## Technical debt
### TODOS: 
- generate rivers


✅ Summary
We now have a step‑by‑step roadmap where:
- Each step is atomic (can be assigned to an AI agent).
- Each step is testable (UI or state change visible).
- Each step follows the manual’s rules (terrain, workers, economy, diplomacy, military).
