import { describe, it, expect } from 'vitest';
import { transportConnectivitySystem } from '@/systems/transportConnectivitySystem';
import { GameState } from '@/types/GameState';
import { initWorld } from '@/testing/worldInit';
import { TerrainType } from '@/types/Tile';

function makeBaseState(): GameState {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  // Ensure a simple connected rail from capital to a depot
  const cap = map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
  // Capital must be marked connected to be included in the rail graph
  map.tiles[cap.y][cap.x] = { ...cap, connected: true };
  const adj = map.tiles[cap.y][Math.min(cap.x + 1, map.config.cols - 1)];
  map.tiles[adj.y][adj.x] = { ...adj, connected: true, depot: true };

  // Set industry on each nation
  const nationsWithIndustry = nations.map(n => ({
    ...n,
  }));

  return {
    turn: 1,
    year: 1900,
    activeNationId: 'nation-1',
    nations: nationsWithIndustry,
    cities: [], armies: [], fleets: [],
    relations: [], treaties: [], tradePolicies: [], grants: [],
    map: { ...map, tiles: map.tiles.map(r => r.map(t => ({ ...t, ownerNationId: t.ownerNationId ?? 'nation-1' }))) },
    transportNetwork: { railroads: [], shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    technologyState: { technologies: [], oilDrillingTechUnlocked: false },
    newsLog: [],
    turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
    difficulty: 'normal',
  };
}

describe('transportConnectivitySystem', () => {
  it('activates depot connected to the capital via rail', () => {
    const s1 = makeBaseState();
    const cap = s1.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
    const depotTile = s1.map.tiles[cap.y][Math.min(cap.x + 1, s1.map.config.cols - 1)];

    const s2 = transportConnectivitySystem(s1);
    const t2 = s2.map.tiles[depotTile.y][depotTile.x];
    expect(t2.depot).toBe(true);
    expect(t2.activeDepot).toBe(true);
  });
});