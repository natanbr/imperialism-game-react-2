// What a tile click asks the engine for (FR-023). The part A adapter tests for move-and-start
// and the engineer's rail-on-move (FR-006 to FR-008) moved here when the adapters went: they
// now run through the same orders and the same stop rule the UI uses.
import { describe, it, expect } from 'vitest';
import { moveOrders, submitFirstAccepted, tileClickOrders } from '@/hooks/tileClickOrders';
import { tryApplyOrder, type Order, type ValidationResult } from '@/engine';
import { GameState } from '@/types/GameState';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { CONSTRUCTION_COST, PROSPECT_COST } from '@/definisions/workPrices';
import { createTileId } from '@/utils/tileIdUtils';
import { game, locate, N1, N2, put, setTile, setTreasury, T, tileAt, treasury, workerId } from '../engine/fixtures';

const W = {
  prospector: workerId(N1, WorkerType.Prospector),
  farmer: workerId(N1, WorkerType.Farmer),
  engineer: workerId(N1, WorkerType.Engineer),
};

/** Plays a click the way the UI does: each order through validate and apply, first accepted wins. */
function click(state: GameState, orders: Order[]): GameState {
  let s = state;
  submitFirstAccepted((order) => {
    const { state: next, result } = tryApplyOrder(s, order);
    s = next;
    return result;
  }, orders);
  return s;
}

describe('FR-023 the orders a tile click tries', () => {
  it('prospect: a start on the worker\'s own tile, else move-and-start then the plain move', () => {
    const state = put(game(), W.prospector, T.mountains1);

    expect(tileClickOrders(state, N1, W.prospector, T.mountains1, { type: 'prospect' })).toEqual([
      { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 },
    ]);
    expect(tileClickOrders(game(), N1, W.prospector, T.mountains1, { type: 'prospect' })).toEqual([
      { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 },
      { kind: 'moveWorker', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 },
    ]);
  });

  it('develop: a start on the own tile, else move-and-start then the plain move', () => {
    const action = { type: 'develop', workerType: WorkerType.Farmer, level: 1 } as const;

    expect(tileClickOrders(put(game(), W.farmer, T.farm1), N1, W.farmer, T.farm1, action)).toEqual([
      { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 },
    ]);
    expect(tileClickOrders(game(), N1, W.farmer, T.farm1, action)).toEqual([
      { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 },
      { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm1 },
    ]);
  });

  it('construct: the chosen structure on the own tile, else move-and-build then the plain move', () => {
    const fort = { type: 'construct', kind: 'fort' } as const;

    expect(tileClickOrders(game(), N1, W.engineer, T.capital1, fort)).toEqual([
      { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.capital1, structure: 'fort' },
    ]);
    expect(tileClickOrders(game(), N1, W.engineer, T.town1, fort)).toEqual([
      { kind: 'moveAndStartConstruction', nationId: N1, workerId: W.engineer, toTileId: T.town1, structure: 'fort' },
      { kind: 'moveWorker', nationId: N1, workerId: W.engineer, toTileId: T.town1 },
    ]);
  });

  it('no action, or the construction dialog on another tile, is a move', () => {
    expect(tileClickOrders(game(), N1, W.farmer, T.orchard1, null)).toEqual(moveOrders(game(), N1, W.farmer, T.orchard1));
    expect(tileClickOrders(game(), N1, W.engineer, T.farm1, { type: 'open-construct-modal' })).toEqual(
      moveOrders(game(), N1, W.engineer, T.farm1)
    );
    expect(moveOrders(game(), N1, W.farmer, T.orchard1)).toEqual([
      { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.orchard1 },
    ]);
  });

  it('an engineer moving next to its rail network tries rail-on-move first', () => {
    expect(moveOrders(game(), N1, W.engineer, T.farm1)).toEqual([
      { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 },
      { kind: 'moveWorker', nationId: N1, workerId: W.engineer, toTileId: T.farm1 },
    ]);
    // Not adjacent to the capital: a plain move only.
    expect(moveOrders(game(), N1, W.engineer, T.orchard1)).toEqual([
      { kind: 'moveWorker', nationId: N1, workerId: W.engineer, toTileId: T.orchard1 },
    ]);
  });

  it('every order carries the active nation, so another nation\'s worker is refused as not-owner', () => {
    const foreignFarmer = workerId(N2, WorkerType.Farmer);
    const orders = tileClickOrders(game(), N1, foreignFarmer, T.farm2, null);

    expect(orders.every(o => o.nationId === N1)).toBe(true);
    const state = game();
    expect(click(state, orders)).toBe(state);
  });

  it('an unknown worker asks for nothing', () => {
    expect(tileClickOrders(game(), N1, 'nobody', T.farm1, { type: 'prospect' })).toEqual([]);
    expect(moveOrders(game(), N1, 'nobody', T.farm1)).toEqual([]);
  });
});

describe('FR-023 submitFirstAccepted stops at the first accepted order or at insufficient-funds', () => {
  const a: Order = { kind: 'moveWorker', nationId: N1, workerId: 'a', toTileId: T.farm1 };
  const b: Order = { kind: 'moveWorker', nationId: N1, workerId: 'b', toTileId: T.farm1 };
  const run = (results: ValidationResult[]) => {
    const tried: Order[] = [];
    const last = submitFirstAccepted((order) => {
      tried.push(order);
      return results[tried.length - 1];
    }, [a, b]);
    return { tried, last };
  };

  it('stops at the first accepted order', () => {
    expect(run([{ ok: true }, { ok: true }])).toEqual({ tried: [a], last: { ok: true } });
  });

  it('stops when money is short: an unaffordable job never turns into a plain move', () => {
    expect(run([{ ok: false, reason: 'insufficient-funds' }, { ok: true }])).toEqual({
      tried: [a],
      last: { ok: false, reason: 'insufficient-funds' },
    });
  });

  it('tries the next order after any other refusal and returns the last result', () => {
    expect(run([{ ok: false, reason: 'invalid-site' }, { ok: true }])).toEqual({ tried: [a, b], last: { ok: true } });
    expect(run([{ ok: false, reason: 'invalid-site' }, { ok: false, reason: 'worker-moved' }]).last).toEqual({
      ok: false,
      reason: 'worker-moved',
    });
  });

  it('returns nothing for no orders', () => {
    expect(submitFirstAccepted(() => ({ ok: true }), [])).toBeUndefined();
  });
});

describe('move-and-start from a click (moved from the part A adapter tests)', () => {
  it('FR-006 refuses to pull a working farmer off its job', () => {
    let state = put(game(), W.farmer, T.farm1, { status: WorkerStatus.Working });
    state = setTile(state, T.farm1, { developmentJob: { workerId: W.farmer, workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: 1, durationTurns: 2 } });
    const develop = { type: 'develop', workerType: WorkerType.Farmer, level: 1 } as const;

    const s2 = click(state, tileClickOrders(state, N1, W.farmer, T.range1 /* wrong terrain for the job, so the old fallback moved it */, develop));
    const s3 = click(state, tileClickOrders(state, N1, W.farmer, createTileId(0, 0) /* another farm */, develop));

    expect(s2).toBe(state);
    expect(s3).toBe(state);
    expect(locate(s3, W.farmer)!.tile.id).toBe(T.farm1);
  });

  it('FR-006 refuses a second move by a prospector that already moved this turn', () => {
    const moved = click(game(), moveOrders(game(), N1, W.prospector, T.farm1));
    expect(locate(moved, W.prospector)!.tile.id).toBe(T.farm1);

    const s2 = click(moved, tileClickOrders(moved, N1, W.prospector, T.mountains1, { type: 'prospect' }));

    expect(s2).toBe(moved);
    expect(treasury(s2, N1)).toBe(10000);
  });

  it('FR-007 an unaffordable move-and-start is refused as a whole: no move, no charge', () => {
    const state = setTreasury(game(), N1, PROSPECT_COST - 1);

    expect(click(state, tileClickOrders(state, N1, W.prospector, T.mountains1, { type: 'prospect' }))).toBe(state);
  });

  it('FR-006 when only the job is refused, the worker moves and counts as moved', () => {
    const orchard1 = createTileId(1, 2); // not prospectable, so only the job is refused
    const s2 = click(game(), tileClickOrders(game(), N1, W.prospector, orchard1, { type: 'prospect' }));

    const { worker, tile } = locate(s2, W.prospector)!;
    expect(tile.id).toBe(orchard1);
    expect(worker).toMatchObject({ status: WorkerStatus.Moved, justMoved: true });
    expect(click(s2, moveOrders(s2, N1, W.prospector, T.farm1))).toBe(s2);
  });
});

describe('engineer rail-on-move from a click (moved from the part A adapter tests)', () => {
  const moveEngineer = (state: GameState, toTileId: string) => click(state, moveOrders(state, N1, W.engineer, toTileId));

  it('FR-006 FR-008 an engineer that already moved does not build rail or move again', () => {
    const state = put(game(), W.engineer, T.capital1, { status: WorkerStatus.Moved, justMoved: true, previousTileId: T.orchard1 });

    const s2 = moveEngineer(state, T.farm1);

    expect(tileAt(s2, T.farm1).constructionJob).toBeUndefined();
    expect(locate(s2, W.engineer)!.tile.id).toBe(T.capital1);
    expect(treasury(s2, N1)).toBe(10000);
  });

  it('FR-006 FR-008 a working engineer is not pulled off its job', () => {
    let state = put(game(), W.engineer, T.capital1, { status: WorkerStatus.Working });
    state = setTile(state, T.capital1, { constructionJob: { workerId: W.engineer, kind: 'depot', startedOnTurn: 1, durationTurns: 2 } });

    const s2 = moveEngineer(state, T.farm1);

    expect(tileAt(s2, T.capital1).constructionJob?.workerId).toBe(W.engineer);
    expect(locate(s2, W.engineer)!.tile.id).toBe(T.capital1);
    expect(tileAt(s2, T.farm1).constructionJob).toBeUndefined();
  });

  it('FR-008 does not overwrite an unfinished construction job on the target', () => {
    const job = { workerId: 'someone-else', kind: 'depot' as const, startedOnTurn: 1, durationTurns: 2 };
    const state = setTile(game(), T.farm1, { constructionJob: job });

    const s2 = moveEngineer(state, T.farm1);

    expect(tileAt(s2, T.farm1).constructionJob).toEqual(job);
    expect(treasury(s2, N1)).toBe(10000);
  });

  it('FR-008 builds rail and charges once for an available engineer', () => {
    const s2 = moveEngineer(game(), T.farm1);

    expect(tileAt(s2, T.farm1).constructionJob).toMatchObject({ kind: 'rail', workerId: W.engineer });
    expect(treasury(s2, N1)).toBe(10000 - CONSTRUCTION_COST.rail);
  });

  it('FR-007 FR-008 a rail the nation cannot afford refuses the whole move', () => {
    const state = setTreasury(game(), N1, CONSTRUCTION_COST.rail - 1);

    expect(moveEngineer(state, T.farm1)).toBe(state);
  });
});
