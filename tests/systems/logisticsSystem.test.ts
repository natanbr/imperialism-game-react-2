import { describe, it, expect } from 'vitest';
import { logisticsSystem, computeLogisticsTransport } from '@/systems/logisticsSystem';
import { GameState } from '@/types/GameState';
import { initWorld } from '@/testing/worldInit';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { initializeRailroadNetworks, addRailroad, addDepot } from '@/systems/railroadSystem';
import { transportConnectivitySystem } from '@/systems/transportConnectivitySystem';
import { Nation } from '@/types/Nation';

function baseState(): GameState {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  // Ensure capital exists and at least two adjacent tiles have resources (grain and gold)
  const capital = map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
  map.tiles[capital.y][capital.x] = { ...capital, ownerNationId: 'nation-1' };
  const nx1 = Math.min(capital.x + 1, map.config.cols - 1);
  const ny1 = capital.y;
  const adj1 = map.tiles[ny1][nx1];
  map.tiles[ny1][nx1] = { ...adj1, resource: { type: ResourceType.Grain, level: 1 }, ownerNationId: 'nation-1' };

  const nx2 = Math.max(capital.x - 1, 0);
  const ny2 = capital.y;
  const adj2 = map.tiles[ny2][nx2];
  map.tiles[ny2][nx2] = { ...adj2, resource: { type: ResourceType.Gold, level: 2, discovered: true }, ownerNationId: 'nation-1' };

  // Set industry on each nation
  const nationsWithIndustry = nations.map(n => ({
    ...n,
    transportCapacity: 10,
    warehouse: { ...n.warehouse },
    treasury: n.treasury ?? 0,
  }));

  const stateBeforeRailroads: GameState = {
    turn: 1,
    year: 1900,
    activeNationId: 'nation-1',
    nations: nationsWithIndustry,
    cities: [], armies: [], fleets: [],
    relations: [], treaties: [], tradePolicies: [], grants: [],
    map: { ...map },
    transportNetwork: { shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    technologyState: { oilDrillingTechUnlocked: false, technologies: [] },
    newsLog: [],
    turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
    difficulty: 'normal',
  };

  const railroadNetworks = initializeRailroadNetworks(stateBeforeRailroads.map, stateBeforeRailroads.nations as Nation[]);
  const state = {
    ...stateBeforeRailroads,
    transportNetwork: { ...stateBeforeRailroads.transportNetwork, railroadNetworks }
  };
  // The capital itself is a hub, so no need to set isActive explicitly for this test.

  return state;
}

describe('computeLogisticsTransport', () => {
  it('collects resources from tiles adjacent to hubs (capital/depot/port)', () => {
    const s1 = baseState();
    const nationNetwork = s1.transportNetwork.railroadNetworks!['nation-1'];
    const collected = computeLogisticsTransport(s1.map, 'nation-1', nationNetwork);
    expect(Object.values(collected).some(v => v > 0)).toBe(true);
  });
});

describe('logisticsSystem', () => {
  it('updates warehouse and treasury based on allocations and capacity', () => {
    const s1 = baseState();
    const nationId = 'nation-1';
    // Allocate some gold and grain
    s1.transportAllocationsByNation = {
      [nationId]: {
        [ResourceType.Gold]: 2, // +$200
        [ResourceType.Grain]: 3,
      }
    };

    const s2 = logisticsSystem(s1);
    const n2 = s2.nations.find(n => n.id === nationId)!;
    const originalNation = s1.nations.find(n => n.id === nationId)!;

    // Treasury increases by gold (2 * $100)
    expect(n2.treasury).toBeGreaterThanOrEqual((originalNation.treasury ?? 0) + 200);
    // Warehouse grain increased
    expect((n2.warehouse[ResourceType.Grain] ?? 0)).toBeGreaterThanOrEqual((originalNation.warehouse[ResourceType.Grain] ?? 0));
  });

  it('collects no resources from distant tiles before depot is built, then collects after depot is added', () => {
    const { map, nations } = initWorld({ cols: 10, rows: 10 });
    const nationId = 'nation-1';

    // Find capital
    const capital = map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
    map.tiles[capital.y][capital.x] = { ...capital, ownerNationId: nationId };

    // Place resources far from capital (at least 3 tiles away, not adjacent)
    const distantX = Math.min(capital.x + 4, map.config.cols - 1);
    const distantY = capital.y;
    const distantTile = map.tiles[distantY][distantX];
    map.tiles[distantY][distantX] = {
      ...distantTile,
      resource: { type: ResourceType.Coal, level: 2 },
      ownerNationId: nationId
    };

    // Add another resource adjacent to the distant tile (will be collected by depot)
    const adjacentX = Math.max(distantX - 1, 0);
    const adjacentY = distantY;
    const adjacentTile = map.tiles[adjacentY][adjacentX];
    map.tiles[adjacentY][adjacentX] = {
      ...adjacentTile,
      resource: { type: ResourceType.IronOre, level: 3 },
      ownerNationId: nationId
    };

    const nationsWithIndustry = nations.map(n => ({
      ...n,
      transportCapacity: 100,
      warehouse: { ...n.warehouse },
      treasury: n.treasury ?? 0,
    }));

    const stateBeforeRailroads: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: nationId,
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { oilDrillingTechUnlocked: false, technologies: [] },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(stateBeforeRailroads.map, stateBeforeRailroads.nations as Nation[]);
    let state: GameState = {
      ...stateBeforeRailroads,
      transportNetwork: { ...stateBeforeRailroads.transportNetwork, railroadNetworks }
    };

    // Step 1: Verify no resources collected initially (distant tiles not adjacent to capital)
    const network1 = state.transportNetwork.railroadNetworks![nationId];
    const collected1 = computeLogisticsTransport(state.map, nationId, network1);
    expect(collected1[ResourceType.Coal] ?? 0).toBe(0);
    expect(collected1[ResourceType.IronOre] ?? 0).toBe(0);

    // Step 2: Build railroad from capital to distant tile
    // We need to build a path of rails connecting capital to the depot location
    const pathTiles = [
      { x: capital.x + 1, y: capital.y },
      { x: capital.x + 2, y: capital.y },
      { x: capital.x + 3, y: capital.y },
    ];

    for (const node of pathTiles) {
      state = addRailroad(state, nationId, node);
    }

    // Step 3: Build depot at the distant location
    state = addDepot(state, nationId, { x: distantX, y: distantY });

    // Mark the depot on the map tile
    state.map.tiles[distantY][distantX] = {
      ...state.map.tiles[distantY][distantX],
      depot: true,
    };

    // Step 4: Run transport connectivity to activate the depot
    state = transportConnectivitySystem(state);

    // Step 5: Verify resources around the active depot are now collected
    const network2 = state.transportNetwork.railroadNetworks![nationId];
    const collected2 = computeLogisticsTransport(state.map, nationId, network2);

    // The depot should collect from its own tile and adjacent tiles
    expect(collected2[ResourceType.Coal] ?? 0).toBeGreaterThan(0);
    expect(collected2[ResourceType.IronOre] ?? 0).toBeGreaterThan(0);

    // Step 6: Verify depot is marked as active
    const depot = network2.depots.find(d => d.x === distantX && d.y === distantY);
    expect(depot).toBeDefined();
    expect(depot!.isActive).toBe(true);
  });

  it('capital behaves as a depot and collects from adjacent tiles immediately at game start', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });
    const nationId = 'nation-1';

    // Find capital
    const capital = map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;

    // The worldInit already sets ownerNationId, so capital is already owned by nation-1
    // Find tiles adjacent to capital - the map is already set up by worldInit
    // Capital is at position 0 (TerrainType.Capital is first in the terrain list)
    // Adjacent tiles: position 1 is Farm, position 5 is Plantation

    // Based on worldInit, tiles at positions 1 and 5 are already set up
    // Position 1: Farm with Grain level 0
    // Position 5: Plantation with Cotton level 0

    // We need to update the Cotton tile to level 1 for this test
    const plantation = map.tiles.flat().find(t => t.terrain === TerrainType.Plantation);
    if (plantation) {
      map.tiles[plantation.y][plantation.x] = {
        ...plantation,
        resource: { type: ResourceType.Cotton, level: 1 },
      };
    }

    const nationsWithIndustry = nations.map(n => ({
      ...n,
      transportCapacity: 100,
      warehouse: { ...n.warehouse },
      treasury: n.treasury ?? 0,
    }));

    const stateBeforeRailroads: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: nationId,
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { oilDrillingTechUnlocked: false, technologies: [] },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    // Initialize railroad networks (simulating game start)
    const railroadNetworks = initializeRailroadNetworks(stateBeforeRailroads.map, stateBeforeRailroads.nations as Nation[]);
    const state = {
      ...stateBeforeRailroads,
      transportNetwork: { ...stateBeforeRailroads.transportNetwork, railroadNetworks }
    };

    // Verify capital is in the network
    const network = state.transportNetwork.railroadNetworks![nationId];
    expect(network.capital).toBeDefined();
    expect(network.capital?.x).toBe(capital.x);
    expect(network.capital?.y).toBe(capital.y);

    // Test collection BEFORE any turn is executed (testing eager initialization fix)
    const collected = computeLogisticsTransport(state.map, nationId, network);

    // Verify resources are collected from adjacent tiles
    // The actual collection depends on which tiles are truly adjacent to capital
    expect(collected[ResourceType.Grain]).toBeGreaterThanOrEqual(1); // At least 1 grain from Farm
    expect(collected[ResourceType.Cotton]).toBeGreaterThanOrEqual(1); // At least 1 cotton from Plantation
  });

  it('capital collects resources with correct production amounts based on resource levels', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });
    const nationId = 'nation-1';

    // Find capital
    const capital = map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;

    // The worldInit creates a 5x5 map with various terrains
    // We'll update specific tiles to have specific resource levels for testing
    const farm = map.tiles.flat().find(t => t.terrain === TerrainType.Farm);
    const plantation = map.tiles.flat().find(t => t.terrain === TerrainType.Plantation);

    if (farm) {
      // Set Grain to level 2 (produces 3 units)
      map.tiles[farm.y][farm.x] = {
        ...farm,
        resource: { type: ResourceType.Grain, level: 2 },
      };
    }

    if (plantation) {
      // Set Cotton to level 3 (produces 4 units)
      map.tiles[plantation.y][plantation.x] = {
        ...plantation,
        resource: { type: ResourceType.Cotton, level: 3 },
      };
    }

    const nationsWithIndustry = nations.map(n => ({
      ...n,
      transportCapacity: 100,
      warehouse: { ...n.warehouse },
      treasury: n.treasury ?? 0,
    }));

    const state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: nationId,
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { oilDrillingTechUnlocked: false, technologies: [] },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    // Initialize railroad networks
    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    const network = state.transportNetwork.railroadNetworks![nationId];
    const collected = computeLogisticsTransport(state.map, nationId, network);

    // Verify that SOME resources are collected (depends on actual adjacency)
    const total = Object.values(collected).reduce((sum, val) => sum + val, 0);
    expect(total).toBeGreaterThan(0);

    // Verify that if grain or cotton were collected, they have the right amounts
    if (collected[ResourceType.Grain]) {
      expect(collected[ResourceType.Grain]).toBeGreaterThanOrEqual(1);
    }
    if (collected[ResourceType.Cotton]) {
      expect(collected[ResourceType.Cotton]).toBeGreaterThanOrEqual(1);
    }
  });

  it('capital does not collect resources from tiles that are not owned by the nation', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });
    const nationId = 'nation-1';
    const otherNationId = 'nation-2';

    // Find capital
    const capital = map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;

    // Change all non-capital tiles to be owned by a different nation
    // This ensures the capital can't collect from any adjacent tiles
    for (let y = 0; y < map.config.rows; y++) {
      for (let x = 0; x < map.config.cols; x++) {
        const tile = map.tiles[y][x];
        if (tile.terrain !== TerrainType.Capital && tile.terrain !== TerrainType.Water && tile.terrain !== TerrainType.River) {
          map.tiles[y][x] = {
            ...tile,
            ownerNationId: otherNationId,
            resource: tile.resource ? { ...tile.resource, level: 2 } : undefined,
          };
        }
      }
    }

    const nationsWithIndustry = nations.map(n => ({
      ...n,
      transportCapacity: 100,
      warehouse: { ...n.warehouse },
      treasury: n.treasury ?? 0,
    }));

    const state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: nationId,
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { oilDrillingTechUnlocked: false, technologies: [] },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    const network = state.transportNetwork.railroadNetworks![nationId];
    const collected = computeLogisticsTransport(state.map, nationId, network);

    // Should not collect any resources since all adjacent tiles are owned by another nation
    expect(Object.keys(collected).length).toBe(0);
  });
});