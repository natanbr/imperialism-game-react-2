import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { SetFleetMissionOrder } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { readSave, saveOf, type SavedGame } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';
import { replaySession } from '@/store/sessionReplay';

function load(value: unknown) {
  const result = readSave({ getItem: () => JSON.stringify(value) });
  if (result.kind !== 'usable') throw new Error('Save was unusable');
  return result.save;
}

const oldSave = (file: string): SavedGame => JSON.parse(gunzipSync(readFileSync(join(__dirname, 'fixtures', file))).toString());

it('FR-558/560 retains a historical joint land battle and its outcome without any naval orders', () => {
  const legacy = oldSave('pre-q145-allied-march.json.gz');
  expect(legacy.game.fleets).toEqual([]);
  expect(legacy.eventLog.flatMap(r => r.events).filter(e => e.type === 'battle-resolved')).toHaveLength(1);
  const loaded = load(legacy);
  expect(loaded.replayBoundary).toMatchObject({ checkpoint: legacy.game });
  expect(replaySession(loaded)).toEqual(legacy.game);
  expect(loaded.orderLog).toEqual(legacy.orderLog);
});

it('FR-558 keeps from-start replay for an old naval campaign before the squadrons fought', () => {
  const legacy = oldSave('pre-q145-engagement.json.gz');
  const earlier = { ...legacy, game: { ...legacy.game, turn: 3 }, orderLog: legacy.orderLog.filter(e => e.turn < 3), eventLog: legacy.eventLog.slice(0, 2) };
  const original = replaySession(earlier);
  expect(original.fleets).toHaveLength(2);
  const loaded = load({ ...earlier, game: Object.fromEntries(Object.entries(original).reverse()) });
  expect(loaded.replayBoundary).toBeUndefined();
  expect(replaySession(loaded)).toEqual(loaded.game);
});

it('FR-552/558 continues the old intact engagement, keeps its midturn order and reuses the original checkpoint after saving again', () => {
  const legacy = oldSave('pre-q145-engagement.json.gz');
  const nationId = legacy.activeNationId;
  const order: SetFleetMissionOrder = { kind: 'setFleetMission', mission: 'return', nationId, fleetId: legacy.game.fleets.find(f => f.ownerNationId === nationId)!.id };
  const midturn = tryApplyOrder(legacy.game, order);
  expect(midturn.result).toEqual({ ok: true });
  const loaded = load({ ...legacy, game: midturn.state, ordersThisTurn: [order] });
  expect(loaded.orderLog).toEqual(legacy.orderLog);
  expect(loaded.eventLog).toEqual(legacy.eventLog);
  expect(replaySession(loaded)).toEqual(loaded.game);
  expect(loaded.game.fleets.flatMap(f => f.ships).every(s => !s.hullDamage)).toBe(true);
  expect(loaded.replayBoundary).toMatchObject({ turn: legacy.game.turn, appliedOrders: 1, checkpoint: loaded.game });

  const store = createGameStore({ seed: 99 });
  store.getState().restoreGame(loaded);
  expect(store.getState().submitOrder({ ...order, mission: 'cancel' })).toEqual({ ok: true });
  store.getState().advanceTurn();
  const savedAgain = load(saveOf(store.getState()));
  expect(savedAgain.replayBoundary).toEqual(loaded.replayBoundary);
  expect(savedAgain.orderLog.slice(0, legacy.orderLog.length)).toEqual(legacy.orderLog);
  expect(savedAgain.game.fleets.flatMap(f => f.ships).some(s => s.hullDamage)).toBe(true);
  const replay = replaySession(savedAgain);
  expect(replay).toEqual(savedAgain.game);
  expect(resolveTurn(replay, {})).toEqual(resolveTurn(savedAgain.game, {}));
});
