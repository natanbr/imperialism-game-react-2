import { describe, it, expect } from 'vitest';
import { transportConnectivitySystem } from '@/systems/transportConnectivitySystem';
import { initializeRailroadNetworks } from '@/systems/railroadSystem';
import { GameState } from '@/types/GameState';
import { initWorld } from '@/testing/worldInit';
import { TerrainType } from '@/types/Tile';
import { Nation } from '@/types/Nation';

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
});