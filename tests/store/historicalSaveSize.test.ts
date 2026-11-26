// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { readSave, SAVE_KEY, saveOf, writeSave, type SavedGame } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';
import { replaySession } from '@/store/sessionReplay';

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
});
