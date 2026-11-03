// Regression tests for the bugs M1 closes through validateOrder, exercised through the pre-M1
// functions the store still calls until part B (FR-017).
import { describe, it, expect } from 'vitest';
import {
  moveAndStartDevelopmentHelper,
  moveAndStartProspectingHelper,
  moveSelectedWorkerToTileHelper,
} from '@/store/helpers/workerHelpers';
import { handleEngineerMovement, startEngineerWork } from '@/workers/EngineerWorker';
import { GameState } from '@/types/GameState';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { CONSTRUCTION_COST, PROSPECT_COST } from '@/definisions/workPrices';
import { createTileId } from '@/utils/tileIdUtils';
import { game, locate, N1, put, setTile, setTreasury, T, tileAt, treasury, workerId } from './fixtures';

const W = {
  prospector: workerId(N1, WorkerType.Prospector),
  farmer: workerId(N1, WorkerType.Farmer),
  engineer: workerId(N1, WorkerType.Engineer),
};

/** What the store's moveSelectedWorkerToTile does for an engineer. */
function storeMoveEngineer(state: GameState, toTileId: string): GameState {
  const { worker, tile } = locate(state, W.engineer)!;
  return handleEngineerMovement(state, tile, tileAt(state, toTileId), worker) ?? moveSelectedWorkerToTileHelper(state, toTileId, W.engineer);
}

describe('move-and-start (moveAndStartWorkerJob replacement)', () => {
  it('FR-006 FR-017 refuses to pull a working farmer off its job', () => {
    let state = put(game(), W.farmer, T.farm1, { status: WorkerStatus.Working, jobDescription: 'Farming to level 1' });
    state = setTile(state, T.farm1, { developmentJob: { workerId: W.farmer, workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: 1, durationTurns: 2 } });

    const s2 = moveAndStartDevelopmentHelper(state, T.range1 /* wrong terrain for the job, so the old fallback moved it */, W.farmer, WorkerType.Farmer);
    const s3 = moveAndStartDevelopmentHelper(state, createTileId(0, 0) /* another farm */, W.farmer, WorkerType.Farmer);

    expect(s2).toBe(state);
    expect(s3).toBe(state);
    expect(locate(s3, W.farmer)!.tile.id).toBe(T.farm1);
  });

  it('FR-006 FR-017 refuses a second move by a prospector that already moved this turn', () => {
    const moved = moveSelectedWorkerToTileHelper(game(), T.farm1, W.prospector);
    expect(locate(moved, W.prospector)!.tile.id).toBe(T.farm1);

    const s2 = moveAndStartProspectingHelper(moved, T.mountains1, W.prospector);

    expect(s2).toBe(moved);
    expect(treasury(s2, N1)).toBe(1000);
  });

  it('FR-007 FR-017 an unaffordable move-and-start is refused as a whole by its reason code', () => {
    const state = setTreasury(game(), N1, PROSPECT_COST - 1);

    expect(moveAndStartProspectingHelper(state, T.mountains1, W.prospector)).toBe(state);
  });

  it('FR-006 FR-017 when only the job is refused, the worker moves and counts as moved', () => {
    const fertileHills1 = createTileId(1, 2); // not prospectable, so only the job is refused
    const s2 = moveAndStartProspectingHelper(game(), fertileHills1, W.prospector);

    const { worker, tile } = locate(s2, W.prospector)!;
    expect(tile.id).toBe(createTileId(1, 2));
    expect(worker).toMatchObject({ status: WorkerStatus.Moved, justMoved: true });
    expect(moveSelectedWorkerToTileHelper(s2, T.farm1, W.prospector)).toBe(s2);
  });
});

describe('handleEngineerMovement (rail-on-move)', () => {
  it('FR-006 FR-008 FR-017 an engineer that already moved does not build rail or move again', () => {
    const state = put(game(), W.engineer, T.capital1, { status: WorkerStatus.Moved, justMoved: true, previousTileId: T.orchard1 });

    const s2 = storeMoveEngineer(state, T.farm1);

    expect(tileAt(s2, T.farm1).constructionJob).toBeUndefined();
    expect(locate(s2, W.engineer)!.tile.id).toBe(T.capital1);
    expect(treasury(s2, N1)).toBe(1000);
  });

  it('FR-006 FR-008 FR-017 a working engineer is not pulled off its job', () => {
    let state = put(game(), W.engineer, T.capital1, { status: WorkerStatus.Working });
    state = setTile(state, T.capital1, { constructionJob: { workerId: W.engineer, kind: 'depot', startedOnTurn: 1, durationTurns: 2 } });

    const s2 = storeMoveEngineer(state, T.farm1);

    expect(tileAt(s2, T.capital1).constructionJob?.workerId).toBe(W.engineer);
    expect(locate(s2, W.engineer)!.tile.id).toBe(T.capital1);
    expect(tileAt(s2, T.farm1).constructionJob).toBeUndefined();
  });

  it('FR-008 FR-017 does not overwrite an unfinished construction job on the target', () => {
    const job = { workerId: 'someone-else', kind: 'depot' as const, startedOnTurn: 1, durationTurns: 2 };
    const state = setTile(game(), T.farm1, { constructionJob: job });

    const s2 = storeMoveEngineer(state, T.farm1);

    expect(tileAt(s2, T.farm1).constructionJob).toEqual(job);
    expect(treasury(s2, N1)).toBe(1000);
  });

  it('FR-008 FR-017 still builds rail and charges once for an available engineer', () => {
    const s2 = storeMoveEngineer(game(), T.farm1);

    expect(tileAt(s2, T.farm1).constructionJob).toMatchObject({ kind: 'rail', workerId: W.engineer });
    expect(treasury(s2, N1)).toBe(1000 - CONSTRUCTION_COST.rail);
  });
});

describe('startEngineerWork (automatic construction kind)', () => {
  it('FR-009 FR-017 never picks a port on an inland tile without a river', () => {
    const state = setTile(put(game(), W.engineer, T.dryPlains1), T.dryPlains1, { depot: true });

    const s2 = startEngineerWork(state, W.engineer);

    expect(tileAt(s2, T.dryPlains1).constructionJob?.kind).not.toBe('port');
    expect(tileAt(s2, T.dryPlains1).constructionJob?.kind).toBe('fort');
  });

  it('FR-009 FR-017 picks a port on a coastal tile that already has a depot', () => {
    const state = setTile(put(game(), W.engineer, T.coastFarm1), T.coastFarm1, { depot: true });

    const s2 = startEngineerWork(state, W.engineer);

    expect(tileAt(s2, T.coastFarm1).constructionJob?.kind).toBe('port');
    expect(treasury(s2, N1)).toBe(1000 - CONSTRUCTION_COST.port);
  });
});
