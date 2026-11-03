import { describe, it, expect } from 'vitest';
import { applyOrder, tryApplyOrder } from '@/engine/orders/apply';
import { Order } from '@/engine/orders/Order';
import { GameState } from '@/types/GameState';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { CONSTRUCTION_COST, DEVELOPMENT_COST, PROSPECT_COST } from '@/definisions/workPrices';
import { deepFreeze, game, locate, N1, N2, put, setTile, setTreasury, setWarehouse, T, tileAt, treasury, workerId } from './fixtures';

const W = {
  prospector: workerId(N1, WorkerType.Prospector),
  farmer: workerId(N1, WorkerType.Farmer),
  engineer: workerId(N1, WorkerType.Engineer),
};
const START = 1000; // nation-1 treasury in the fixture

/** Applies and also checks purity: the frozen input must stay unchanged (FR-013). */
function run(state: GameState, order: Order): GameState {
  const frozen = deepFreeze(state);
  const snapshot = structuredClone(frozen);
  const next = applyOrder(frozen, order);
  expect(frozen).toEqual(snapshot);
  return next;
}

describe('applyOrder immediate effects', () => {
  it('FR-005 moveWorker moves the worker and marks it moved', () => {
    const s = run(game(), { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });

    const { worker, tile } = locate(s, W.farmer)!;
    expect(tile.id).toBe(T.farm1);
    expect(worker).toMatchObject({ status: WorkerStatus.Moved, justMoved: true, previousTileId: T.capital1, assignedTileId: T.farm1 });
    expect(tileAt(s, T.capital1).workers.some(w => w.id === W.farmer)).toBe(false);
    expect(treasury(s, N1)).toBe(START);
  });

  it('FR-005 FR-008 moveAndBuildRail moves the engineer, starts rail and charges once', () => {
    const s = run(game(), { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 });

    const { worker, tile } = locate(s, W.engineer)!;
    expect(tile.id).toBe(T.farm1);
    expect(worker).toMatchObject({ status: WorkerStatus.Working, justMoved: true, previousTileId: T.capital1 });
    expect(tile.constructionJob).toEqual({ workerId: W.engineer, kind: 'rail', startedOnTurn: 1, durationTurns: 1 });
    expect(treasury(s, N1)).toBe(START - CONSTRUCTION_COST.rail);
  });

  it('FR-005 startProspecting starts the job and charges', () => {
    const s = run(put(game(), W.prospector, T.mountains1), { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 });

    expect(tileAt(s, T.mountains1).prospecting).toEqual({ startedOnTurn: 1, workerId: W.prospector });
    expect(locate(s, W.prospector)!.worker).toMatchObject({ status: WorkerStatus.Working });
    expect(treasury(s, N1)).toBe(START - PROSPECT_COST);
  });

  it('FR-005 startDevelopment starts the next level and charges its price', () => {
    const s = run(put(game(), W.farmer, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 });

    expect(tileAt(s, T.farm1).developmentJob).toEqual({ workerId: W.farmer, workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: 1, durationTurns: 2 });
    expect(locate(s, W.farmer)!.worker).toMatchObject({ status: WorkerStatus.Working });
    expect(treasury(s, N1)).toBe(START - DEVELOPMENT_COST[1]);
  });

  it('FR-005 startConstruction builds the named structure and charges its price', () => {
    const s = run(game(), { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.capital1, structure: 'fort' });

    expect(tileAt(s, T.capital1).constructionJob).toEqual({ workerId: W.engineer, kind: 'fort', startedOnTurn: 1, durationTurns: 4 });
    expect(locate(s, W.engineer)!.worker).toMatchObject({ status: WorkerStatus.Working });
    expect(treasury(s, N1)).toBe(START - CONSTRUCTION_COST.fort);
  });

  it('FR-005 FR-007 moveAndStartProspecting moves, starts the job for that worker only and charges once', () => {
    const s = run(game(), { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 });

    const { worker, tile } = locate(s, W.prospector)!;
    expect(tile.id).toBe(T.mountains1);
    expect(worker).toMatchObject({ status: WorkerStatus.Working, justMoved: true, previousTileId: T.capital1 });
    expect(tile.prospecting?.workerId).toBe(W.prospector);
    expect(treasury(s, N1)).toBe(START - PROSPECT_COST);
  });

  it('FR-005 FR-007 moveAndStartDevelopment moves and starts development', () => {
    const s = run(game(), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });

    const { worker, tile } = locate(s, W.farmer)!;
    expect(tile.id).toBe(T.farm1);
    expect(worker.status).toBe(WorkerStatus.Working);
    expect(tile.developmentJob?.workerId).toBe(W.farmer);
    expect(treasury(s, N1)).toBe(START - DEVELOPMENT_COST[1]);
  });

  it('FR-005 FR-007 FR-009 moveAndStartConstruction keeps the chosen kind and charges its price', () => {
    const s = run(game(), { kind: 'moveAndStartConstruction', nationId: N1, workerId: W.engineer, toTileId: T.coastFarm1, structure: 'port' });

    expect(tileAt(s, T.coastFarm1).constructionJob).toMatchObject({ workerId: W.engineer, kind: 'port' });
    expect(locate(s, W.engineer)!.tile.id).toBe(T.coastFarm1);
    expect(treasury(s, N1)).toBe(START - CONSTRUCTION_COST.port);
  });

  it('FR-005 cancelWorkerAction undoes this turn\'s move', () => {
    const movedState = applyOrder(game(), { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });

    const s = run(movedState, { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 });

    const { worker, tile } = locate(s, W.farmer)!;
    expect(tile.id).toBe(T.capital1);
    expect(worker).toMatchObject({ status: WorkerStatus.Available, justMoved: false, previousTileId: undefined, assignedTileId: T.capital1 });
  });

  it('FR-005 cancelWorkerAction stops a job without a refund', () => {
    const started = applyOrder(put(game(), W.farmer, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 });

    const s = run(started, { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 });

    expect(tileAt(s, T.farm1).developmentJob).toBeUndefined();
    expect(locate(s, W.farmer)!.worker).toMatchObject({ status: WorkerStatus.Available });
    expect(treasury(s, N1)).toBe(START - DEVELOPMENT_COST[1]);
  });

  it('FR-006 cancelling a move-and-start job leaves the worker moved: no second move this turn', () => {
    const started = applyOrder(game(), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });

    const cancelled = run(started, { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 });

    expect(locate(cancelled, W.farmer)!.worker).toMatchObject({ status: WorkerStatus.Moved, justMoved: true, previousTileId: T.capital1 });
    expect(tryApplyOrder(cancelled, { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.range1 }).result).toEqual({ ok: false, reason: 'worker-moved' });
    const home = applyOrder(cancelled, { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 });
    expect(locate(home, W.farmer)!.tile.id).toBe(T.capital1);
  });

  it('FR-005 FR-010 setTransportAllocations replaces only that nation\'s plan', () => {
    const before = { ...game(), transportAllocationsByNation: { [N2]: { timber: 1 } } };

    const s = run(before, { kind: 'setTransportAllocations', nationId: N1, allocations: { grain: 3 } });

    expect(s.transportAllocationsByNation).toEqual({ [N1]: { grain: 3 }, [N2]: { timber: 1 } });
  });

  it('FR-005 FR-010 changeTransportCapacity buys with coal and iron and queues the increase', () => {
    const s = run(setWarehouse(game(), N1, { coal: 5, ironOre: 3 }), { kind: 'changeTransportCapacity', nationId: N1, delta: 2 });

    const n = s.nations.find(x => x.id === N1)!;
    expect(n.warehouse.coal).toBe(3);
    expect(n.warehouse.ironOre).toBe(1);
    expect(n.transportCapacityPendingIncrease).toBe(2);
    expect(n.transportCapacity).toBe(10);
  });

  it('FR-005 FR-010 changeTransportCapacity with a negative delta refunds the queued purchase', () => {
    const bought = applyOrder(setWarehouse(game(), N1, { coal: 2, ironOre: 2 }), { kind: 'changeTransportCapacity', nationId: N1, delta: 2 });

    const s = run(bought, { kind: 'changeTransportCapacity', nationId: N1, delta: -1 });

    const n = s.nations.find(x => x.id === N1)!;
    expect(n.warehouse.coal).toBe(1);
    expect(n.warehouse.ironOre).toBe(1);
    expect(n.transportCapacityPendingIncrease).toBe(1);
  });
});

describe('applyOrder refusals', () => {
  it.each<[string, (s: GameState) => GameState, Order]>([
    ['an unaffordable move-and-start', s => setTreasury(s, N1, 0), { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 }],
    ['a move by a working worker', s => setTile(put(s, W.farmer, T.farm1, { status: WorkerStatus.Working }), T.farm1, { developmentJob: { workerId: W.farmer, workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: 1, durationTurns: 2 } }), { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.range1 }],
    ['an inland port', s => s, { kind: 'moveAndStartConstruction', nationId: N1, workerId: W.engineer, toTileId: T.dryPlains1, structure: 'port' }],
  ])('FR-005 %s returns the very same state object', (_name, setup, order) => {
    const state = deepFreeze(setup(game()));

    expect(applyOrder(state, order)).toBe(state);
    expect(tryApplyOrder(state, order).result.ok).toBe(false);
  });
});
