import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { readSave, saveOf } from '@/store/persistence';
import { replaySession } from '@/store/sessionReplay';
import { createGameStore } from '@/store/rootStore';
import { newGame } from '@/engine/newGame';
import { validateOrder } from '@/engine/orders/validate';
import { ResourceType } from '@/types/Resource';
import { WorkerType } from '@/types/Workers';

function load(raw: string) {
  const slot = readSave({ getItem: () => raw });
  if (slot.kind !== 'usable') throw new Error('Expected a usable save');
  return slot.save;
}

it('FR-523 FR-100 a 9bd5a91 save retains old human and computer development orders and replays its full state after Continue', () => {
  const raw = gunzipSync(readFileSync(join(__dirname, 'fixtures', '9bd5a91-m16-part1-turn-2.json.gz'))).toString('utf8');
  const historical = JSON.parse(raw);
  const saved = load(raw);
  expect(saved).toEqual(historical);
  expect(replaySession(saved)).toEqual(historical.game);
  const store = createGameStore({ seed: 2 });
  store.getState().restoreGame(saved);
  store.getState().advanceTurn();
  const continued = load(JSON.stringify(saveOf(store.getState())));
  expect(continued.game.rulesRevision).toBe('m16.1');
  expect(replaySession(continued)).toEqual(continued.game);
  store.getState().startNewGame({ seed: 1, world: 'two-islands' });
  expect(store.getState().game.rulesRevision).toBe('m16b');
  expect(store.getState().replayBoundary).toBeUndefined();
});

it.each(['two-islands', 'continent'] as const)('FR-523 FR-100 new %s games gate both nations and retain the gates across a save and replay', world => {
  const game = newGame({ seed: 1, world });
  const store = createGameStore({ game });
  store.getState().advanceTurn();
  const loaded = load(JSON.stringify(saveOf(store.getState())));
  expect(replaySession(loaded)).toEqual(loaded.game);
  for (const state of [game, loaded.game]) {
    expect(state.rulesRevision).toBe('m16b');
    for (const nation of state.nations) {
      const tiles = state.map.tiles.flat().filter(t => t.ownerNationId === nation.id);
      const worker = tiles.flatMap(t => t.workers).find(w => w.type === WorkerType.Rancher)!;
      const target = tiles.find(t => t.resource?.type === ResourceType.Livestock && t.resource.level === 0)!;
      expect(validateOrder(state, { kind: 'moveAndStartDevelopment', nationId: nation.id, workerId: worker.id, toTileId: target.id }))
        .toEqual({ ok: false, reason: 'missing-technology', techId: 'feedGrasses' });
    }
  }
});
