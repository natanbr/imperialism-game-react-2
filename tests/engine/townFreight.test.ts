import { describe, expect, it } from 'vitest';
import { GEMS_CASH_PER_UNIT, GOLD_CASH_PER_UNIT } from '@/definisions/cashValues';
import { projectedFreightPlan, projectedFreightSupply } from '@/engine/systems/logisticsSystem';
import { resolveTurn, type TurnResult } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import type { NationController } from '@/types/Nation';
import { ResourceType } from '@/types/Resource';
import { deepFreeze, game, N1, N2, nationOf, setBuilding, setTile, stockOf } from './fixtures';

const towns = [
  { id: 'west', name: 'West', seatTileId: '2-1', timber: ['0-3', '1-3', '2-3', '3-3'], cotton: ['3-0', '3-1'] },
  { id: 'east', name: 'East', seatTileId: '1-0', timber: ['0-4', '1-4', '2-4', '3-4'], cotton: [] },
];

/** Two seats touch the capital. Their forests and cotton fields are outside its collection radius. */
function beforeUpgrade(cars: number, controller: NationController = 'human'): GameState {
  let state = game();
  for (const tile of state.map.tiles.flat()) state = setTile(state, tile.id, { resource: undefined });
  for (const town of towns) {
    for (const id of town.timber) state = setTile(state, id, { provinceId: town.id, resource: { type: ResourceType.Timber, level: 0 } });
    for (const id of town.cotton) state = setTile(state, id, { provinceId: town.id, resource: { type: ResourceType.Cotton, level: 0 } });
    state = setTile(state, town.seatTileId, { provinceId: town.id });
  }
  state = setTile(state, towns[0].seatTileId, { resource: { type: ResourceType.Grain, level: 0 } });
  state = setTile(state, towns[1].seatTileId, { hasRiver: true });
  state = setBuilding(setBuilding(state, N1, 'furnitureFactory', { capacity: 8 }), N1, 'clothingFactory', { capacity: 4 });
  const owner = nationOf(state, N1);
  const warehouse = { ...owner.warehouse };
  Reflect.deleteProperty(warehouse, 'furniture');
  const provinces = towns.map(t => ({
    id: t.id, name: t.name, ownerId: N1, seatTileId: t.seatTileId, tileIds: [t.seatTileId, ...t.timber, ...t.cotton],
  }));
  return {
    ...state, turn: 8, provinces,
    nations: state.nations.map(n => n.id === N1 ? {
      ...n, controller, warehouse, transportCapacity: cars,
      industry: { ...n.industry, workers: { untrained: 0, trained: 0, expert: 0 } },
    } : n),
    townProgress: Object.fromEntries(towns.map(t => [t.id, {
      ownerId: N1, connectedSettlements: 7,
      matured: { textile: t.cotton.length ? 1 : 0, wood: 1, metal: 0 },
      upgradeSettlements: { textile: 0, wood: 1, metal: 0 },
    }])),
  };
}

function resolve(state: GameState, plan?: Record<string, number>) {
  const result = resolveTurn(deepFreeze(state), plan ? { [N1]: [{ kind: 'setTransportAllocations', nationId: N1, allocations: plan }] } : {});
  expect(result.events.filter(e => e.type === 'order-rejected')).toEqual([]);
  return result;
}

const receipts = (result: TurnResult) => result.events.filter(e => e.type === 'town-receipt');
const line = (commodity: string, offered: number, delivered: number) => ({ commodity, offered, delivered });
const expectedReceipts = (fabric: number, westLumber: number, eastLumber: number, westFurniture: number, eastFurniture: number, turn = 8) => [
  { type: 'town-receipt', nationId: N1, turn, provinceId: 'west', seatTileId: '2-1',
    lines: [line('fabric', 1, fabric), line('lumber', 2, westLumber), line('furniture', 1, westFurniture)] },
  { type: 'town-receipt', nationId: N1, turn, provinceId: 'east', seatTileId: '1-0',
    lines: [line('lumber', 2, eastLumber), line('furniture', 1, eastFurniture)] },
];

const tracked = ['grain', 'fish', 'fabric', 'lumber', 'furniture'];
const stockDeltas = (before: GameState, after: GameState) =>
  Object.fromEntries(tracked.map(k => [k, stockOf(after, N1, k) - stockOf(before, N1, k)]));

describe('FR-621/622 shared town freight through the real turn phases', () => {
  it.each(['human', 'scripted'] as const)('ships all raw, fish and both newly upgraded town bundles once for a %s owner', controller => {
    const state = beforeUpgrade(12, controller);
    expect(nationOf(state, N1).warehouse).not.toHaveProperty('furniture');
    const result = resolve(state);
    expect(stockDeltas(state, result.state)).toEqual({ grain: 1, fish: 1, fabric: 1, lumber: 4, furniture: 2 });
    expect(receipts(result)).toEqual(expectedReceipts(1, 2, 2, 1, 1));
    expect(stockOf(result.state, N2, 'furniture')).toBe(stockOf(state, N2, 'furniture'));
    expect(resolve(state)).toEqual(result);
  });

  it('loads raw and fish first, then the first province’s full bundle before any automatic units of the next', () => {
    const state = beforeUpgrade(6);
    const result = resolve(state);
    const shipped = { grain: 1, fish: 1, fabric: 1, lumber: 2, furniture: 1 };
    expect(stockDeltas(state, result.state)).toEqual(shipped);
    expect(receipts(result)).toEqual(expectedReceipts(1, 2, 0, 1, 0));
    expect(projectedFreightPlan(state, N1, 6).shipments).toEqual(shipped);
  });

  it('uses a set lumber target across both towns first, then fills automatic freight in source order', () => {
    const state = beforeUpgrade(6);
    const plan = { lumber: 3, fabric: 0 };
    const result = resolve(state, plan);
    expect(receipts(result)).toEqual(expectedReceipts(0, 2, 1, 1, 0));
    expect(projectedFreightPlan(state, N1, 6, plan).shipments).toEqual({ lumber: 3, grain: 1, fish: 1, furniture: 1 });
  });

  it('reserves cars for furniture and skips explicitly zero lumber even with cars to spare', () => {
    const scarce = beforeUpgrade(1);
    const result = resolve(scarce, { furniture: 1, lumber: 0 });
    expect(stockDeltas(scarce, result.state)).toEqual({ grain: 0, fish: 0, fabric: 0, lumber: 0, furniture: 1 });
    expect(receipts(result)).toEqual(expectedReceipts(0, 0, 0, 1, 0));
    const ample = beforeUpgrade(12);
    const capped = resolve(ample, { lumber: 0, furniture: 1 });
    expect(stockDeltas(ample, capped.state)).toEqual({ grain: 1, fish: 1, fabric: 1, lumber: 0, furniture: 1 });
  });

  it('records zero deliveries and discards that turn’s output when capacity returns', () => {
    const state = beforeUpgrade(0);
    const stopped = resolve(state);
    expect(stockDeltas(state, stopped.state)).toEqual({ grain: 0, fish: 0, fabric: 0, lumber: 0, furniture: 0 });
    expect(receipts(stopped)).toEqual(expectedReceipts(0, 0, 0, 0, 0));
    const reopened = { ...stopped.state, nations: stopped.state.nations.map(n => n.id === N1 ? { ...n, transportCapacity: 12 } : n) };
    const next = resolve(reopened);
    expect(stockDeltas(reopened, next.state)).toEqual({ grain: 1, fish: 1, fabric: 1, lumber: 4, furniture: 2 });
    expect(receipts(next)).toEqual(expectedReceipts(1, 2, 2, 1, 1, 9));
  });

  it('ships gold and gems straight to cash using the same cars as town goods', () => {
    let state = beforeUpgrade(3);
    state = setTile(state, '0-1', { resource: { type: ResourceType.Gold, level: 1, discovered: true } });
    state = setTile(state, '1-2', { resource: { type: ResourceType.Gems, level: 1, discovered: true } });
    const result = resolve(state, { gold: 1, gems: 1, furniture: 1 });
    expect(nationOf(result.state, N1).treasury - nationOf(state, N1).treasury).toBe(GOLD_CASH_PER_UNIT + GEMS_CASH_PER_UNIT);
    for (const key of ['gold', 'gems']) expect(stockOf(result.state, N1, key)).toBe(stockOf(state, N1, key));
    expect(receipts(result)).toEqual(expectedReceipts(0, 0, 0, 1, 0));
  });

  it('FR-625 forecasts the owner’s next settlement repeatedly without advancing or crediting it', () => {
    const state = deepFreeze(beforeUpgrade(12));
    const expected = { grain: 1, fish: 1, fabric: 1, lumber: 4, furniture: 2 };
    expect(projectedFreightSupply(state, N1)).toEqual(expected);
    expect(projectedFreightSupply(state, N1)).toEqual(expected);
    expect(projectedFreightSupply(state, N2)).toEqual({});
    expect(state.townProgress!.west.connectedSettlements).toBe(7);
    expect(stockDeltas(state, resolve(state).state)).toEqual(expected);
  });
});
