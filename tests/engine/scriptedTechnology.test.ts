import { expect, it } from 'vitest';
import { computerOrders } from '@/engine/ai/players';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import type { GameState } from '@/types/GameState';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { planTechnology } from '@/engine/ai/scriptedTechnology';
import { TerrainType } from '@/types/Tile';
import { ResourceType } from '@/types/Resource';
import { game, N1, put, setTile, setTreasury, T, workerId } from './fixtures';

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

it('FR-527 can invest in a collected level-2 unlock while a cheaper level-1 job is available to the same farmer', () => {
  let state = setTreasury(game(), N1, 25000);
  state = { ...state, turn: 7, map: { ...state.map, tiles: state.map.tiles.map(row =>
    row.map(tile => tile.ownerNationId === N1 ? { ...tile, resource: undefined } : tile)) } };
  state = setTile(state, T.farm1, { terrain: TerrainType.Farm, resource: { type: ResourceType.Grain, level: 1 } });
  state = setTile(state, T.homeOrchard1, { terrain: TerrainType.Orchard, resource: { type: ResourceType.Fruit, level: 0 } });
  expect(purchases(state)).toEqual(['steelAndIronPlows']);
  expect(purchases(setTile(state, T.homeOrchard1, { resource: { type: ResourceType.Fruit, level: 3 } }))).toEqual(['steelAndIronPlows']);
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
