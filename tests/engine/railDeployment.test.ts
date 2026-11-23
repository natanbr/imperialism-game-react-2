import { describe, expect, it } from 'vitest';
import { validateOrder } from '@/engine/orders/validate';
import { tryApplyOrder } from '@/engine/orders/apply';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { transferProvince } from '@/engine/world/provinces';
import { armyIn, continent, NE1, NW1, NW2, SW1, relocate } from './armyFixtures';
import { N1, nationOf, setTile } from './fixtures';
import { TerrainType } from '@/types/Tile';
import { getAdjacentTiles } from '@/engine/map/mapHelpers';
import type { GameState } from '@/types/GameState';
import type { MoveArmyOrder } from '@/engine/orders/Order';

const rail = (regimentIds: string[], toProvinceId = NE1): MoveArmyOrder =>
  ({ kind: 'moveArmy', via: 'rail', nationId: N1, fromProvinceId: SW1, toProvinceId, regimentIds });
const fixture = (cars: number, pending = 0) => {
  const start = continent();
  return { ...start, nations: start.nations.map(n => n.id === N1 ? { ...n, transportCapacity: cars, transportCapacityPendingIncrease: pending } : n) };
};
const apply = (s: GameState, order: Parameters<typeof tryApplyOrder>[1]) => {
  const result = tryApplyOrder(s, order);
  expect(result.result).toEqual({ ok: true });
  return result.state;
};

describe('FR-555 rail deployment', () => {
  it('uses only cars in service, whole ARMS and a distinct owned destination on this landmass', () => {
    const regular = ['regiment-1'];
    expect(validateOrder(fixture(4, 1), rail(regular)).ok).toBe(false);
    expect(validateOrder(fixture(5), rail(regular))).toEqual({ ok: true });
    const state = transferProvince(fixture(15), 'province-minor-2', N1);
    for (const dest of [SW1, NW2, 'province-minor-2']) expect(validateOrder(state, rail(regular, dest)).ok).toBe(false);
    const militia = armyIn(state, N1, SW1)!.regiments.find(r => r.type === 'minutemen')!;
    expect(validateOrder(state, rail([militia.id])).ok).toBe(false);
  });
  it('shares 3 ARMS across origins and destinations, releases edits and leaves goods deliveries intact', () => {
    let start = relocate(fixture(15), ['regiment-2'], NE1);
    const capital = start.transportNetwork.railroadNetworks![N1].capital!;
    for (const tile of getAdjacentTiles(start.map, capital.x, capital.y)) {
      if (tile.resource) start = setTile(start, tile.id, { resource: { ...tile.resource, level: 3 } });
    }
    let s = start;
    const secondOrigin = { ...rail(['regiment-2'], NW1), fromProvinceId: NE1 };
    s = apply(s, rail(['regiment-3'], NW1)); // 2 ARMS of artillery
    s = apply(s, rail(['regiment-1']));
    expect(validateOrder(s, secondOrigin).ok).toBe(false);
    s = apply(s, rail(['regiment-3'])); // replace the existing reservation
    s = apply(s, { kind: 'cancelArmyMove', nationId: N1, regimentIds: ['regiment-3'] });
    s = apply(s, secondOrigin);
    const end = resolveTurn(s, {}, s.seed);
    expect(armyIn(end.state, N1, NE1)?.regiments.some(r => r.id === 'regiment-1')).toBe(true);
    expect(armyIn(end.state, N1, NW1)?.regiments.some(r => r.id === 'regiment-2')).toBe(true);
    const noMoves = resolveTurn(start, {}, s.seed);
    expect(nationOf(end.state, N1).warehouse).toEqual(nationOf(noMoves.state, N1).warehouse);
    const tenCars = { ...s, nations: s.nations.map(n => n.id === N1 ? { ...n, transportCapacity: 10 } : n) };
    const reduced = resolveTurn(tenCars, {}, s.seed).state;
    const stockedUnits = (state: GameState) => Object.values(nationOf(state, N1).warehouse).reduce((a, b) => a + b, 0);
    expect(stockedUnits(end.state) - stockedUnits(reduced)).toBe(5);
  });
  it.each([TerrainType.Water, TerrainType.River, TerrainType.Coast])('cannot deploy across the %s hex between Sundmark and the mainland', terrain => {
    const island = 'province-minor-2';
    const state = setTile(transferProvince(fixture(15), island, N1), '12-6', { terrain });
    const order = rail(['regiment-1'], island);
    const end = resolveTurn(state, { [N1]: [order] });
    expect(end.events).toContainEqual({ type: 'order-rejected', nationId: N1, order, reason: 'no-land-route' });
    expect(armyIn(end.state, N1, SW1)?.regiments.some(r => r.id === 'regiment-1')).toBe(true);
  });
});
