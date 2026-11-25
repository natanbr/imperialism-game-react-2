import { describe, expect, it } from 'vitest';
import { game, deepFreeze, emptyWarehouse, N1, N2, setIndustry, stockOf } from '../fixtures';
import { getAdjacentTiles } from '@/engine/map/mapHelpers';
import { computeLogisticsTransport, logisticsSystem } from '@/engine/systems/logisticsSystem';
import { foodSystem } from '@/engine/systems/foodSystem';
import { createTurnContext } from '@/engine/turn/context';
import { applyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import { productionSystem } from '@/engine/systems/productionSystem';
import { MapStyle, type GameMap } from '@/types/Map';
import { ResourceType } from '@/types/Resource';
import { TerrainType, type Tile } from '@/types/Tile';
import type { RailroadNetwork } from '@/types/Transport';

// Two ports on either side of the same sea and river hexes. All other squares are dry.
function estuary(): GameMap {
  const tiles: Tile[][] = Array.from({ length: 4 }, (_, y) =>
    Array.from({ length: 6 }, (_, x) => ({
      id: `${x}-${y}`, x, y, terrain: TerrainType.DryPlains, ownerNationId: N1,
      workers: [], explored: true, visible: true,
    })),
  );
  tiles[1][2] = { ...tiles[1][2], terrain: TerrainType.Water, ownerNationId: undefined };
  tiles[2][2] = { ...tiles[2][2], terrain: TerrainType.FertileHills, hasRiver: true,
    resource: { type: ResourceType.Wool, level: 1 } };
  return { config: { rows: 4, cols: 6, style: MapStyle.HexGrid }, tiles };
}

const harbor = { x: 1, y: 1 };
const overlappingHarbor = { x: 3, y: 2 };
const port = (node: typeof harbor, isActive = true) => ({ ...node, isActive });
const network: RailroadNetwork = { capital: harbor, graph: {}, ports: [], depots: [] };

describe('FR-583 fishing on sea and river hexes', () => {
  it('collects both fishing hexes once, alongside the normal land yield', () => {
    const map = deepFreeze(estuary());
    for (const node of [harbor, overlappingHarbor]) {
      expect(getAdjacentTiles(map, node.x, node.y).map(t => t.id)).toEqual(expect.arrayContaining(['2-1', '2-2']));
    }
    const expected = { wool: 2, fish: 2 };
    expect(computeLogisticsTransport(map, N1, network)).toEqual(expected);
    expect(computeLogisticsTransport(map, N1, { ...network, ports: [port(overlappingHarbor)] })).toEqual(expected);
    expect(computeLogisticsTransport(map, N1, { ...network, capital: undefined, ports: [port(overlappingHarbor)] })).toEqual(expected);
  });

  it('only fishes next to an active port or capital, and excludes another nation’s inland fish', () => {
    const map = estuary();
    expect(computeLogisticsTransport(map, N1, { graph: {}, ports: [port(harbor, false)], depots: [port(overlappingHarbor)] })).toEqual({ wool: 2 });
    map.tiles[2][2].ownerNationId = N2;
    expect(computeLogisticsTransport(map, N1, network)).toEqual({ fish: 1 });
    map.tiles[1][2].terrain = TerrainType.Coast;
    expect(computeLogisticsTransport(map, N1, network)).toEqual({ fish: 1 });
  });

  it('ships within the chosen freight allocation and serves the catch at the meal or food processor', () => {
    const start = setIndustry(emptyWarehouse(game(), N1, { grain: 2, fruit: 1 }), N1, {
      workers: { untrained: 4, trained: 0, expert: 0 },
    });
    const state = { ...start, map: estuary(), nations: start.nations.map(n => ({ ...n, transportCapacity: 1 })),
      transportNetwork: { ...start.transportNetwork, railroadNetworks: { [N1]: network } } };
    const allocation = { kind: 'setTransportAllocations', nationId: N1, allocations: { fish: 1 } } as const;
    expect(validateOrder(state, allocation)).toEqual({ ok: true });
    const ctx = createTurnContext({ turn: state.turn });
    const delivered = logisticsSystem(deepFreeze(applyOrder(state, allocation)), ctx);
    expect(stockOf(delivered, N1, 'fish')).toBe(1);
    expect(stockOf(delivered, N1, 'wool')).toBe(0);
    expect(stockOf(foodSystem(delivered, ctx), N1, 'fish')).toBe(0);
    const can = { kind: 'setProduction', nationId: N1, building: 'foodProcessing', amount: 2 } as const;
    expect(validateOrder(delivered, can)).toEqual({ ok: true });
    const processed = productionSystem(applyOrder(delivered, can), ctx);
    expect(stockOf(processed, N1, 'cannedFood')).toBe(2);
    expect(stockOf(processed, N1, 'fish')).toBe(0);
  });
});
