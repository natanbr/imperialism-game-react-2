// FR-024: display text for the HUD's news and refusals, derived from engine data.
import { describe, it, expect } from 'vitest';
import { completedTileIds, eventText, refusalText, REFUSAL_TEXT, workerJobLabel } from '@/components/gameText';
import { resolveTurn, tryApplyOrder, type Order, type RejectReason } from '@/engine';
import { GameState } from '@/types/GameState';
import { MaterialType, ResourceType } from '@/types/Resource';
import { WorkerType } from '@/types/Workers';
import { game, locate, N1, put, T, workerId } from '../engine/fixtures';

const ALL_REASONS: RejectReason[] = [
  'unknown-nation', 'unknown-worker', 'not-owner', 'wrong-worker-type', 'worker-busy', 'worker-moved',
  'invalid-target', 'tile-occupied', 'invalid-site', 'insufficient-funds', 'insufficient-resources', 'insufficient-labour',
  'limit-reached', 'invalid-amount',
];

const prospect: Order = { kind: 'moveAndStartProspecting', nationId: 'nation-1', workerId: 'w', toTileId: '3-4' };

describe('FR-024 refusal text', () => {
  it('every refusal reason has plain words', () => {
    for (const reason of ALL_REASONS) expect(REFUSAL_TEXT[reason]).toMatch(/\w/);
  });

  it('names the order and the reason', () => {
    expect(refusalText({ order: prospect, reason: 'insufficient-funds' })).toBe('Move and prospect refused: not enough money.');
  });
});

describe('FR-024 turn event text', () => {
  it('says what happened where', () => {
    expect(eventText({ type: 'resource-discovered', tileId: '3-4', nationId: 'nation-1', resource: ResourceType.Coal })).toBe(
      'Prospectors found coal at 3-4.'
    );
    expect(eventText({ type: 'resource-discovered', tileId: '3-4' })).toBe('Prospectors found nothing at 3-4.');
    expect(eventText({ type: 'development-completed', tileId: '2-1', level: 2 })).toBe('Tile 2-1 developed to level 2.');
    expect(eventText({ type: 'construction-completed', tileId: '1-4', structure: 'depot' })).toBe('Depot finished at 1-4.');
    expect(eventText({ type: 'order-rejected', nationId: 'nation-1', order: prospect, reason: 'worker-moved' })).toBe(
      'Move and prospect refused: the worker already moved this turn.'
    );
  });

  it('the end of the turn is not news', () => {
    expect(eventText({ type: 'turn-ended', turn: 2, year: 1900 })).toBeNull();
  });

  it('FR-037 to FR-042 industry, food and workforce events read as news; a good meal is not news', () => {
    const N = 'nation-1';
    expect(eventText({ type: 'goods-produced', nationId: N, output: MaterialType.CannedFood, amount: 2 })).toBe('Produced 2 cannedFood.');
    expect(eventText({ type: 'freight-cars-built', nationId: N, count: 1 })).toBe('1 freight car built.');
    expect(eventText({ type: 'building-expanded', nationId: N, building: 'steelMill', capacity: 4 })).toBe('Steel mill expanded to 4.');
    expect(eventText({ type: 'workers-trained', nationId: N, to: 'expert', count: 2 })).toBe('2 workers trained to expert.');
    expect(eventText({ type: 'workers-recruited', nationId: N, count: 1 })).toBe('1 migrant joined the workforce.');
    expect(eventText({ type: 'workers-fed', nationId: N, fed: 7, sick: 0, starved: 0 })).toBeNull();
    expect(eventText({ type: 'workers-fed', nationId: N, fed: 3, sick: 2, starved: 1 })).toBe(
      '2 workers ate the wrong food and fell sick; 1 worker starved.'
    );
  });
});

// The job text the engine used to store on the worker (part A asserted it in apply.test.ts and
// resolveTurn.test.ts); it is now derived for display from the tile and the worker's status.
describe('FR-024 worker job label', () => {
  const W = {
    farmer: workerId(N1, WorkerType.Farmer),
    rancher: workerId(N1, WorkerType.Rancher),
    prospector: workerId(N1, WorkerType.Prospector),
    engineer: workerId(N1, WorkerType.Engineer),
  };
  const label = (state: GameState, id: string) => {
    const { tile, worker } = locate(state, id)!;
    return workerJobLabel(tile, worker);
  };
  const order = (state: GameState, o: Order) => {
    const { state: next, result } = tryApplyOrder(state, o);
    expect(result).toEqual({ ok: true });
    return next;
  };

  it('names each job from the tile the worker works on', () => {
    expect(label(order(game(), { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }), W.engineer)).toBe('Constructing rail');
    expect(label(order(put(game(), W.prospector, T.mountains1), { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }), W.prospector)).toBe('Prospecting');
    expect(label(order(put(game(), W.farmer, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 }), W.farmer)).toBe('Farming to level 1');
    expect(label(order(game(), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.rancher, toTileId: T.range1 }), W.rancher)).toBe('Ranching to level 1');
    expect(label(order(put(game(), W.engineer, T.orchard1), { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.orchard1, structure: 'fort' }), W.engineer)).toBe('Constructing fort');
    expect(label(order(put(game(), W.engineer, T.orchard1), { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.orchard1, structure: 'depot' }), W.engineer)).toBe('Constructing depot');
  });

  it('a moved worker reads Moved, an idle one has no label', () => {
    expect(label(order(game(), { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm1 }), W.farmer)).toBe('Moved');
    expect(label(game(), W.farmer)).toBeUndefined();
  });

  it('a cancelled job leaves no label, or Moved when the worker moved this turn', () => {
    const started = order(put(game(), W.farmer, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 });
    expect(label(order(started, { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 }), W.farmer)).toBeUndefined();

    const movedAndStarted = order(game(), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });
    expect(label(order(movedAndStarted, { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 }), W.farmer)).toBe('Moved');
  });

  it('after the turn: a moved worker has no label, a working one keeps its job text', () => {
    let state = order(game(), { kind: 'moveWorker', nationId: N1, workerId: W.engineer, toTileId: T.orchard1 });
    state = order(state, { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });

    const s = resolveTurn(state, {}, 1).state;

    expect(label(s, W.engineer)).toBeUndefined();
    expect(label(s, W.farmer)).toBe('Farming to level 1');
  });

  it('workers carry no stored job text', () => {
    const s = order(game(), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });
    expect(locate(s, W.farmer)!.worker).not.toHaveProperty('jobDescription');
    expect(locate(resolveTurn(s, {}, 1).state, W.farmer)!.worker).not.toHaveProperty('jobDescription');
  });
});

describe('FR-032 the map marks the tiles whose job finished last turn', () => {
  it('FR-032 reads the completion events, not job flags', () => {
    const ids = completedTileIds([
      { type: 'development-completed', tileId: '2-1', nationId: N1, level: 1 },
      { type: 'construction-completed', tileId: '3-1', nationId: N1, structure: 'depot' },
      { type: 'resource-discovered', tileId: '0-1', nationId: N1 },
      { type: 'turn-ended', turn: 2, year: 1815 },
    ]);
    expect([...ids].sort()).toEqual(['2-1', '3-1']);
  });
});
