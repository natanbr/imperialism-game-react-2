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

function settledSave() {
  const store = createGameStore({ seed: 1 });
  store.getState().advanceTurn();
  return saveOf(store.getState());
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
    // FR-627, seed 7 T40: FR-626 progress/checkpoint adds 204 characters (replay delta 10854 -> 10872).
    // FR-622 adds 14 receipts, another 2550 characters. Total 201597 -> 204351. T11 is unchanged.
    // FR-627 under FR-628: towns ship before automatic freight, so delivered town goods change the saved warehouse and
    // the computer's later Orders. T40 204351 -> 204795, replay delta 10872 -> 10899. T11 is unchanged.
    // FR-627 / FR-628: from T26, capped car assignments omit Lumber the computer could not ship.
    // T40 204795 -> 204351 characters, replay overhead 10899 -> 10872. T11 stays at 111446 (+2370).
    expect(raw.length).toBe(turn === 40 ? 204351 : 111446);
    expect(raw.length - ordinarySize).toBe(turn === 40 ? 10872 : 2370);
    expect(raw.length - ordinarySize).toBeLessThan(checkpointSize / 2);
    expect(JSON.parse(raw).replayBoundary).not.toHaveProperty('checkpoint');
    const roundTrip = read(raw);
    expect(roundTrip.replayBoundary).toEqual(historical.replayBoundary);
    expect(JSON.stringify(roundTrip.replayBoundary?.checkpoint)).toBe(JSON.stringify(historical.game));
    expect(roundTrip.ordersThisTurn).toEqual(current.ordersThisTurn);
    expect(replaySession(roundTrip)).toEqual(current.game);
    reload.getState().restoreGame(roundTrip);
  }
});

it('FR-357 keeps the Large historical random-map save at turn 40 within the 2,000,000-character app budget', () => {
  const store = createGameStore({ seed: 1, world: 'random', randomMapSize: 'large' });
  store.getState().advanceTurn();
  const early = saveOf(store.getState());
  const historical = read(JSON.stringify({ ...early, game: { ...early.game, rulesRevision: 'm16.1' } }));
  expect(historical.replayBoundary?.checkpoint?.turn).toBe(2);
  store.getState().restoreGame(historical);
  for (let turn = 2; turn < 40; turn++) store.getState().advanceTurn();
  const saved = saveOf(store.getState(), new Date(0));
  expect(saved.game.turn).toBe(40);
  expect(saved.game.randomMapSize).toBe('large');
  const raw = write(saved);
  expect(JSON.parse(raw).replayBoundary).toHaveProperty('checkpointChanges');
  console.info(`Large seed 1 T40: ${raw.length} characters, ${Buffer.byteLength(raw)} UTF-8 bytes.`);
  // FR-627, Large seed 1 T40: 246942 -> 249543 (+203 FR-626 progress/checkpoint, +2398 FR-622 for 11 receipts).
  // FR-627 under FR-628: delivered town goods change the saved stock and later Orders. 249543 -> 248908.
  // FR-627 / FR-628: from T29 the Orders omit Lumber and Steel that have no car. T40 248908 -> 248614.
  expect(raw.length).toBe(248614);
  expect(raw.length - JSON.stringify({ ...saved, replayBoundary: undefined }).length).toBe(13187);
  expect(raw.length).toBeLessThan(2_000_000);
  expect(read(raw).game).toEqual(saved.game);
  store.getState().advanceTurn();
  const finished = saveOf(store.getState(), new Date(0));
  expect(finished.game.gameOver).toBeDefined();
  expect(finished.eventLog.at(-1)?.turn).toBe(40);
  const finalRaw = write(finished);
  expect(JSON.parse(finalRaw).replayBoundary).toHaveProperty('checkpointChanges');
  console.info(`Large seed 1 after T40: ${finalRaw.length} characters, ${Buffer.byteLength(finalRaw)} UTF-8 bytes.`);
  // FR-627, after T40: 251943 -> 254762 (+203 FR-626 progress/checkpoint, +2616 FR-622 for 12 receipts).
  // FR-627 under FR-628: delivered town goods change the saved stock and later Orders. 254762 -> 253596.
  // FR-627 / FR-628: capping the computer's town assignments also changes the last settlement's saved state.
  // 253596 -> 253216 characters; replay overhead 13224 -> 13201.
  expect(finalRaw.length).toBe(253216);
  expect(finalRaw.length - JSON.stringify({ ...finished, replayBoundary: undefined }).length).toBe(13201);
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

it.each(['undefined', 'hole'])('FR-587 can continue a save with %s in a historical array', kind => {
  const save = settledSave();
  const game = { ...save.game, values: ['a', 'b'] };
  const values: (string | undefined)[] = ['a'];
  if (kind === 'hole') values.length = 2;
  else values.push(undefined);
  const checkpoint = { ...game, values };
  const raw = write({ ...save, game, replayBoundary: { turn: game.turn, appliedOrders: 0, checkpoint } });
  const roundTrip = read(raw);
  expect(roundTrip.game).toMatchObject({ values: ['a', 'b'] });
  expect(roundTrip.replayBoundary?.checkpoint).toMatchObject({ values: ['a', null] });
  expect(JSON.parse(raw).replayBoundary).toHaveProperty('checkpoint');
  expect(JSON.parse(raw).replayBoundary).not.toHaveProperty('checkpointChanges');
});

it('FR-587 keeps the checkpoint JSON when restoring the delta silently produces a different value', () => {
  const save = settledSave();
  // Dates have no enumerable fields, but serialize to distinct strings.
  const game = { ...save.game, timestamp: new Date(1000) };
  const checkpoint = { ...game, timestamp: new Date(0) };
  const raw = write({ ...save, game, replayBoundary: { turn: game.turn, appliedOrders: 0, checkpoint } });
  const roundTrip = read(raw);
  expect(roundTrip.game).toMatchObject({ timestamp: game.timestamp.toJSON() });
  expect(roundTrip.replayBoundary?.checkpoint).toMatchObject({ timestamp: checkpoint.timestamp.toJSON() });
});

it('FR-587 preserves historical bid order when only the order of equally sized bids changed', () => {
  const save = settledSave();
  const withBids = (buy: { timber: number; cotton: number }) => ({
    ...save.game,
    market: { ...save.game.market!, ordersTwoTurnsAgo: { 'nation-2': { sell: {}, buy } } },
  });
  const game = withBids({ cotton: 1, timber: 1 });
  const checkpoint = withBids({ timber: 1, cotton: 1 });
  const boundary = { turn: game.turn, appliedOrders: 0, checkpoint };
  const raw = write({ ...save, game, replayBoundary: boundary });
  expect(JSON.parse(raw).replayBoundary).toHaveProperty('checkpointChanges');
  const loaded = read(raw);
  const bids = loaded.replayBoundary?.checkpoint?.market?.ordersTwoTurnsAgo?.['nation-2'].buy;
  expect(JSON.stringify(bids)).toBe(JSON.stringify(checkpoint.market.ordersTwoTurnsAgo['nation-2'].buy));
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
  null,
  [],
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
