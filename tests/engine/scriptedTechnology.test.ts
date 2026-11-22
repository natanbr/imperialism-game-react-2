import { expect, it } from 'vitest';
import { takeProvince } from '@/engine/army/conquest';
import { cashReserve } from '@/engine/ai/economy';
import { planOrdinaryTurn, scriptedOrdersWithoutResearch, scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { upkeepReserve } from '@/engine/ai/scriptedArmy';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { transferProvince } from '@/engine/world/provinces';
import { councilVote } from '@/engine/council/council';
import { planTechnology } from '@/engine/ai/scriptedTechnology';
import type { Order } from '@/engine/orders/Order';
import { tryApplyOrder } from '@/engine/orders/apply';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import type { GameState } from '@/types/GameState';
import { addRegiments, continent, NE1, NW1, SW1, threePowers } from './armyFixtures';
import { emptyWarehouse, game, N1, N2, nationOf, setBuilding, setIndustry, setPair, setTechnologies, setTile, setTreasury, setWarehouse, T } from './fixtures';

function scripted(s: GameState): GameState {
  return { ...s, turn: 7, nations: s.nations.map(n => n.id === N1 ? { ...n, controller: 'scripted' } : n) };
}

function purchases(s: GameState) {
  const ids: string[] = [];
  planTechnology(s, N1, Math.max(cashReserve(s, N1), upkeepReserve(s, N1)), order => {
    if (order.kind === 'buyTechnology') ids.push(order.techId);
    return true;
  }, planOrdinaryTurn);
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

it('FR-547 buys for an earlier Clipper and skips research when the committed mill finishes the ordinary hull on time', () => {
  const s = fleet();
  const ready = setWarehouse(s, N1, { lumber: 7, cotton: 2 });
  const mills = setBuilding(ready, N1, 'textileMill', { capacity: 1, pendingCapacity: 0, orders: { fabric: 1 } });
  expect(purchases(s)).toEqual(['streamlinedHulls']);
  function firstLaunch(state: GameState, research: Order[]) {
    let next = resolveTurn(state, { [N1]: research }).state;
    while (next.turn <= state.turn + 3) {
      const orders = scriptedOrdersWithoutResearch(next, N1);
      const ship = orders.find(o => o.kind === 'setShipyard' && o.count > 0);
      if (ship?.kind === 'setShipyard') return [next.turn, ship.ship];
      next = resolveTurn(next, { [N1]: orders }).state;
    }
  }
  const buy: Order[] = [{ kind: 'buyTechnology', nationId: N1, techId: 'streamlinedHulls' }];
  expect(purchases(ready)).toEqual(['streamlinedHulls']);
  expect(firstLaunch(ready, buy)).toEqual([8, 'clipper']);
  expect(firstLaunch(ready, [])).toEqual([9, 'indiaman']);
  expect(purchases(mills)).toEqual([]);
  expect(firstLaunch(mills, [])).toEqual([8, 'indiaman']);
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

it('FR-547 keeps the research money when minor votes decide this Council meeting', () => {
  let state = { ...fleet(), turn: 10 };
  expect(purchases(state)).toEqual(['streamlinedHulls']);
  for (const minor of state.minorNations) state = setPair(state, N1, minor.id, { points: 80 });
  const forecast = councilVote(state);
  expect(forecast?.winnerId).toBe(N1);
  expect(forecast?.nominees.find(n => n.nationId === N1)).toMatchObject({ controlled: 4, otherMinorNations: 4, total: 8 });
  expect(forecast?.nominees.find(n => n.nationId !== N1)?.total).toBe(4);

  const orders = actions(state);
  const { gameOver } = resolveTurn(state, { [N1]: orders }).state;
  expect(gameOver).toMatchObject({ reason: 'council', turn: 10, winnerId: N1 });
  expect(gameOver?.council?.nominees.map(n => n.total)).toEqual(forecast?.nominees.map(n => n.total));
  expect(orders.filter(order => order.kind === 'buyTechnology')).toEqual([]);
});

it('FR-547 accounts for its already-paid grant when this meeting resolves', () => {
  let s = { ...fleet(), turn: 10 };
  const [a, b, c] = s.minorNations;
  for (const minor of [a, b, c]) {
    s = setPair(s, N1, minor.id, { points: minor === c ? 49 : 80, consulates: [N1], embassies: [N1] });
  }
  expect(councilVote(s)?.nominees.find(n => n.nationId === N1)?.total).toBe(6);
  const grant = tryApplyOrder(s, { kind: 'giveGrant', nationId: N1, targetId: c.id, amount: 1000, locked: false });
  expect(grant.result.ok).toBe(true);
  const settled = resolveTurn(grant.state, {}).state.gameOver;
  expect(settled).toMatchObject({ reason: 'council', winnerId: N1 });
  expect(settled?.council?.nominees.find(n => n.nationId === N1)?.total).toBe(7);
  expect(purchases(grant.state)).toEqual([]);
});

it('FR-547 distinguishes a winning and an inconclusive meeting with three Great Powers', () => {
  const base = emptyWarehouse(setTreasury(threePowers(), N2, 50000), N2, { lumber: 6, fabric: 2 });
  let s = { ...base, turn: 10, nations: base.nations.map(n => n.id === N2 ? { ...n, merchantMarine: {
    ...n.merchantMarine, tradeHistory: Array.from({ length: 3 }, () => ({ used: 4, holds: 4 })) } } : n) };
  s = transferProvince(transferProvince(s, NE1, N2), NW1, N2);
  expect(councilVote(s)?.winnerId).toBeUndefined();
  const ordinaryMeeting = scriptedPlayer(s, N2);
  expect(ordinaryMeeting).toContainEqual({ kind: 'buyTechnology', nationId: N2, techId: 'streamlinedHulls' });
  expect(resolveTurn(s, { [N2]: ordinaryMeeting }).state.gameOver).toBeUndefined();

  for (const minor of s.minorNations) s = setPair(s, N2, minor.id, { points: 80 });
  const council = councilVote(s);
  expect(council).toMatchObject({ needed: 9, winnerId: N2 });
  expect(council?.nominees.map(n => n.total)).toEqual([9, 2]);
  const orders = scriptedPlayer(s, N2);
  expect(resolveTurn(s, { [N2]: orders }).state.gameOver).toMatchObject({ reason: 'council', turn: 10, winnerId: N2 });
  expect(orders.filter(o => o.kind === 'buyTechnology')).toEqual([]);
});
