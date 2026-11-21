import { expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { N1, nationOf, setBuilding, setWarehouse, stockOf } from './fixtures';

it('FR-525 seed 1: the turn-17 world market cannot supply a refinery built after buying Oil Drilling on turn 18', () => {
  let state = newGame({ world: 'two-islands', seed: 1 });
  const resolve = (...orders: Order[]) => {
    const result = resolveTurn(state, { [N1]: orders });
    state = result.state;
    return result.events.filter(e => e.type === 'order-rejected').map(e => e.reason);
  };
  // Fund Oil Drilling through normal production and sales. Keep two lumber and steel for the refinery.
  expect(resolve(
    { kind: 'setProduction', nationId: N1, building: 'furnitureFactory', amount: 1 },
    { kind: 'setProduction', nationId: N1, building: 'metalWorks', amount: 1 },
    { kind: 'setProduction', nationId: N1, building: 'textileMill', amount: 1 },
    { kind: 'setProduction', nationId: N1, building: 'steelMill', amount: 1 },
    { kind: 'setProduction', nationId: N1, building: 'lumberMill', amount: 1 },
  )).toEqual([]);
  while (state.turn < 17) {
    const orders: Order[] = [];
    if (state.turn === 3) orders.push({ kind: 'setProduction', nationId: N1, building: 'clothingFactory', amount: 1 });
    if (state.turn === 7) {
      orders.push({ kind: 'setProduction', nationId: N1, building: 'furnitureFactory', amount: 0 });
    }
    if (state.turn === 9) orders.push({ kind: 'setProduction', nationId: N1, building: 'metalWorks', amount: 0 });
    for (const commodity of [GoodsType.Furniture, GoodsType.Hardware, GoodsType.Clothing]) {
      if (stockOf(state, N1, commodity) > 0) orders.push({ kind: 'sellCommodity', nationId: N1, commodity, amount: 1 });
    }
    expect(resolve(...orders)).toEqual([]);
  }

  const bid = resolve({ kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Oil, amount: 2 });
  const oilDelivered = stockOf(state, N1, ResourceType.Oil);
  expect(resolve({ kind: 'buyTechnology', nationId: N1, techId: 'oilDrilling' })).toEqual([]);
  expect(nationOf(state, N1).technologies).toContain('oilDrilling');
  expect(resolve({ kind: 'expandBuilding', nationId: N1, building: 'refinery' })).toEqual([]);
  expect(nationOf(state, N1).industry.buildings.refinery?.capacity).toBe(2);
  const production = resolve({ kind: 'setProduction', nationId: N1, building: 'refinery', amount: 1 });
  expect({ bid, oilDelivered, production, fuel: stockOf(state, N1, MaterialType.Fuel) }).toEqual({
    bid: ['no-seller'], oilDelivered: 0, production: ['insufficient-resources'], fuel: 0,
  });
});

it('FR-525 carried oil stays in the warehouse even with a standing order for fuel', () => {
  const stocked = setWarehouse(newGame(1), N1, { oil: 2 });
  const ordered = setBuilding(stocked, N1, 'refinery', { capacity: 2, orders: { fuel: 1 } });
  const next = resolveTurn(ordered, {}).state;
  expect([stockOf(next, N1, ResourceType.Oil), stockOf(next, N1, MaterialType.Fuel)]).toEqual([2, 0]);
});
