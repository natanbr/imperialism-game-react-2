import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { readSave, saveOf, type SavedGame } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';
import { replaySession } from '@/store/sessionReplay';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const saved = (store: ReturnType<typeof createGameStore>) => saveOf(store.getState(), new Date(0));
const read = (value: unknown) => readSave({ getItem: () => JSON.stringify(value) });

it('FR-588 NR-038 passes Random size and seed through store creation and session replacement', () => {
  const options = { seed: 0, world: 'random', randomMapSize: 'large' } as const;
  const store = createGameStore(options);
  const expected = newGame(options);
  expect(store.getState().game).toEqual(expected);
  store.getState().startNewGame({ seed: 42 });
  store.getState().startNewGame(options);
  expect(store.getState().game).toEqual(expected);
});

it('NR-038 preserves the serialized seed-only, app, Normal and Demo fixed starts byte for byte', () => {
  const starts = {
    engine: newGame(7),
    app: createGameStore({ seed: 7 }).getState().game,
    demoIslands: newGame({ seed: 7, world: 'two-islands', difficulty: 'demo' }),
    demoContinent: newGame({ seed: 7, world: 'continent', difficulty: 'demo' }),
  };
  expect(Object.fromEntries(Object.entries(starts).map(([id, game]) => [id, digest(game)]))).toEqual({
    app: 'de74b00e5429cb7c21d65956af274bb6433c412c54a120fbbcd6dec774f7672b',
    demoContinent: 'd1b826c9269a20bccfd8edb435e5a0ca0be719191f3d7da63695b14cb2464c61',
    demoIslands: '1b5c27d1174c8e6dad1c3afdb10a3c6223239082d2763fbf01f2e1ca1a6b3a37',
    engine: 'ce71eedcc639aa1c02d3b5a33f9ab6ece2dc361ef8cc27e1835ec9a894ab1298',
  });
  for (const world of ['two-islands', 'continent'] as const) {
    for (const difficulty of ['demo', 'normal'] as const) {
      const options = { seed: 7, world, difficulty };
      const game = newGame(options);
      expect(newGame({ ...options, randomMapSize: 'large' })).toStrictEqual(game);
      expect(game).not.toHaveProperty('randomMapSize');
      expect(game).not.toHaveProperty('councilCalendar');
    }
  }
});

it('NR-038 FR-616 FR-626 FR-627 pins the same unmarked custom 400-turn campaign under current rules, including its meeting at turn 10', () => {
  const old = createGameStore({ game: newGame({ seed: 7, world: 'continent', turnLimit: 400 }) });
  for (let turn = 1; turn < 10; turn++) old.getState().advanceTurn();
  const { rankHistory: newHistory, ...original } = saved(old);
  expect(newHistory?.map(record => record.turn)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  // FR-616: fishing changes freight, stock and later orders. The settled game also records the M18d rules revision.
  // Turn 10: 544df1968c34056c07e33246c47f5a50d2ed8206ba51d2cfa7b5215831c0aa3a -> e842158982c0889a30494b72cdd0bffcc6f85c2836f2bbb9619a0339fc282b05.
  // FR-626 / FR-627, seed 7 turn 10: e842158982c0889a30494b72cdd0bffcc6f85c2836f2bbb9619a0339fc282b05 -> 1cd5a212843f098b0fa773e108ac6977e5b5658eceb9496ae066dcb6d799219d.
  // Only the rules revision changed on these turns. Substituting the M18d marker must recover each old digest exactly.
  expect(digest({ ...original, game: { ...original.game, rulesRevision: 'm18d' } })).toBe('e842158982c0889a30494b72cdd0bffcc6f85c2836f2bbb9619a0339fc282b05');
  expect(digest(original)).toBe('1cd5a212843f098b0fa773e108ac6977e5b5658eceb9496ae066dcb6d799219d');
  const slot = read(original);
  if (slot.kind !== 'usable') throw new Error('Expected a usable v1 save');
  const restored = createGameStore({ seed: 1 });
  restored.getState().restoreGame(slot.save);
  expect(replaySession(slot.save)).toEqual(slot.save.game);
  restored.getState().advanceTurn();
  const { rankHistory: continuedHistory, ...after } = saved(restored);
  expect(continuedHistory?.map(record => record.turn)).toEqual([10]);
  expect(after.eventLog.at(-1)?.events.some(e => e.type === 'council-met')).toBe(true);
  expect(replaySession(after)).toEqual(after.game);
  // FR-616, turn 11: 27dc351a2b8b4e08222d5de3d68c11397a9d39b2b94409e771b3f1fb739fd3b2 -> 15436a8c378d346598bda6ca9b41ac8aac1b14d9ec62981ee4638e2f63b8f847.
  // FR-626 / FR-627, seed 7 turn 11: 15436a8c378d346598bda6ca9b41ac8aac1b14d9ec62981ee4638e2f63b8f847 -> 78f6ae8d549f9361e8c46251b4f5e1a468a00bfc5582132936583218cf602b22.
  expect(digest({ ...after, game: { ...after.game, rulesRevision: 'm18d' } })).toBe('15436a8c378d346598bda6ca9b41ac8aac1b14d9ec62981ee4638e2f63b8f847');
  expect(digest(after)).toBe('78f6ae8d549f9361e8c46251b4f5e1a468a00bfc5582132936583218cf602b22');
});

it('FR-587 FR-616 loads the v1 save written by main, ships its first Fish, saves and replays the continued game', () => {
  // origin/main 765fcaa: seed 7, continent, turn limit 400, nine End Turns and saveOf at the Unix epoch.
  const raw = gunzipSync(readFileSync(join(__dirname, 'fixtures/main-765fcaa-turn-10.json.gz'))).toString();
  const original: SavedGame = JSON.parse(raw);
  const { rankHistory, ...historical } = original;
  expect(digest(historical)).toBe('544df1968c34056c07e33246c47f5a50d2ed8206ba51d2cfa7b5215831c0aa3a');
  const slot = read(original);
  if (slot.kind !== 'usable') throw new Error('Expected the historical main save to load');
  expect(original.version).toBe(1);
  expect(slot.save.game).toEqual(original.game);
  expect(slot.save.orderLog).toEqual(original.orderLog);
  expect(slot.save.eventLog).toEqual(original.eventLog);
  expect(slot.save.rankHistory).toEqual(rankHistory);
  // FR-616: different freight under fishing moves the replay start 1 -> 10 with zero pending orders.
  expect(slot.save.replayBoundary).toEqual({ turn: 10, appliedOrders: 0, checkpoint: original.game });
  const store = createGameStore({ seed: 1 });
  store.getState().restoreGame(slot.save);
  const nationId = original.activeNationId;
  expect(store.getState().submitOrder({ kind: 'setTransportAllocations', nationId, allocations: { fish: 1 } })).toEqual({ ok: true });
  store.getState().advanceTurn();
  const after = saved(store);
  expect(after.game.turn).toBe(11);
  expect(after.eventLog.at(-1)?.events.some(e => e.type === 'council-met')).toBe(true);
  expect(original.game.nations[0].warehouse.fish).toBe(0);
  expect(after.game.nations[0].warehouse.fish).toBe(1);
  const continued = read(after);
  if (continued.kind !== 'usable') throw new Error('Expected the continued save to reload');
  expect(continued.save).toEqual(after);
  expect(replaySession(continued.save)).toEqual(after.game);
});

it('NR-038 restores and replays a Large Random v1 save with a pending human Order and identical next-turn events', () => {
  const game = newGame({ seed: 2813929771, world: 'random', randomMapSize: 'large' });
  const control = createGameStore({ game });
  control.getState().advanceTurn();
  const order = { kind: 'setTransportAllocations', nationId: control.getState().activeNationId, allocations: { grain: 2 } } as const;
  expect(control.getState().submitOrder(order)).toEqual({ ok: true });
  const original = saved(control);
  expect(original.version).toBe(1);
  expect(read({ ...original, version: 2 })).toEqual({ kind: 'unusable' });
  const slot = read(original);
  if (slot.kind !== 'usable') throw new Error('Expected a usable v1 save');
  expect(slot.save.game.randomMapSize).toBe('large');
  expect(slot.save.ordersThisTurn).toEqual([order]);
  expect(slot.save).toEqual(original);
  expect(replaySession(slot.save)).toEqual(slot.save.game);
  const restored = createGameStore({ seed: 42 });
  restored.getState().restoreGame(slot.save);
  restored.getState().advanceTurn();
  control.getState().advanceTurn();
  expect(saved(restored)).toEqual(saved(control));
  expect(replaySession(saved(restored))).toEqual(control.getState().game);
});

it('NR-038 replays a Standard Random save that omits its optional size', () => {
  const game = newGame({ seed: 42, world: 'random', randomMapSize: 'standard' });
  delete game.randomMapSize;
  const session = saved(createGameStore({ game }));
  expect(replaySession(session)).toStrictEqual(game);
});

it.each(['unknown', 'constructor'])('FR-588 reads and replays a hand-edited Random size %s as Standard', randomMapSize => {
  const game = newGame({ seed: 42, world: 'random', randomMapSize: 'standard' });
  const session = saved(createGameStore({ game }));
  const slot = read({ ...session, game: { ...game, randomMapSize } });
  if (slot.kind !== 'usable') throw new Error('Expected a usable v1 save');
  expect(replaySession(slot.save)).toStrictEqual(game);
  expect(slot.save.game).toStrictEqual(game);
});
