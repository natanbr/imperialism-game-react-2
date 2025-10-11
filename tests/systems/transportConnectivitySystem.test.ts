import { describe, it, expect } from 'vitest';
import { transportConnectivitySystem } from '@/systems/transportConnectivitySystem';
import { initializeRailroadNetworks } from '@/systems/railroadSystem';
import { developmentSystem } from '@/systems/developmentSystem';
import { GameState } from '@/types/GameState';
import { initWorld } from '@/testing/worldInit';
import { TerrainType } from '@/types/Tile';
import { Nation } from '@/types/Nation';
import { createMulberry32 } from '@/systems/utils/rng';

function makeBaseState(): GameState {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  // Ensure a simple connected rail from capital to a depot
  const cap = map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
  // Capital must be marked connected to be included in the rail graph
  map.tiles[cap.y][cap.x] = { ...cap, connected: true, ownerNationId: 'nation-1' };
  const adj = map.tiles[cap.y][Math.min(cap.x + 1, map.config.cols - 1)];
  map.tiles[adj.y][adj.x] = { ...adj, connected: true, depot: true, ownerNationId: 'nation-1' };

  // Set industry on each nation
  const nationsWithIndustry = nations.map(n => ({
    ...n,
  }));

  let state: GameState = {
    turn: 1,
    year: 1900,
    activeNationId: 'nation-1',
    nations: nationsWithIndustry,
    cities: [], armies: [], fleets: [],
    relations: [], treaties: [], tradePolicies: [], grants: [],
    map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t, ownerNationId: t.ownerNationId ?? 'nation-1' }))) },
    transportNetwork: { shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    technologyState: { researching: {}, advances: {} },
    newsLog: [],
    turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
    difficulty: 'normal',
  };

  const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
  state.transportNetwork.railroadNetworks = railroadNetworks;

  return state;
}

describe('transportConnectivitySystem', () => {
  it('activates depot connected to the capital via rail', () => {
    const s1 = makeBaseState();
    const cap = s1.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
    const depotTile = s1.map.tiles[cap.y][Math.min(cap.x + 1, s1.map.config.cols - 1)];

    const s2 = transportConnectivitySystem(s1);
    const nationNetwork = s2.transportNetwork.railroadNetworks!['nation-1'];
    const depotNode = nationNetwork.depots.find(d => d.x === depotTile.x && d.y === depotTile.y);

    expect(depotNode?.isActive).toBe(true);
  });

  it('activates depot at end of multi-segment railroad (capital 0,0 -> rail 1,0 -> depot 1,1)', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });

    // Set up capital at (0,0)
    map.tiles[0][0] = {
      ...map.tiles[0][0],
      terrain: TerrainType.Capital,
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up rail at (1,0)
    map.tiles[0][1] = {
      ...map.tiles[0][1],
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up rail and depot at (1,1)
    map.tiles[1][1] = {
      ...map.tiles[1][1],
      connected: true,
      depot: true,
      ownerNationId: 'nation-1'
    };

    const nationsWithIndustry = nations.map(n => ({ ...n }));

    let state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: 'nation-1',
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t, ownerNationId: t.ownerNationId ?? 'nation-1' }))) },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { researching: {}, advances: {} },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    // Run connectivity system
    const resultState = transportConnectivitySystem(state);
    const network = resultState.transportNetwork.railroadNetworks!['nation-1'];

    // Verify depot at (1,1) is active
    const depotNode = network.depots.find(d => d.x === 1 && d.y === 1);
    expect(depotNode).toBeDefined();
    expect(depotNode?.isActive).toBe(true);

    // Verify network graph includes all nodes
    expect(network.graph['0,0']).toBeDefined(); // Capital
    expect(network.graph['1,0']).toBeDefined(); // Rail
    expect(network.graph['1,1']).toBeDefined(); // Depot

    // Verify connections
    expect(network.graph['0,0']).toContainEqual({ x: 1, y: 0 }); // Capital connects to rail
    expect(network.graph['1,0']).toContainEqual({ x: 1, y: 1 }); // Rail connects to depot
  });

  it('integrates depot construction with development system and activates it', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });

    // Set up capital at (0,0)
    map.tiles[0][0] = {
      ...map.tiles[0][0],
      terrain: TerrainType.Capital,
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up rail at (1,0)
    map.tiles[0][1] = {
      ...map.tiles[0][1],
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up tile at (1,1) with rail and a depot construction job that completes this turn
    map.tiles[1][1] = {
      ...map.tiles[1][1],
      connected: true,
      ownerNationId: 'nation-1',
      constructionJob: {
        workerId: 'engineer-1',
        kind: 'depot',
        startedOnTurn: 0,
        durationTurns: 1,
        completed: false
      }
    };

    const nationsWithIndustry = nations.map(n => ({ ...n }));

    let state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: 'nation-1',
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t, ownerNationId: t.ownerNationId ?? 'nation-1' }))) },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { researching: {}, advances: {} },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    // Run development system to complete the depot construction
    const rng = createMulberry32(12345);
    const afterDevelopment = developmentSystem(state, rng);

    // Verify depot was built on tile
    expect(afterDevelopment.map.tiles[1][1].depot).toBe(true);

    // Verify depot was added to the network
    const networkAfterDev = afterDevelopment.transportNetwork.railroadNetworks!['nation-1'];
    const depotNodeAfterDev = networkAfterDev.depots.find(d => d.x === 1 && d.y === 1);
    expect(depotNodeAfterDev).toBeDefined();

    // Verify depot is in the graph
    expect(networkAfterDev.graph['1,1']).toBeDefined();

    // Run connectivity system to activate the depot
    const afterConnectivity = transportConnectivitySystem(afterDevelopment);
    const networkAfterConnectivity = afterConnectivity.transportNetwork.railroadNetworks!['nation-1'];
    const depotNodeAfterConnectivity = networkAfterConnectivity.depots.find(d => d.x === 1 && d.y === 1);

    // Verify depot is now active
    expect(depotNodeAfterConnectivity?.isActive).toBe(true);
  });

  it('activates port when connected to capital via rail and adjacent to ocean', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });

    // Set up capital at (0,0)
    map.tiles[0][0] = {
      ...map.tiles[0][0],
      terrain: TerrainType.Capital,
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up rail at (1,0)
    map.tiles[0][1] = {
      ...map.tiles[0][1],
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up port at (2,0) adjacent to water at (2,1)
    map.tiles[0][2] = {
      ...map.tiles[0][2],
      connected: true,
      port: true,
      ownerNationId: 'nation-1'
    };

    // Set up water tile adjacent to port
    map.tiles[1][2] = {
      ...map.tiles[1][2],
      terrain: TerrainType.Water,
      ownerNationId: null
    };

    const nationsWithIndustry = nations.map(n => ({ ...n }));

    let state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: 'nation-1',
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t }))) },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { researching: {}, advances: {} },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    // Run connectivity system
    const resultState = transportConnectivitySystem(state);
    const network = resultState.transportNetwork.railroadNetworks!['nation-1'];

    // Verify port at (2,0) is active
    const portNode = network.ports.find(p => p.x === 2 && p.y === 0);
    expect(portNode).toBeDefined();
    expect(portNode?.isActive).toBe(true);
  });

  it('keeps port inactive when not adjacent to ocean', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });

    // Set up capital at (0,0)
    map.tiles[0][0] = {
      ...map.tiles[0][0],
      terrain: TerrainType.Capital,
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up rail at (1,0)
    map.tiles[0][1] = {
      ...map.tiles[0][1],
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up port at (2,0) NOT adjacent to water (surrounded by land)
    map.tiles[0][2] = {
      ...map.tiles[0][2],
      connected: true,
      port: true,
      ownerNationId: 'nation-1'
    };

    const nationsWithIndustry = nations.map(n => ({ ...n }));

    let state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: 'nation-1',
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t, ownerNationId: t.ownerNationId ?? 'nation-1' }))) },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { researching: {}, advances: {} },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    // Run connectivity system
    const resultState = transportConnectivitySystem(state);
    const network = resultState.transportNetwork.railroadNetworks!['nation-1'];

    // Verify port at (2,0) is inactive (not adjacent to ocean)
    const portNode = network.ports.find(p => p.x === 2 && p.y === 0);
    expect(portNode).toBeDefined();
    expect(portNode?.isActive).toBe(false);
  });

  it('handles multiple depots with mixed connectivity correctly', () => {
    const { map, nations } = initWorld({ cols: 6, rows: 6 });

    // Set up capital at (0,0)
    map.tiles[0][0] = {
      ...map.tiles[0][0],
      terrain: TerrainType.Capital,
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up connected rail path: (0,0) -> (1,0) -> (2,0)
    map.tiles[0][1] = {
      ...map.tiles[0][1],
      connected: true,
      ownerNationId: 'nation-1'
    };

    map.tiles[0][2] = {
      ...map.tiles[0][2],
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Connected depot at (2,1)
    map.tiles[1][2] = {
      ...map.tiles[1][2],
      connected: true,
      depot: true,
      ownerNationId: 'nation-1'
    };

    // Connected depot at (3,0)
    map.tiles[0][3] = {
      ...map.tiles[0][3],
      connected: true,
      depot: true,
      ownerNationId: 'nation-1'
    };

    // Disconnected depot at (4,4) - no rail connection to capital
    map.tiles[4][4] = {
      ...map.tiles[4][4],
      depot: true,
      ownerNationId: 'nation-1'
    };

    const nationsWithIndustry = nations.map(n => ({ ...n }));

    let state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: 'nation-1',
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t, ownerNationId: t.ownerNationId ?? 'nation-1' }))) },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { researching: {}, advances: {} },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    // Run connectivity system
    const resultState = transportConnectivitySystem(state);
    const network = resultState.transportNetwork.railroadNetworks!['nation-1'];

    // Verify connected depots are active
    const depot1 = network.depots.find(d => d.x === 2 && d.y === 1);
    expect(depot1?.isActive).toBe(true);

    const depot2 = network.depots.find(d => d.x === 3 && d.y === 0);
    expect(depot2?.isActive).toBe(true);

    // Verify disconnected depot is inactive
    const depot3 = network.depots.find(d => d.x === 4 && d.y === 4);
    expect(depot3?.isActive).toBe(false);
  });

  it('keeps depot inactive when not connected to railroad network', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });

    // Set up capital at (0,0)
    map.tiles[0][0] = {
      ...map.tiles[0][0],
      terrain: TerrainType.Capital,
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up isolated depot at (3,3) with no rail connection
    map.tiles[3][3] = {
      ...map.tiles[3][3],
      depot: true,
      ownerNationId: 'nation-1'
    };

    const nationsWithIndustry = nations.map(n => ({ ...n }));

    let state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: 'nation-1',
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t, ownerNationId: t.ownerNationId ?? 'nation-1' }))) },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { researching: {}, advances: {} },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    // Run connectivity system
    const resultState = transportConnectivitySystem(state);
    const network = resultState.transportNetwork.railroadNetworks!['nation-1'];

    // Verify isolated depot is inactive
    const depotNode = network.depots.find(d => d.x === 3 && d.y === 3);
    expect(depotNode?.isActive).toBe(false);
  });

  it('handles simultaneous railroad and depot construction completing in same turn', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });

    // Set up capital at (0,0)
    map.tiles[0][0] = {
      ...map.tiles[0][0],
      terrain: TerrainType.Capital,
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Railroad construction completing at (1,0)
    map.tiles[0][1] = {
      ...map.tiles[0][1],
      ownerNationId: 'nation-1',
      constructionJob: {
        workerId: 'engineer-1',
        kind: 'rail',
        startedOnTurn: 0,
        durationTurns: 1,
        completed: false
      }
    };

    // Depot construction completing at (1,1) - will be adjacent to the new rail at (1,0)
    map.tiles[1][1] = {
      ...map.tiles[1][1],
      ownerNationId: 'nation-1',
      constructionJob: {
        workerId: 'engineer-2',
        kind: 'depot',
        startedOnTurn: 0,
        durationTurns: 1,
        completed: false
      }
    };

    // Pre-existing rail at (1,2) to connect depot to railroad
    map.tiles[2][1] = {
      ...map.tiles[2][1],
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Pre-existing rail connecting back to capital path
    map.tiles[1][0] = {
      ...map.tiles[1][0],
      connected: true,
      ownerNationId: 'nation-1'
    };

    const nationsWithIndustry = nations.map(n => ({ ...n }));

    let state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: 'nation-1',
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t, ownerNationId: t.ownerNationId ?? 'nation-1' }))) },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { researching: {}, advances: {} },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    // Run development system to complete both constructions
    const rng = createMulberry32(12345);
    const afterDevelopment = developmentSystem(state, rng);

    // Verify both constructions completed
    expect(afterDevelopment.map.tiles[0][1].connected).toBe(true); // Rail built
    expect(afterDevelopment.map.tiles[1][1].depot).toBe(true); // Depot built

    // Run connectivity system
    const afterConnectivity = transportConnectivitySystem(afterDevelopment);
    const network = afterConnectivity.transportNetwork.railroadNetworks!['nation-1'];

    // Verify depot is activated (connected through the newly built rail and existing network)
    const depotNode = network.depots.find(d => d.x === 1 && d.y === 1);
    expect(depotNode).toBeDefined();
    expect(depotNode?.isActive).toBe(true);
  });

  it('integrates port construction with development system and activates it when adjacent to ocean', () => {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });

    // Set up capital at (0,0)
    map.tiles[0][0] = {
      ...map.tiles[0][0],
      terrain: TerrainType.Capital,
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Set up rail at (1,0)
    map.tiles[0][1] = {
      ...map.tiles[0][1],
      connected: true,
      ownerNationId: 'nation-1'
    };

    // Port construction job at (2,0)
    map.tiles[0][2] = {
      ...map.tiles[0][2],
      connected: true,
      ownerNationId: 'nation-1',
      constructionJob: {
        workerId: 'engineer-1',
        kind: 'port',
        startedOnTurn: 0,
        durationTurns: 1,
        completed: false
      }
    };

    // Ocean tile adjacent to port
    map.tiles[1][2] = {
      ...map.tiles[1][2],
      terrain: TerrainType.Water,
      ownerNationId: null
    };

    const nationsWithIndustry = nations.map(n => ({ ...n }));

    let state: GameState = {
      turn: 1,
      year: 1900,
      activeNationId: 'nation-1',
      nations: nationsWithIndustry,
      cities: [], armies: [], fleets: [],
      relations: [], treaties: [], tradePolicies: [], grants: [],
      map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t }))) },
      transportNetwork: { shippingLanes: [], capacity: 0 },
      tradeRoutes: [],
      technologyState: { researching: {}, advances: {} },
      newsLog: [],
      turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
      difficulty: 'normal',
    };

    const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
    state.transportNetwork.railroadNetworks = railroadNetworks;

    // Run development system
    const rng = createMulberry32(12345);
    const afterDevelopment = developmentSystem(state, rng);

    // Verify port was built
    expect(afterDevelopment.map.tiles[0][2].port).toBe(true);

    // Verify port was added to network
    const networkAfterDev = afterDevelopment.transportNetwork.railroadNetworks!['nation-1'];
    const portNodeAfterDev = networkAfterDev.ports.find(p => p.x === 2 && p.y === 0);
    expect(portNodeAfterDev).toBeDefined();

    // Run connectivity system
    const afterConnectivity = transportConnectivitySystem(afterDevelopment);
    const networkAfterConnectivity = afterConnectivity.transportNetwork.railroadNetworks!['nation-1'];
    const portNodeAfterConnectivity = networkAfterConnectivity.ports.find(p => p.x === 2 && p.y === 0);

    // Verify port is active (connected to capital and adjacent to ocean)
    expect(portNodeAfterConnectivity?.isActive).toBe(true);
  });
});