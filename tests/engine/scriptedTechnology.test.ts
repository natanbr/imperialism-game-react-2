import { expect, it } from 'vitest';
import { takeProvince } from '@/engine/army/conquest';
import { cashReserve, planEconomy } from '@/engine/ai/economy';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { upkeepReserve } from '@/engine/ai/scriptedArmy';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { planTechnology } from '@/engine/ai/scriptedTechnology';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import type { GameState } from '@/types/GameState';
import { addRegiments, continent, SW1 } from './armyFixtures';
import { emptyWarehouse, game, N1, nationOf, setBuilding, setIndustry, setTechnologies, setTile, setTreasury, setWarehouse, T } from './fixtures';

function scripted(s: GameState): GameState {
  return { ...s, turn: 7, nations: s.nations.map(n => n.id === N1 ? { ...n, controller: 'scripted' } : n) };
}

function purchases(s: GameState) {
  const ids: string[] = [];
  planTechnology(s, N1, Math.max(cashReserve(s, N1), upkeepReserve(s, N1)), order => {
    if (order.kind === 'buyTechnology') ids.push(order.techId);
    return true;
  }, planEconomy);
  return ids;
}

function missingRancher() {
  let s = scripted(game());
  s = { ...s, map: { ...s.map, tiles: s.map.tiles.map(row => row.map(t => ({
    ...t, workers: t.workers.filter(w => w.nationId !== N1 || w.type !== WorkerType.Rancher),
  }))) } };
  s = setIndustry(s, N1, { workers: { untrained: 0, trained: 0, expert: 8 } });
  return setTreasury(emptyWarehouse(s, N1, { paper: 4, cannedFood: 100 }), N1, 50000);
}

function fleet() {
  let s = setTreasury(emptyWarehouse(scripted(continent()), N1, { lumber: 6, fabric: 2 }), N1, 50000);
  s = { ...s, nations: s.nations.map(n => n.id === N1 ? { ...n,
    merchantMarine: { ...n.merchantMarine, tradeHistory: Array.from({ length: 3 }, () => ({ used: 4, holds: 4 })) },
  } : n) };
  return s;
}

const actions = (s: GameState) => scriptedPlayer(s, N1);

it('FR-547 an ungated collected cotton project proceeds without research', () => {
  const s = setTile(scripted(game()), T.farm1, { terrain: TerrainType.Plantation, resource: { type: ResourceType.Cotton, level: 0 } });
  expect(purchases(s)).toEqual([]);
  expect(actions(s).some(o => o.kind === 'moveAndStartDevelopment' && o.toTileId === T.farm1)).toBe(true);
});

it('FR-547 buys the missing University permission, hires the specialist next turn and orders its collected project', () => {
  let s = missingRancher();
  const first = actions(s);
  expect(first.filter(o => o.kind === 'buyTechnology')).toEqual([{ kind: 'buyTechnology', nationId: N1, techId: 'feedGrasses' }]);
  s = resolveTurn(s, { [N1]: first }).state;
  const second = actions(s);
  expect(second).toContainEqual({ kind: 'setUniversity', nationId: N1, civilianType: WorkerType.Rancher, count: 1 });
  s = resolveTurn(s, { [N1]: second }).state;
  const rancher = s.map.tiles.flat().flatMap(t => t.workers).find(w => w.nationId === N1 && w.type === WorkerType.Rancher)!;
  expect(actions(s)).toContainEqual({ kind: 'moveAndStartDevelopment', nationId: N1, workerId: rancher.id, toTileId: T.range1 });
});

it('FR-547 declines a replacement with an existing hire, missing inputs, no collected work or insufficient time', () => {
  const s = missingRancher();
  const queued = { ...s, nations: s.nations.map(n => n.id === N1 ? { ...n, university: { rancher: 1 } } : n) };
  for (const state of [queued, setWarehouse(s, N1, { paper: 1 }), setIndustry(s, N1, { workers: { untrained: 6, trained: 0, expert: 0 } }),
    setTile(s, T.range1, { resource: undefined }), { ...s, turnLimit: s.turn + 3 }]) {
    expect(purchases(state)).toEqual([]);
  }
});

it('FR-547 immediately buys Streamlined Hulls for a materially blocked full fleet and uses it next turn', () => {
  let s = fleet();
  expect(actions(s)).toContainEqual({ kind: 'buyTechnology', nationId: N1, techId: 'streamlinedHulls' });
  s = resolveTurn(s, { [N1]: actions(s) }).state;
  expect(actions(s)).toContainEqual({ kind: 'setShipyard', nationId: N1, ship: 'clipper', count: 1 });
});

it('FR-516 FR-547 keeps the legal Indiaman first and declines a Clipper without demand, materials, or a remaining season', () => {
  const s = fleet();
  const ready = setWarehouse(s, N1, { lumber: 7, fabric: 3 });
  expect(actions(ready)).toContainEqual({ kind: 'setShipyard', nationId: N1, ship: 'indiaman', count: 1 });
  const tooEarly = { ...s, nations: s.nations.map(n => ({ ...n, merchantMarine: { ...n.merchantMarine, tradeHistory: [] } })) };
  for (const state of [ready, tooEarly, setWarehouse(s, N1, { lumber: 5 }), { ...s, turnLimit: s.turn }]) {
    expect(purchases(state)).toEqual([]);
  }
});

it('FR-547 protects the larger of the cash and army reserves and permits at most one buy on a turn', () => {
  const s = addRegiments(fleet(), N1, SW1, Array(50).fill('regulars'));
  const reserve = Math.max(cashReserve(s, N1), upkeepReserve(s, N1));
  expect(purchases(setTreasury(s, N1, reserve + 1499))).toEqual([]);
  expect(purchases(setTreasury(s, N1, reserve + 1500))).toEqual(['streamlinedHulls']);
  const pending = { ...s, nations: s.nations.map(n => n.id === N1 ? { ...n, pendingTechnologies: ['feedGrasses'] } : n) };
  expect(purchases(pending)).toEqual([]);
});

it('FR-547 an already unlocked specialist is hired directly and a full starting roster buys no civilian permissions', () => {
  const owned = setTechnologies(missingRancher(), N1, 'seedDrill', 'feedGrasses');
  expect(actions(owned)).toContainEqual({ kind: 'setUniversity', nationId: N1, civilianType: WorkerType.Rancher, count: 1 });
  expect(purchases(scripted(game()))).toEqual([]);
  expect(nationOf(owned, N1).university?.rancher).toBeFalsy();
});

it('FR-547 skips research when committed mill output finishes the Indiaman or current demand will expire', () => {
  const s = fleet();
  const ready = setWarehouse(s, N1, { lumber: 7, cotton: 2 });
  const mills = setBuilding(ready, N1, 'textileMill', { capacity: 1, pendingCapacity: 0, orders: { fabric: 1 } });
  expect(purchases(s)).toEqual(['streamlinedHulls']);
  expect(purchases(ready)).toEqual([]);
  let next = ready;
  const shipped: number[] = [];
  for (let season = 0; season <= 3; season++) {
    const orders = actions(next);
    if (orders.some(o => o.kind === 'setShipyard' && o.ship === 'indiaman')) shipped.push(season);
    next = resolveTurn(next, { [N1]: orders }).state;
  }
  expect(shipped.length).toBeGreaterThan(0);
  expect(purchases(mills)).toEqual([]);
  const expiring = { ...s, nations: s.nations.map(n => n.id === N1 ? { ...n, merchantMarine: {
    ...n.merchantMarine, tradeHistory: [4, 4, 3, 4].map(used => ({ holds: 4, used })),
  } } : n) };
  expect(purchases(expiring)).toEqual([]);
});

it('FR-547 buys when an initially unaffordable need becomes affordable on a later turn', () => {
  const s = fleet();
  const reserve = Math.max(cashReserve(s, N1), upkeepReserve(s, N1));
  expect(purchases(setTreasury(s, N1, reserve + 1499))).toEqual([]);
  const next = setTreasury({ ...s, turn: s.turn + 1 }, N1, reserve + 1500);
  expect(purchases(next)).toEqual(['streamlinedHulls']);
});

it('FR-547 buys once when a Clipper and a Rancher both need research, then serves the second need', () => {
  let s = fleet();
  const pasture = s.map.tiles.flat().find(t => t.ownerNationId === N1 && !t.cityId && collectingHub(s, N1, t.id))!;
  s = setTile(s, pasture.id, { terrain: TerrainType.OpenRange, resource: { type: ResourceType.Livestock, level: 0 } });
  s = setIndustry(setWarehouse(s, N1, { paper: 8, cannedFood: 100 }), N1, { workers: { untrained: 0, trained: 0, expert: 8 } });
  s = { ...s, map: { ...s.map, tiles: s.map.tiles.map(row => row.map(tile => ({
    ...tile, workers: tile.workers.filter(w => w.nationId !== N1 || w.type !== WorkerType.Rancher),
  }))) } };
  const first = actions(s);
  expect(first.filter(o => o.kind === 'buyTechnology').map(o => o.techId)).toEqual(['streamlinedHulls']);
  s = resolveTurn(s, { [N1]: first }).state;
  const second = actions(s);
  expect(second).toContainEqual({ kind: 'setShipyard', nationId: N1, ship: 'clipper', count: 1 });
  expect(second.filter(o => o.kind === 'buyTechnology').map(o => o.techId)).toEqual(['feedGrasses']);
  s = resolveTurn(s, { [N1]: second }).state;
  expect(actions(s)).toContainEqual({ kind: 'setUniversity', nationId: N1, civilianType: WorkerType.Rancher, count: 1 });
});

it.each([undefined, 36])('FR-547 forecasts the final world sale and next-season cooldown (previous ship turn %s)', lastShipOrderTurn => {
  let s = setTreasury(emptyWarehouse(scripted(continent('world')), N1, { lumber: lastShipOrderTurn ? 8 : 6, fabric: lastShipOrderTurn ? 4 : 2, clothing: 8, furniture: 8 }), N1, 50000);
  s = { ...s, turn: 39, nations: s.nations.map(n => n.id === N1 ? { ...n, merchantMarine: {
    ...n.merchantMarine, lastShipOrderTurn, tradeHistory: [4, 4, 0, 4].map(used => ({ holds: 4, used })),
  } } : n) };
  const orders = actions(s);
  expect(orders).toContainEqual({ kind: 'buyTechnology', nationId: N1, techId: 'streamlinedHulls' });
  const next = resolveTurn(s, { [N1]: orders }).state;
  expect(actions(next)).toContainEqual({ kind: 'setShipyard', nationId: N1, ship: 'clipper', count: 1 });
});

it('FR-547 spends nothing on the turn a public controlling bloc will win the Council', () => {
  let s = fleet();
  for (const id of ['minor-1', 'minor-2', 'minor-3']) s = takeProvince(s, 'province-' + id, N1, 9, () => {});
  s = { ...s, turn: 10 };
  expect(purchases(s)).toEqual([]);
  expect(resolveTurn(s, { [N1]: actions(s) }).state.gameOver?.reason).toBe('council');
});

it('FR-547 skips the University permission when its only expert will be sick after the meal', () => {
  let s = missingRancher();
  s = { ...s, map: { ...s.map, tiles: s.map.tiles.map(row => row.map(t => t.ownerNationId === N1
    && t.id !== T.range1 ? { ...t, resource: undefined } : t)) } };
  s = setIndustry(emptyWarehouse(s, N1, { paper: 6 }), N1, { workers: { untrained: 0, trained: 0, expert: 1 } });
  expect(purchases(s)).toEqual([]);
});
