import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it, vi } from 'vitest';
import * as engine from '@/engine';
import { readSave, saveOf } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';

function load(raw: string) {
  const slot = readSave({ getItem: () => raw });
  if (slot.kind !== 'usable') throw new Error('Expected a usable v1 save');
  return slot.save;
}

it('FR-587 loads a current campaign without resolving its previous turns again', () => {
  const game = createGameStore({ seed: 1, world: 'continent' });
  game.getState().advanceTurn();
  const raw = JSON.stringify(saveOf(game.getState()));
  const resolve = vi.spyOn(engine, 'resolveTurn');
  try {
    expect(load(raw).game).toEqual(game.getState().game);
    expect(resolve).not.toHaveBeenCalled();
  } finally {
    resolve.mockRestore();
  }
});

it('FR-587 preserves a fishing-only checkpoint through a resave without claiming M17 combat', () => {
  const raw = gunzipSync(readFileSync(join(__dirname, 'fixtures/pre-m17-continent.json.gz'))).toString();
  const previous = load(raw);
  expect(previous.replayBoundary?.checkpoint).toEqual(previous.game);
  expect(previous.combatRevision).toBeUndefined();
  const game = createGameStore({ seed: 1 });
  game.getState().restoreGame(previous);
  const resaved = load(JSON.stringify(saveOf(game.getState())));
  expect(resaved.replayBoundary).toEqual(previous.replayBoundary);
  expect(resaved.combatRevision).toBeUndefined();
});
