import { expect, it } from 'vitest';
import { computerOrders } from '@/engine/ai/players';
import { cashReserve } from '@/engine/ai/economy';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { upkeepReserve } from '@/engine/ai/scriptedArmy';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import type { GameState } from '@/types/GameState';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { planTechnology } from '@/engine/ai/scriptedTechnology';
import { TerrainType } from '@/types/Tile';
import { ResourceType } from '@/types/Resource';
import { emptyWarehouse, game, N1, put, setTile, setTreasury, T, tileAt, workerId } from './fixtures';
import { addRegiments, continent, SW1 } from './armyFixtures';

it('FR-527 the planner buys only the cheapest eligible unlock for a collected development site', () => {
  let state = setTreasury(game(), N1, 25000);
  state = { ...state, turn: 7, nations: state.nations.map(n => ({ ...n, controller: 'scripted', technologies: ['seedDrill', 'highPressureSteamEngine'] })) };
  state = setTile(state, T.farm1, { terrain: TerrainType.Plantation, resource: { type: ResourceType.Cotton, level: 0 } });
  const planned = scriptedPlayer(state, N1).filter(o => o.kind === 'buyTechnology');
  expect(planned).toEqual([{ kind: 'buyTechnology', nationId: N1, techId: 'cottonGin' }]);
});

function cottonSite() {
  return setTile(game(), T.farm1, { terrain: TerrainType.Plantation, resource: { type: ResourceType.Cotton, level: 0 } });
}

it('FR-527 funds one level-2 project per developer before discretionary research, including work outside collection', () => {
  const base = cottonSite();
  const cotton = { ...base, map: { ...base.map, tiles: base.map.tiles.map(row => row.map(tile =>
    tile.ownerNationId === N1 && tile.id !== T.farm1 ? { ...tile, resource: undefined } : tile)) } };
  const buys = (s: GameState, cash: number) => scriptedPlayer(setTreasury(s, N1, cash), N1)
    .filter(o => o.kind === 'buyTechnology').map(o => o.techId);
  const reserve = cashReserve(cotton, N1);
  expect(buys(cotton, reserve + 1000)).toEqual(['cottonGin']);
  const orchard = { terrain: TerrainType.Orchard, resource: { type: ResourceType.Fruit, level: 1 } };
  const one = setTile(cotton, T.orchard1, orchard);
  expect(buys(one, reserve + 1000 + 899)).toEqual([]);
  const two = setTile(one, T.homeOrchard1, orchard);
  expect(buys(two, reserve + 1000 + 900)).toEqual(['cottonGin']);
});

function purchases(state: GameState, reserve = 2500) {
  const ids: string[] = [];
  planTechnology(state, N1, reserve, order => {
    if (order.kind === 'buyTechnology') ids.push(order.techId);
    return true;
  });
  return ids;
}

it('FR-527 preserves the reserve exactly and refuses a second purchase on this turn', () => {
  const s = cottonSite();
  expect(purchases(setTreasury(s, N1, 3499))).toEqual([]);
  expect(purchases(setTreasury(s, N1, 3500))).toEqual(['cottonGin']);
  expect(purchases({ ...s, nations: s.nations.map(n => ({ ...n, pendingTechnologies: ['feedGrasses'] })) })).toEqual([]);
});

it('FR-527 excludes an uncollected site, an undiscovered resource, and a job that cannot finish after unlocking', () => {
  const s = cottonSite();
  const uncollected = setTile(setTile(s, T.farm1, { resource: undefined }), T.orchard1,
    { terrain: TerrainType.Plantation, resource: { type: ResourceType.Cotton, level: 0 } });
  expect(purchases(uncollected)).toEqual([]);
  expect(purchases(setTile(s, T.farm1, { resource: { type: ResourceType.Cotton, level: 0, discovered: false } }))).toEqual([]);
  expect(purchases({ ...s, turnLimit: 3 })).toEqual([]);
  expect(purchases({ ...s, turnLimit: 4 })).toEqual(['cottonGin']);
});

it('FR-527 counts a farmer whose current job finishes before the new technology can be used', () => {
  const id = workerId(N1, WorkerType.Farmer);
  let s = put(cottonSite(), id, T.homeOrchard1, { status: WorkerStatus.Working });
  s = setTile({ ...s, turn: 3 }, T.homeOrchard1, {
    developmentJob: { workerId: id, workerType: WorkerType.Farmer, targetLevel: 2, startedOnTurn: 1, durationTurns: 3 },
  });
  expect(purchases(s)).toEqual(['cottonGin']);
});

function competingFarms() {
  let state = setTreasury(game(), N1, 25000);
  state = { ...state, turn: 7, map: { ...state.map, tiles: state.map.tiles.map(row =>
    row.map(tile => tile.ownerNationId === N1 ? { ...tile, resource: undefined } : tile)) } };
  state = setTile(state, T.farm1, { terrain: TerrainType.Farm, resource: { type: ResourceType.Grain, level: 1 } });
  state = setTile(state, T.homeOrchard1, { terrain: TerrainType.Orchard, resource: { type: ResourceType.Fruit, level: 0 } });
  return state;
}

it('FR-527 can invest in a collected level-2 unlock while a cheaper level-1 job is available to the same farmer', () => {
  const state = competingFarms();
  expect(purchases(state)).toEqual(['steelAndIronPlows']);
  expect(purchases(setTile(state, T.homeOrchard1, { resource: { type: ResourceType.Fruit, level: 3 } }))).toEqual(['steelAndIronPlows']);
});

it.each([false, true])('FR-131 FR-527 avoids a level-2 investment when the sole farmer must spend its remaining time on a cheaper job (already busy: %s)', busy => {
  let state: GameState = { ...competingFarms(), turn: 37, turnLimit: 40 };
  if (busy) {
    const id = workerId(N1, WorkerType.Farmer);
    state = setTile(put(state, id, T.orchard1, { status: WorkerStatus.Working }), T.orchard1, {
      resource: { type: ResourceType.Fruit, level: 1 },
      developmentJob: { workerId: id, workerType: WorkerType.Farmer, targetLevel: 2, startedOnTurn: 35, durationTurns: 3 },
    });
  }
  const result = finishGame(state);
  expect(tileAt(result.state, T.homeOrchard1).resource?.level).toBe(1);
  expect(tileAt(result.state, T.farm1).resource?.level).toBe(1);
  expect(result.purchases).not.toContain('steelAndIronPlows');
});

function finishGame(state: GameState) {
  const purchases: string[] = [];
  while (!state.gameOver) {
    const orders = scriptedPlayer(state, N1);
    for (const order of orders) if (order.kind === 'buyTechnology') purchases.push(order.techId);
    state = resolveTurn(state, { [N1]: orders }).state;
  }
  return { state, purchases };
}

it('FR-123 FR-527 respects the stable site order when two equally priced jobs compete for the last farmer slot', () => {
  let state = setTile(competingFarms(), T.farm1, { resource: { type: ResourceType.Grain, level: 0 } });
  state = setTile(state, T.homeOrchard1, { terrain: TerrainType.Plantation, resource: { type: ResourceType.Cotton, level: 0 } });
  const result = finishGame({ ...state, turn: 37, turnLimit: 40 });
  expect(tileAt(result.state, T.farm1).resource?.level).toBe(1);
  expect(tileAt(result.state, T.homeOrchard1).resource?.level).toBe(0);
  expect(result.purchases).not.toContain('cottonGin');
});

it('FR-213 FR-527 the associated development order must fit above protected army upkeep after research', () => {
  let state = continent();
  const farm = state.map.tiles.flat().find(t => t.ownerNationId === N1 && t.resource?.type === ResourceType.Grain
    && collectingHub(state, N1, t.id))!;
  state = { ...state, turn: 37, turnLimit: 40, map: { ...state.map, tiles: state.map.tiles.map(row =>
    row.map(tile => tile.ownerNationId === N1 ? { ...tile, resource: undefined } : tile)) } };
  state = setTile(state, farm.id, { terrain: TerrainType.Farm, resource: { type: ResourceType.Grain, level: 1 } });
  state = emptyWarehouse(addRegiments(state, N1, SW1, Array(40).fill('regulars')), N1, {});
  const floor = upkeepReserve(state, N1);
  expect(floor).toBe(4400);
  state = setTreasury(state, N1, floor + 3000);
  expect(purchases(state, floor)).not.toContain('steelAndIronPlows');
  const result = finishGame(state);
  expect(result.purchases).not.toContain('steelAndIronPlows');
});

it('FR-527 uses the scheduled finish of a busy farmer and the remaining time for the collected job', () => {
  const id = workerId(N1, WorkerType.Farmer);
  const occupied = put(cottonSite(), id, T.homeOrchard1, { status: WorkerStatus.Working });
  const s = setTile({ ...occupied, turn: 3 }, T.homeOrchard1, {
    developmentJob: { workerId: id, workerType: WorkerType.Farmer, targetLevel: 2, startedOnTurn: 3, durationTurns: 3 },
  });
  expect(purchases({ ...s, turnLimit: 7 })).toEqual(['feedGrasses']);
  expect(purchases({ ...s, turnLimit: 8 })).toEqual(['cottonGin']);
});

it('FR-099 FR-527 the registry leaves the human seat alone and an explicitly scripted turn can buy its real unlock', () => {
  const initial = cottonSite();
  const s: GameState = { ...initial, nations: initial.nations.map(n =>
    n.id === N1 ? { ...n, controller: 'human' } : n) };
  expect(computerOrders(s)).not.toHaveProperty(N1);
  expect(scriptedPlayer(s, N1).filter(o => o.kind === 'buyTechnology')).toEqual([
    { kind: 'buyTechnology', nationId: N1, techId: 'cottonGin' },
  ]);
});
