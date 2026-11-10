// M4.1 (NR-019): civilians share tiles, one job per tile, where civilians appear.
// FR-112 moves onto a tile with other civilians, FR-113 one job per tile (`tile-has-job`), FR-114 the
// start civilians on the capital and no civilian from recruiting or training.
import { describe, it, expect } from 'vitest';
import { validateOrder } from '@/engine/orders/validate';
import { applyOrder } from '@/engine/orders/apply';
import type { Order, RejectReason } from '@/engine/orders/Order';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { START_CIVILIANS } from '@/engine/world/startWorld';
import { getFarmerActions } from '@/workers/FarmerWorker';
import { getEngineerActions } from '@/workers/EngineerWorker';
import { getProspectorActions } from '@/workers/ProspectorWorker';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { deepFreeze, game, locate, N1, put, setTile, setWarehouse, T, tileAt, workerId } from './fixtures';

const W = {
  prospector: workerId(N1, WorkerType.Prospector),
  farmer: workerId(N1, WorkerType.Farmer),
  rancher: workerId(N1, WorkerType.Rancher),
  miner: workerId(N1, WorkerType.Miner),
  engineer: workerId(N1, WorkerType.Engineer),
};

const working = { status: WorkerStatus.Working };
/** The rancher stands idle on farm1, next to the capital. */
const rancherOnFarm = (s: GameState) => put(s, W.rancher, T.farm1);
/** The farmer works a development job on farm1. */
const farmBeingDeveloped = (s: GameState) =>
  setTile(put(s, W.farmer, T.farm1, working), T.farm1, {
    developmentJob: { workerId: W.farmer, workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: 1, durationTurns: 3 },
  });
/** Someone builds a depot on orchard1. */
const depotJobOnOrchard = (s: GameState) =>
  setTile(s, T.orchard1, { constructionJob: { workerId: 'someone', kind: 'depot', startedOnTurn: 1, durationTurns: 3 } });
/** Someone prospects mountains1. */
const prospectingOnMountains = (s: GameState) => setTile(s, T.mountains1, { prospecting: { startedOnTurn: 1, workerId: 'someone' } });

interface Case {
  name: string;
  setup: (s: GameState) => GameState;
  order: Order;
  expected: 'ok' | RejectReason;
}

const cases: Case[] = [
  // FR-112: other civilians on the target never refuse a move
  { name: 'FR-112 moveWorker onto a tile where another civilian stands is ok', setup: rancherOnFarm, order: { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm1 }, expected: 'ok' },
  { name: 'FR-112 move-and-develop onto a tile where an idle civilian stands is ok', setup: rancherOnFarm, order: { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 }, expected: 'ok' },
  { name: 'FR-112 rail-on-move onto a tile where an idle civilian stands is ok', setup: rancherOnFarm, order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'ok' },
  { name: 'FR-112 a plain move onto a tile where another civilian works is ok', setup: farmBeingDeveloped, order: { kind: 'moveWorker', nationId: N1, workerId: W.rancher, toTileId: T.farm1 }, expected: 'ok' },

  // FR-113: one job per tile, whatever the job
  { name: 'FR-113 rail-on-move onto a tile with a development job', setup: farmBeingDeveloped, order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'tile-has-job' },
  { name: 'FR-113 a fort on a tile with a development job', setup: s => put(farmBeingDeveloped(s), W.engineer, T.farm1), order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.farm1, structure: 'fort' }, expected: 'tile-has-job' },
  { name: 'FR-113 developing a tile with a construction job', setup: s => setTile(depotJobOnOrchard(s), T.orchard1, { resource: { type: ResourceType.Fruit, level: 0 } }), order: { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.orchard1 }, expected: 'tile-has-job' },
  { name: 'FR-113 developing a tile that is being prospected', setup: s => setTile(prospectingOnMountains(s), T.mountains1, { resource: { type: ResourceType.IronOre, level: 0, discovered: true } }), order: { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.miner, toTileId: T.mountains1 }, expected: 'tile-has-job' },
  { name: 'FR-113 prospecting a tile with a construction job', setup: s => setTile(put(s, W.prospector, T.mountains1), T.mountains1, { constructionJob: { workerId: 'someone', kind: 'rail', startedOnTurn: 1, durationTurns: 1 } }), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'tile-has-job' },
  { name: 'FR-113 move-and-build a depot on a tile with a depot job', setup: depotJobOnOrchard, order: { kind: 'moveAndStartConstruction', nationId: N1, workerId: W.engineer, toTileId: T.orchard1, structure: 'depot' }, expected: 'tile-has-job' },
];

describe('FR-112 FR-113 stacking and one job per tile', () => {
  it.each(cases.map(c => [c.name, c] as const))('%s', (_name, c) => {
    const state = deepFreeze(c.setup(game()));
    expect(validateOrder(state, c.order)).toEqual(c.expected === 'ok' ? { ok: true } : { ok: false, reason: c.expected });
  });

  it('FR-112 FR-113 two civilians that moved onto the same tile both stand there; the second starts the job, a third job is refused', () => {
    let s = applyOrder(game(), { kind: 'moveWorker', nationId: N1, workerId: W.rancher, toTileId: T.farm1 });
    s = applyOrder(s, { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });
    expect(tileAt(s, T.farm1).workers.map(w => w.id)).toEqual([W.rancher, W.farmer]);
    expect(tileAt(s, T.farm1).developmentJob?.workerId).toBe(W.farmer);
    expect(validateOrder(s, { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 })).toEqual({ ok: false, reason: 'tile-has-job' });
  });

  it('FR-113 the map offers no job cursor on a tile where another civilian works', () => {
    const s = farmBeingDeveloped(game());
    const farm = tileAt(s, T.farm1);
    const idleFarmer = { ...locate(s, W.rancher)!.worker, type: WorkerType.Farmer };
    expect(getFarmerActions(farm, s.map, idleFarmer)).toBeNull();
    expect(getEngineerActions(farm, s.map, locate(s, W.engineer)!.worker)).toBeNull();
    const railJobOnHills = { ...tileAt(s, T.mountains1), constructionJob: { workerId: 'x', kind: 'rail' as const, startedOnTurn: 1, durationTurns: 1 } };
    expect(getProspectorActions(railJobOnHills, s.map, locate(s, W.prospector)!.worker)).toBeNull();
  });
});

describe('FR-114 where civilians appear', () => {
  it("FR-114 a new game puts each nation's seven start civilians on its capital tile, in the start order, and nowhere else", () => {
    const s = newGame({ seed: 1 });
    for (const nation of s.nations) {
      const withCivilians = s.map.tiles.flat().filter(t => t.workers.some(w => w.nationId === nation.id));
      expect(withCivilians.map(t => t.cityId)).toEqual([nation.cities[0]]);
      expect(withCivilians[0].workers.map(w => w.type)).toEqual([...START_CIVILIANS]);
      expect(withCivilians[0].workers.every(w => w.assignedTileId === withCivilians[0].id)).toBe(true);
    }
  });

  it('FR-114 recruiting migrants and training workers adds industry workers, never a civilian on the map', () => {
    let s = setWarehouse(newGame({ seed: 1 }), N1, { cannedFood: 5, clothing: 1, furniture: 1, paper: 3 });
    s = applyOrder(s, { kind: 'recruitWorkers', nationId: N1, delta: 1 });
    s = applyOrder(s, { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 });
    const civilians = (g: GameState) => g.map.tiles.flat().flatMap(t => t.workers).filter(w => w.nationId === N1).length;
    const next = resolveTurn(s, {}, 1).state;
    const { workers } = next.nations[0].industry;
    expect(workers.untrained + workers.trained + workers.expert).toBe(4 + 2 + 1 + 1);
    expect(workers.trained).toBe(3);
    expect([civilians(s), civilians(next)]).toEqual([7, 7]);
  });
});
