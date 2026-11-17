// M12b (NR-034) task T3. FR-475: the right pane's "Work in progress" group lists one row per unfinished job of the
// player (development, rail, depot, port, fort, prospecting, worker training) with its kind, tile, province where there is
// one, and turns left. `workInProgressRows` is pure; each case checks its "turns left" against the engine's own turn: a
// row that says "1 turn left" (or "at End Turn") is gone after one resolved turn, and its job is done.
import { describe, it, expect } from 'vitest';
import { resolveTurn, tryApplyOrder, type Order } from '@/engine';
import { workInProgressRows, type WorkRow } from '@/components/HUD/hudView';
import type { GameState } from '@/types/GameState';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { game, N1, N2, put, setIndustry, setTile, setWarehouse, T, tileAt, workerId, industryOf } from '../engine/fixtures';
import { continent } from '../engine/armyFixtures';

const W = {
  prospector: workerId(N1, WorkerType.Prospector),
  farmer: workerId(N1, WorkerType.Farmer),
  engineer: workerId(N1, WorkerType.Engineer),
};

/** Applies the order and fails the test when the engine refuses it. */
function apply(state: GameState, order: Order): GameState {
  const { state: after, result } = tryApplyOrder(state, order);
  if (!result.ok) throw new Error(`refused ${order.kind}: ${result.reason}`);
  return after;
}

const next = (state: GameState): GameState => resolveTurn(state, {}, state.seed).state;
const rows = (state: GameState, nationId = N1): WorkRow[] => workInProgressRows(state, nationId);
const texts = (state: GameState, nationId = N1): string[] => rows(state, nationId).map((r) => r.text);

/**
 * The row `key` says `turnsLeft`; after turnsLeft - 1 resolved turns it says "1 turn left" (or is still at End Turn), and
 * after one more it is gone. Returns the state after the last turn.
 */
function finishesAsSaid(start: GameState, key: string): GameState {
  const first = rows(start).find((r) => r.key === key);
  expect(first, key).toBeDefined();
  let s = start;
  for (let i = 1; i < first!.turnsLeft; i++) {
    s = next(s);
    const row = rows(s).find((r) => r.key === key);
    expect(row?.turnsLeft, `${key} after ${i} turns`).toBe(first!.turnsLeft - i);
  }
  expect(rows(s).find((r) => r.key === key)?.turnsLeft, key).toBe(1);
  s = next(s);
  expect(rows(s).find((r) => r.key === key), `${key} after ${first!.turnsLeft} turns`).toBeUndefined();
  return s;
}

describe('FR-475 workInProgressRows', () => {
  it('FR-475 a new game has nothing in progress', () => {
    expect(rows(game())).toEqual([]);
    expect(rows(continent())).toEqual([]);
  });

  it('FR-475 development: "Farmer: grain to level 1 at 2-1, 3 turns left", then 2, then 1, then done at level 1', () => {
    const s = apply(put(game(), W.farmer, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 });
    expect(rows(s)).toEqual([
      { key: `development:${T.farm1}`, kind: 'development', tileId: T.farm1, turnsLeft: 3, text: 'Farmer: grain to level 1 at 2-1, 3 turns left' },
    ]);
    const s1 = next(s);
    expect(texts(s1)).toEqual(['Farmer: grain to level 1 at 2-1, 2 turns left']);
    expect(texts(next(s1))).toEqual(['Farmer: grain to level 1 at 2-1, 1 turn left']);
    const done = finishesAsSaid(s, `development:${T.farm1}`);
    expect(tileAt(done, T.farm1).developmentJob).toBeUndefined();
    expect(tileAt(done, T.farm1).resource?.level).toBe(1);
  });

  it('FR-475 rail names the tile it is built from: "Engineer: rail from 1-1 to 2-1, 1 turn left", done after one turn', () => {
    const s = apply(game(), { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 });
    expect(rows(s)).toEqual([
      { key: `rail:${T.farm1}`, kind: 'rail', tileId: T.farm1, turnsLeft: 1, text: 'Engineer: rail from 1-1 to 2-1, 1 turn left' },
    ]);
    const done = finishesAsSaid(s, `rail:${T.farm1}`);
    expect(tileAt(done, T.farm1).constructionJob).toBeUndefined();
  });

  it('FR-475 depot, port and fort: 3 turns each, then built', () => {
    const cases = [
      // A depot two tiles from the capital (FR-030: none next to another depot)
      { structure: 'depot', tileId: T.orchard1, built: (s: GameState) => tileAt(s, T.orchard1).depot === true },
      { structure: 'port', tileId: T.coastFarm1, built: (s: GameState) => tileAt(s, T.coastFarm1).port === true },
      { structure: 'fort', tileId: T.farm1, built: (s: GameState) => (tileAt(s, T.farm1).fortLevel ?? 0) >= 1 },
    ] as const;
    for (const { structure, tileId, built } of cases) {
      const s = apply(put(game(), W.engineer, tileId), { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId, structure });
      expect(texts(s), structure).toEqual([`Engineer: ${structure} at ${tileId}, 3 turns left`]);
      expect(rows(s)[0], structure).toMatchObject({ key: `${structure}:${tileId}`, kind: structure, tileId, turnsLeft: 3 });
      const done = finishesAsSaid(s, `${structure}:${tileId}`);
      expect(built(done), structure).toBe(true);
    }
  });

  it('FR-475 prospecting "finds out at End Turn": gone after one turn, the resource known', () => {
    const s = apply(put(game(), W.prospector, T.mountains1), { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 });
    expect(rows(s)).toEqual([
      { key: `prospecting:${T.mountains1}`, kind: 'prospecting', tileId: T.mountains1, turnsLeft: 1, text: 'Prospector: prospecting at 0-1, finds out at End Turn' },
    ]);
    const done = finishesAsSaid(s, `prospecting:${T.mountains1}`);
    expect(tileAt(done, T.mountains1).prospecting).toBeUndefined();
    expect(tileAt(done, T.mountains1).resource?.discovered).toBe(true);
  });

  it('FR-475 worker training has no tile: "Training: 1 untrained worker to trained, done at End Turn"; promoted after one turn', () => {
    let s = setWarehouse(game(), N1, { paper: 10 });
    s = setIndustry(s, N1, { workers: { untrained: 3, trained: 2, expert: 0 } });
    s = apply(s, { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 });
    s = apply(s, { kind: 'trainWorkers', nationId: N1, from: 'trained', delta: 2 });
    expect(rows(s)).toEqual([
      { key: 'training:untrained', kind: 'training', turnsLeft: 1, text: 'Training: 1 untrained worker to trained, done at End Turn' },
      { key: 'training:trained', kind: 'training', turnsLeft: 1, text: 'Training: 2 trained workers to expert, done at End Turn' },
    ]);
    finishesAsSaid(s, 'training:untrained');
    const done = next(s);
    expect(industryOf(done, N1).workers).toEqual({ untrained: 2, trained: 1, expert: 2 });
  });

  it("FR-475 another nation's jobs are not ours; the rows come development, construction, prospecting, training, each kind in map order", () => {
    let s = apply(put(game(), W.farmer, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 });
    s = apply(put(s, W.prospector, T.mountains1), { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 });
    s = apply(put(s, W.engineer, T.coastFarm1), { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.coastFarm1, structure: 'port' });
    s = setWarehouse(s, N1, { paper: 10 });
    s = apply(s, { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 });
    const theirFarmer = workerId(N2, WorkerType.Farmer);
    s = apply(put(s, theirFarmer, T.farm2), { kind: 'startDevelopment', nationId: N2, workerId: theirFarmer, tileId: T.farm2 });
    expect(rows(s).map((r) => r.kind)).toEqual(['development', 'port', 'prospecting', 'training']);
    expect(rows(s, N2).map((r) => r.key)).toEqual([`development:${T.farm2}`]);
  });

  it('FR-475 on a world with provinces the row names the province: "... at 3-9 in Testland South-West, ..."', () => {
    const s0 = continent();
    const farmer = s0.map.tiles.flat().flatMap((t) => t.workers).find((w) => w.nationId === N1 && w.type === WorkerType.Farmer)!;
    const tileId = '3-9';
    const tile = tileAt(s0, tileId);
    expect(tile.provinceId).toBeDefined();
    // A hand-placed job (the engine's own shape): the farmer working the tile to the resource's next level
    let s = put(s0, farmer.id, tileId, { status: WorkerStatus.Working });
    s = setTile(s, tileId, {
      resource: { type: tile.resource?.type ?? ('grain' as never), level: 0, discovered: true },
      developmentJob: { workerId: farmer.id, workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: s.turn, durationTurns: 3 },
    });
    const [row] = rows(s);
    const province = s.provinces.find((p) => p.id === tileAt(s, tileId).provinceId)!.name;
    expect(row.text).toMatch(new RegExp(`^Farmer: .+ to level 1 at 3-9 in ${province}, 3 turns left$`));
    expect(province).toBe('Testland South-West');
    finishesAsSaid(s, `development:${tileId}`);
  });
});
