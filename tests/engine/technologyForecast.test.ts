import { expect, it } from 'vitest';
import { researchReserve } from '@/engine/ai/economy';
import { planOrdinaryTurn, scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { planTechnology } from '@/engine/ai/scriptedTechnology';
import { upkeepOf } from '@/engine/army/armies';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import { MaterialType } from '@/types/Resource';
import { WorkerType } from '@/types/Workers';
import { addRegiments, continent, SW1 } from './armyFixtures';
import { emptyWarehouse, game, N1, N2, nationOf, setIndustry, setTreasury, setWarehouse, T, workerId } from './fixtures';

const research = (nationId: string, techId: string): Order => ({ kind: 'buyTechnology', nationId, techId });
const hire: Order = { kind: 'setUniversity', nationId: N1, civilianType: WorkerType.Rancher, count: 1 };

function decision(state: GameState, nationId: string) {
  const orders: Order[] = [];
  planTechnology(state, nationId, researchReserve(state, nationId), o => { orders.push(o); return true; }, planOrdinaryTurn);
  return orders;
}

it('FR-547 buys for the third-season Clipper when the ordinary Indiaman misses that deadline', () => {
  let state = continent();
  while (state.turn < 3) state = resolveTurn(state, { [N2]: scriptedPlayer(state, N2) }).state;
  const orders = scriptedPlayer(state, N2);
  const ordinary = orders.filter(o => o.kind !== 'buyTechnology');
  function firstShip(purchase: boolean) {
    let future = resolveTurn(state, { [N2]: purchase ? [...ordinary, research(N2, 'streamlinedHulls')] : ordinary }).state;
    while (future.turn <= 7) {
      const plan = scriptedPlayer(future, N2, o => o.kind !== 'buyTechnology');
      const ship = plan.find(o => o.kind === 'setShipyard' && o.count > 0);
      if (ship?.kind === 'setShipyard') return [future.turn, ship.ship];
      future = resolveTurn(future, { [N2]: plan }).state;
    }
  }
  expect(firstShip(false)).toEqual([7, 'indiaman']);
  expect(firstShip(true)).toEqual([6, 'clipper']);
  expect(orders).toContainEqual(research(N2, 'streamlinedHulls'));
});

function rancherGame() {
  const s = game();
  return setIndustry(emptyWarehouse({ ...s, turn: 36, nations: s.nations.map(n => n.id === N1 ? { ...n, controller: 'scripted' } : n) },
    N1, { paper: 2, cannedFood: 20 }), N1, { workers: { untrained: 0, trained: 0, expert: 0 } });
}

it('FR-547 declines the T36 Rancher when known army upkeep prevents the only timely enrolment', () => {
  let s = rancherGame();
  s = { ...s, map: { ...s.map, tiles: s.map.tiles.map(row => row.map(t => ({ ...t,
    workers: t.workers.filter(w => w.nationId !== N1 || w.type !== WorkerType.Rancher) }))) } };
  s = setIndustry(s, N1, { workers: { untrained: 0, trained: 0, expert: 1 } });
  s = setTreasury(addRegiments(s, N1, SW1, ['regulars','regulars','regulars','regulars']), N1, 5100);
  expect(upkeepOf(s, N1)).toBe(100);
  const next = resolveTurn(s, { [N1]: [research(N1, 'feedGrasses')] }).state;
  expect(nationOf(next, N1).treasury).toBe(3500);
  let future = next;
  while (future.turn <= 39) {
    const orders = scriptedPlayer(future, N1);
    expect(orders).not.toContainEqual(hire);
    future = resolveTurn(future, { [N1]: orders }).state;
  }
  expect(decision(s, N1)).not.toContainEqual(research(N1, 'feedGrasses'));
});

it('FR-547 uses the expert returned after the meal by an already filed civilian disband', () => {
  const s = setTreasury(rancherGame(), N1, 8000);
  const filed = tryApplyOrder(s, { kind: 'disbandCivilian', nationId: N1, workerId: workerId(N1, WorkerType.Rancher) });
  expect(filed.result.ok).toBe(true);
  let future = resolveTurn(filed.state, { [N1]: [research(N1, 'feedGrasses')] }).state;
  expect(nationOf(future, N1).industry.workers.expert).toBe(1);
  const orders = scriptedPlayer(future, N1);
  expect(orders).toContainEqual(hire);
  future = resolveTurn(future, { [N1]: orders }).state;
  const rancher = future.map.tiles.flat().flatMap(t => t.workers).find(w => w.nationId === N1 && w.type === WorkerType.Rancher)!;
  expect(scriptedPlayer(future, N1)).toContainEqual({ kind: 'moveAndStartDevelopment', nationId: N1, workerId: rancher.id, toTileId: T.range1 });
  expect(decision(filed.state, N1)).toContainEqual(research(N1, 'feedGrasses'));
});

it('FR-497 never reads the rival mill order during a real Clipper evaluation', () => {
  let s = setWarehouse(continent(), N1, { timber: 4 });
  s = emptyWarehouse(setTreasury(s, N2, 50000), N2, { lumber: 6, fabric: 2 });
  s = { ...s, turn: 7, nations: s.nations.map(n => n.id === N2 ? { ...n, merchantMarine: {
    ...n.merchantMarine, tradeHistory: Array.from({ length: 3 }, () => ({ used: 4, holds: 4 })) } } : n) };
  const order: Order = { kind: 'setProduction', nationId: N1, building: 'lumberMill', output: MaterialType.Lumber, amount: 1 };
  const filed = tryApplyOrder(s, order);
  expect(filed.result.ok).toBe(true);
  const mill = nationOf(filed.state, N1).industry.buildings.lumberMill!;
  const privateOrders = mill.orders;
  let reads = 0;
  Object.defineProperty(mill, 'orders', { get() { reads++; return privateOrders; } });
  expect(decision(filed.state, N2)).toEqual([research(N2, 'streamlinedHulls')]);
  expect(reads).toBe(0);
  scriptedPlayer(filed.state, N2);
  expect(reads).toBe(0);
});

it('FR-497 the Council guard reads no private rival cash after a funded bid', () => {
  let s = emptyWarehouse(setTreasury(continent(), N2, 50000), N2, { lumber: 6, fabric: 2 });
  s = { ...s, turn: 10, nations: s.nations.map(n => n.id === N2 ? { ...n, merchantMarine: {
    ...n.merchantMarine, tradeHistory: Array.from({ length: 3 }, () => ({ used: 4, holds: 4 })) } } : n) };
  const filed = tryApplyOrder(s, { kind: 'buyCommodity', nationId: N1, commodity: MaterialType.Steel, amount: 1 });
  expect(filed.result.ok).toBe(true);
  const rival = nationOf(filed.state, N1);
  const cashAfterBid = rival.treasury;
  expect(cashAfterBid).toBeLessThan(nationOf(s, N1).treasury);
  const floor = researchReserve(filed.state, N2);
  let reads = 0;
  Object.defineProperty(rival, 'treasury', { get() { reads++; return cashAfterBid; } });
  const buys: Order[] = [];
  planTechnology(filed.state, N2, floor, o => { buys.push(o); return true; }, planOrdinaryTurn);
  expect(buys).toEqual([research(N2, 'streamlinedHulls')]);
  expect(reads).toBe(0);
});
