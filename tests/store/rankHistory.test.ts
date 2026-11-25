import { expect, it } from 'vitest';
import { newGame, tryApplyOrder } from '@/engine';
import { readSave, saveOf, type SavedGame } from '@/store/persistence';
import { replaySession } from '@/store/sessionReplay';
import { createGameStore } from '@/store/rootStore';
import { ResourceType } from '@/types/Resource';

const now = new Date(0);
function load(value: unknown) {
  const slot = readSave({ getItem: () => JSON.stringify(value) });
  if (slot.kind !== 'usable') throw new Error('Expected a usable v1 game');
  return slot.save;
}
function gameplay(save: SavedGame) {
  const copy = { ...save };
  delete copy.rankHistory;
  return copy;
}

it('FR-611 records all settled turns before Stats opens, past the event log limit and through a one-turn finish', () => {
  const store = createGameStore({ world: 'two-islands', seed: 9 });
  expect(store.getState().rankHistory ?? []).toEqual([]);
  for (let turn = 1; turn <= 23; turn++) store.getState().advanceTurn();
  const state = store.getState();
  expect(state.eventLog).toHaveLength(20);
  expect(state.rankHistory?.map(record => record.turn)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
  state.startNewGame({ seed: 8, world: 'two-islands', turnLimit: 1 });
  expect(store.getState().rankHistory ?? []).toEqual([]);
  store.getState().advanceTurn();
  expect(store.getState().game.gameOver?.turn).toBe(1);
  const final = store.getState().rankHistory;
  expect(final?.map(record => record.turn)).toEqual([1]);
  store.getState().advanceTurn();
  expect(store.getState().rankHistory).toBe(final);
});

it('FR-497 FR-610 uses the resolved state, and a rival privately reserving a bid cannot change the recorded placings', () => {
  const store = createGameStore({ seed: 4, world: 'two-islands' });
  const { game } = store.getState();
  const [human, rival] = game.nations;
  // The freight order builds this turn: the nations tie before settlement and the human leads afterwards.
  const start = { ...game, nations: game.nations.map(n => ({ ...n, controller: 'human' as const, transportCapacity: 4 })) };
  store.setState({ game: start });
  expect(store.getState().submitOrder({ kind: 'changeTransportCapacity', nationId: human.id, delta: 1 })).toEqual({ ok: true });
  store.getState().advanceTurn();
  const record = store.getState().rankHistory;
  expect(record?.[0].places.transport).toEqual([{ nationId: human.id, place: 1 }, { nationId: rival.id, place: 2 }]);
  const settled = store.getState().game;
  const bid = tryApplyOrder(settled, { kind: 'buyCommodity', nationId: rival.id, commodity: ResourceType.Coal, amount: 1 });
  expect(bid.result).toEqual({ ok: true });
  expect(bid.state.nations[1].treasury).toBeLessThan(settled.nations[1].treasury);
  store.setState({ game: bid.state });
  expect(saveOf(store.getState(), now).rankHistory).toEqual(record);
});

it.each(['normal', 'demo'] as const)('NR-040 FR-611 preserves %s mid-turn gameplay, Orders, replay and next settlement with history retained, altered or missing', difficulty => {
  const store = createGameStore({ game: newGame({ seed: 3, world: 'two-islands', difficulty }) });
  store.getState().advanceTurn();
  store.getState().advanceTurn();
  const { activeNationId: nationId, submitOrder } = store.getState();
  expect(submitOrder({ kind: 'openCredit', nationId })).toEqual({ ok: true });
  expect(submitOrder({ kind: 'buyCommodity', nationId, commodity: ResourceType.Coal, amount: 1 })).toEqual({ ok: true });
  const saved = saveOf(store.getState(), now);
  expect(saved.version).toBe(1);
  expect(saved.rankHistory?.map(r => r.turn)).toEqual([1, 2]);
  const earlier = saved.rankHistory![1];
  const alternate = { ...earlier, places: { ...earlier.places, exports: saved.game.nations.map(n => ({ nationId: n.id, place: 1 })) } };
  store.getState().advanceTurn();
  const expected = saveOf(store.getState(), now);
  for (const history of [saved.rankHistory, [alternate], undefined]) {
    const read = load({ ...saved, rankHistory: history });
    expect(read.rankHistory ?? []).toEqual(history ?? []);
    expect(replaySession(read)).toEqual(saved.game);
    const continued = createGameStore({ seed: 99 });
    continued.getState().restoreGame(read);
    expect(gameplay(saveOf(continued.getState(), now))).toEqual(gameplay(saved));
    continued.getState().advanceTurn();
    const next = saveOf(continued.getState(), now);
    expect(gameplay(next)).toEqual(gameplay(expected));
    expect(next.rankHistory).toEqual([...(history ?? []), expected.rankHistory!.at(-1)]);
    expect(replaySession(next)).toEqual(next.game);
    expect(next.game).not.toHaveProperty('rankHistory');
  }
});

it('FR-611 discards malformed display data without losing the game or adjacent usable records', () => {
  const store = createGameStore({ world: 'two-islands', seed: 9 });
  for (let turn = 1; turn <= 3; turn++) store.getState().advanceTurn();
  const save = saveOf(store.getState(), now);
  expect(save.rankHistory).toHaveLength(3);
  const [one, two, three] = save.rankHistory!;
  for (const broken of [null, 'bad', { ...two, turn: 77 }, { ...two, places: { ...two.places,
    industry: [{ nationId: 'unknown nation', place: 100 }] } }]) {
    const loaded = load({ ...save, rankHistory: [one, broken, three] });
    expect(gameplay(loaded)).toEqual(gameplay(save));
    expect(loaded.rankHistory).toEqual([one, three]);
  }
  expect(load({ ...save, rankHistory: 'invalid' }).rankHistory ?? []).toEqual([]);
});

it('FR-611 checks mandatory land measures against fixed geography and preserves historical armies after they disappear', () => {
  const continent = createGameStore({ seed: 2, world: 'continent' });
  continent.getState().advanceTurn();
  const continental = saveOf(continent.getState(), now);
  const [record] = continental.rankHistory!;
  for (const measure of ['army', 'council'] as const) {
    const places = { ...record.places };
    delete places[measure];
    const partial = load({ ...continental, rankHistory: [{ ...record, places }] });
    expect(partial.rankHistory ?? []).toEqual([]);
    expect(gameplay(partial)).toEqual(gameplay(continental));
  }

  const islands = createGameStore({ seed: 2, world: 'two-islands' });
  islands.getState().advanceTurn();
  const emptyLand = saveOf(islands.getState(), now);
  expect(emptyLand.game.provinces).toEqual([]);
  expect(emptyLand.game.armies).toEqual([]);
  const previous = emptyLand.rankHistory![0];
  const history = [{ turn: 1, places: { ...previous.places, army: record.places.army } }];
  expect(load({ ...emptyLand, rankHistory: history }).rankHistory).toEqual(history);
});
