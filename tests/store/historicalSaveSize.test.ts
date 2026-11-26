// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { readSave, SAVE_KEY, saveOf, writeSave, type SavedGame } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';
import { replaySession } from '@/store/sessionReplay';
import { checkpointDifference, restoreCheckpoint } from '@/store/checkpointStorage';

function read(raw: string) {
  const result = readSave({ getItem: () => raw });
  if (result.kind !== 'usable') throw new Error('Expected a usable version-1 save');
  return result.save;
}

function write(save: SavedGame) {
  expect(writeSave(save, window.localStorage)).toBe(true);
  return window.localStorage.getItem(SAVE_KEY)!;
}

it('FR-357 FR-587 keeps one full game on disk and replays every turn since a historical save', () => {
  const capture = gunzipSync(readFileSync(join(__dirname, 'fixtures/main-765fcaa-turn-10.json.gz'))).toString();
  const historical = read(capture);
  const store = createGameStore({ seed: 1 });
  store.getState().restoreGame(historical);
  const allocate = (fish: number) => expect(store.getState().submitOrder({
    kind: 'setTransportAllocations', nationId: historical.activeNationId, allocations: { fish },
  })).toEqual({ ok: true });
  allocate(1);
  store.getState().advanceTurn();
  allocate(2);

  // Task 48 already wrote full checkpoints. Load one, then exercise the browser's next write.
  const oldFormat = JSON.stringify(saveOf(store.getState()));
  const reload = createGameStore({ seed: 1 });
  reload.getState().restoreGame(read(oldFormat));
  for (const turn of [11, 40]) {
    while (reload.getState().game.turn < turn && !reload.getState().game.gameOver) reload.getState().advanceTurn();
    const current = saveOf(reload.getState(), new Date(0));
    expect(current.game.turn).toBe(turn);
    const raw = write(current);
    const ordinarySize = JSON.stringify({ ...current, replayBoundary: undefined }).length;
    const checkpointSize = JSON.stringify(historical.game).length;
    console.info(`Historical continent T${turn}: ${raw.length} characters, ${raw.length - ordinarySize} for replay; full checkpoint ${checkpointSize}.`);
    expect(raw.length - ordinarySize).toBeLessThan(checkpointSize / 2);
    expect(JSON.parse(raw).replayBoundary).not.toHaveProperty('checkpoint');
    const roundTrip = read(raw);
    expect(roundTrip.replayBoundary).toEqual(historical.replayBoundary);
    expect(roundTrip.ordersThisTurn).toEqual(current.ordersThisTurn);
    expect(replaySession(roundTrip)).toEqual(current.game);
    reload.getState().restoreGame(roundTrip);
  }
});

it('FR-357 keeps the Large random-map save at turn 40 within the 2,000,000-character app budget', () => {
  const store = createGameStore({ seed: 1, world: 'random', randomMapSize: 'large' });
  for (let turn = 1; turn < 40; turn++) store.getState().advanceTurn();
  const saved = saveOf(store.getState(), new Date(0));
  expect(saved.game.turn).toBe(40);
  expect(saved.game.randomMapSize).toBe('large');
  const raw = write(saved);
  console.info(`Large seed 1 T40: ${raw.length} characters, ${Buffer.byteLength(raw)} UTF-8 bytes.`);
  expect(raw.length).toBeLessThan(2_000_000);
  expect(read(raw).game).toEqual(saved.game);
  store.getState().advanceTurn();
  const finished = saveOf(store.getState(), new Date(0));
  expect(finished.game.gameOver).toBeDefined();
  expect(finished.eventLog.at(-1)?.turn).toBe(40);
  const finalRaw = write(finished);
  console.info(`Large seed 1 after T40: ${finalRaw.length} characters, ${Buffer.byteLength(finalRaw)} UTF-8 bytes.`);
  expect(finalRaw.length).toBeLessThan(2_000_000);
  expect(read(finalRaw).game).toEqual(finished.game);
});

it('FR-100 FR-587 preserves the paid order at a historical mid-turn boundary and replays a later order once', () => {
  const historical = read(readFileSync(join(__dirname, 'fixtures/pre-m16-turn-3.json'), 'utf8'));
  const store = createGameStore({ seed: 99 });
  store.getState().restoreGame(historical);
  expect(historical.replayBoundary?.appliedOrders).toBe(1);
  expect(store.getState().submitOrder({ kind: 'buyTechnology', nationId: historical.activeNationId, techId: 'feedGrasses' })).toEqual({ ok: true });
  for (const turn of [3, 4]) {
    const roundTrip = read(write(saveOf(store.getState())));
    expect(roundTrip.game.turn).toBe(turn);
    expect(roundTrip.replayBoundary).toStrictEqual(historical.replayBoundary);
    expect(replaySession(roundTrip)).toEqual(store.getState().game);
    store.getState().restoreGame(roundTrip);
    store.getState().advanceTurn();
  }
});

it('FR-587 restores deleted fields, nulls, changed array lengths and sparse map edits after JSON serialization', () => {
  const current = { old: null, new: 'present', rows: [[1, 2], [3, 4]], orders: [1, 2] };
  const historical = { old: [null], absentNow: null, rows: [[1, 8], [3, 4]], orders: [3] };
  const edit = JSON.parse(JSON.stringify(checkpointDifference(current, historical)));
  expect(edit.rows).toEqual({ 0: { 1: [8] } });
  expect(restoreCheckpoint(current, edit)).toStrictEqual(historical);
  expect(current).toStrictEqual({ old: null, new: 'present', rows: [[1, 2], [3, 4]], orders: [1, 2] });
});

it('NR-039 FR-587 validates credit in both historical checkpoint formats', () => {
  const save = saveOf(createGameStore({ seed: 1 }).getState());
  const checkpoint = { ...save.game, nations: save.game.nations.map(n => ({ ...n, treasury: -1 })) };
  const invalid = { ...save, replayBoundary: { turn: save.game.turn, appliedOrders: 0, checkpoint } };
  expect(readSave({ getItem: () => JSON.stringify(invalid) }).kind).toBe('unusable');
  const raw = write(invalid);
  expect(readSave({ getItem: () => raw }).kind).toBe('unusable');
});

it.each([
  false,
  { turn: [1, 2] },
  { turn: [3] },
  { nations: { 100: [] } },
  { nations: { '-1': [] } },
  { nations: { length: [0] } },
  { nations: { 0: [] } },
])('FR-362 refuses malformed replay changes %j', checkpointChanges => {
  const save = saveOf(createGameStore({ seed: 1 }).getState());
  const raw = JSON.stringify({ ...save, replayBoundary: { turn: save.game.turn, appliedOrders: 0, checkpointChanges } });
  expect(readSave({ getItem: () => raw }).kind).toBe('unusable');
});
