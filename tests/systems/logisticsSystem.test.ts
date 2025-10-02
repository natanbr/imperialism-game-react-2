import { describe, it, expect } from 'vitest';
import { logisticsSystem, computeLogisticsTransport } from '@/systems/logisticsSystem';
import { GameState } from '@/types/GameState';
import { initWorld } from '@/testing/worldInit';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { initializeRailroadNetworks } from '@/systems/railroadSystem';
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
  
  let state: GameState = {
    turn: 1,
    year: 1900,
    activeNationId: 'nation-1',
    nations: nationsWithIndustry,
    cities: [], armies: [], fleets: [],
    relations: [], treaties: [], tradePolicies: [], grants: [],
    map: { ...map },
    transportNetwork: { shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    technologyState: { researching: {}, advances: {} },
    newsLog: [],
    turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
    difficulty: 'normal',
  };

  const railroadNetworks = initializeRailroadNetworks(state.map, state.nations as Nation[]);
  state.transportNetwork.railroadNetworks = railroadNetworks;
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
});