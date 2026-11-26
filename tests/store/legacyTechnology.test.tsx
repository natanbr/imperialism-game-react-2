// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { render, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { NewsPanel } from '@/components/HUD/NewsPanel';
import { newGame } from '@/engine';
import { MaterialType, ResourceType } from '@/types/Resource';
import { WorkerType } from '@/types/Workers';
import { replaySession } from '@/store/sessionReplay';
import { readSave, saveOf, type SavedGame } from '@/store/persistence';
import { createGameStore, useGameStore } from '@/store/rootStore';

// Captured from de20eca's unmodified store. T1: make two paper and buy two oil.
// T2: train a Rancher. T3: buy one oil before saving. Its original engine replayed the full state exactly.
const raw = readFileSync(join(__dirname, 'fixtures', 'pre-m16-turn-3.json'), 'utf8');
const resaved = gunzipSync(readFileSync(join(__dirname, 'fixtures', 'b75d196-resaved-turn-3.json.gz'))).toString('utf8');

function load(serialized: string) {
  const slot = readSave({ getItem: () => serialized });
  if (slot.kind !== 'usable') throw new Error('Expected a usable version-1 save');
  return slot.save;
}

const ranchers = (state: SavedGame['game']) => state.map.tiles.flat().flatMap(tile => tile.workers)
  .filter(worker => worker.nationId === 'nation-1' && worker.type === WorkerType.Rancher);

it('FR-100 FR-520 FR-616 pins the original pre-M16 save and the same production, training and oil orders with fishing', () => {
  const original: SavedGame = JSON.parse(raw);
  const initial = newGame({ seed: 1, world: 'two-islands' });
  const store = createGameStore({ game: {
    ...initial, rulesRevision: undefined, technologyState: original.game.technologyState,
    nations: initial.nations.map(n => ({ ...n, technologies: undefined, legacyOilSupply: true })),
  } });
  const nationId = store.getState().activeNationId;
  const { submitOrder, advanceTurn } = store.getState();
  expect(submitOrder({ kind: 'setProduction', nationId, building: 'lumberMill', output: MaterialType.Paper, amount: 2 })).toEqual({ ok: true });
  expect(submitOrder({ kind: 'buyCommodity', nationId, commodity: ResourceType.Oil, amount: 2 })).toEqual({ ok: true });
  advanceTurn();
  expect(submitOrder({ kind: 'setUniversity', nationId, civilianType: WorkerType.Rancher, count: 1 })).toEqual({ ok: true });
  advanceTurn();
  expect(submitOrder({ kind: 'buyCommodity', nationId, commodity: ResourceType.Oil, amount: 1 })).toEqual({ ok: true });
  const built = saveOf(store.getState(), new Date(original.savedAt));
  expect(built.rankHistory?.map(record => record.turn)).toEqual([1, 2]);
  const historical = { ...built };
  delete historical.rankHistory;
  const encoded = JSON.stringify(historical, (key, value) => key === 'legacyOilSupply' ? undefined : value);
  const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  // FR-616: two turns of fishing change freight and stock in the otherwise identical v1 order sequence.
  // e07b340d145b28e2cb02b3c5d81f34de4a1b85747959af5be6e76d21acf73883 -> ef0ac9668522d86b901b59a634d070fdf926786de2a14af622ae3ef21c45cffb.
  expect(digest(original)).toBe('e07b340d145b28e2cb02b3c5d81f34de4a1b85747959af5be6e76d21acf73883');
  const withFishing = JSON.parse(encoded);
  expect(digest(withFishing)).toBe('ef0ac9668522d86b901b59a634d070fdf926786de2a14af622ae3ef21c45cffb');
  // FR-616: both nations landed one Fish per turn. Only those two warehouse entries change in de20eca's capture.
  expect(original.game.nations.map(nation => nation.warehouse.fish)).toEqual([0, 0]);
  for (const nation of original.game.nations) nation.warehouse.fish = 2;
  expect(withFishing).toEqual(original);
  const loaded = load(encoded);
  expect(replaySession(loaded)).toEqual(loaded.game);
});

it.each([['pre-M16', raw], ['M16 checkpoint resave', resaved]])('FR-100 FR-520 FR-616 replays %s recruitment and mid-turn oil bid through Continue and a second save', (_, serialized) => {
  const saved = load(serialized);
  const store = createGameStore({ seed: 99 });
  store.getState().restoreGame(saved);
  expect(ranchers(saved.game)).toHaveLength(2);
  // FR-616: fishing changes earlier freight. Replay from turn 1 -> turn 3, after the one paid oil order.
  expect(saved.replayBoundary).toEqual({ turn: 3, appliedOrders: 1, checkpoint: saved.game });
  const replayed = replaySession(saved);
  expect(ranchers(replayed)).toHaveLength(2);
  expect(replayed).toEqual(saved.game);
  const nationId = saved.activeNationId;
  expect(store.getState().submitOrder({kind: 'setUniversity', nationId, civilianType: WorkerType.Rancher, count: 1})).toMatchObject({reason: 'missing-technology'});
  expect(store.getState().submitOrder({kind: 'buyTechnology', nationId, techId: 'feedGrasses'})).toEqual({ok: true});
  store.getState().advanceTurn();
  const continued = load(JSON.stringify(saveOf(store.getState())));
  expect(continued.replayBoundary).toEqual(saved.replayBoundary);
  expect(replaySession(continued)).toEqual(continued.game);
});

it('FR-100 FR-616 preserves a rejected computer attempt in pre-M16 history when the same order is valid today', () => {
  const original: SavedGame = JSON.parse(raw);
  const computer = original.orderLog.find(entry => entry.turn === 1 && entry.nationId === 'nation-2')!;
  computer.orders.unshift({ kind: 'buyTechnology', nationId: computer.nationId, techId: 'cottonGin' });
  // FR-616: the turn-1 attempt remains in the log. Replay start 1 -> 3 preserves its historical outcome.
  const save = load(JSON.stringify(original));
  expect(save.orderLog).toEqual(original.orderLog);
  expect(replaySession(save)).toEqual(save.game);
});

it('FR-521 FR-280 shows all four turn-three invention lines exactly once in fresh and restored news', () => {
  const fresh = createGameStore({ seed: 1, world: 'two-islands' });
  fresh.getState().advanceTurn();
  fresh.getState().advanceTurn();
  const inventions = (save: SavedGame) => {
    useGameStore.getState().restoreGame(save);
    const view = render(<NewsPanel />);
    const list = view.getByRole('list', { name: 'News from last turn (turn 2, Summer 1815)' });
    const items = within(list).getAllByRole('listitem').map(item => item.textContent);
    view.unmount();
    return items.filter(line => line?.startsWith('New Invention:'));
  };
  const expected = ['Streamlined Hulls', 'Square-Set Timbering', 'Iron Railroad Bridge', 'Feed Grasses'].map(name => 'New Invention: ' + name);
  expect(inventions(load(JSON.stringify(saveOf(fresh.getState()))))).toEqual(expected);
  const restored = load(raw);
  expect(inventions(restored)).toEqual(expected);
  expect(inventions(load(JSON.stringify(restored)))).toEqual(expected);
});
