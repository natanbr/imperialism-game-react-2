import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { WARSHIPS } from '@/definisions/ships';
import { portApproach, withFleets } from '@/engine/navy/fleets';
import { newGame } from '@/engine/newGame';
import { addPort } from '@/engine/systems/railroadSystem';
import { transferProvince } from '@/engine/world/provinces';
import { townsOf } from '@/engine/world/towns';
import { readSave, saveOf, serializeSave, type SavedGame } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';
import { replaySession } from '@/store/sessionReplay';
import { ResourceType } from '@/types/Resource';
import { N1, N2, setBuilding, setPair, setTile, tileAt } from '../engine/fixtures';

function load(raw: string) {
  const slot = readSave({ getItem: () => raw });
  if (slot.kind !== 'usable') throw new Error('Expected a usable v1 save');
  return slot.save;
}

function fixture(name: string) {
  return gunzipSync(readFileSync(join(__dirname, 'fixtures', name))).toString();
}

// The pre-fishing capture is from main at 765fcaa. The M18d writer at T-01's
// 5969842 continued it through five End Turns and a $500 Arvelian consulate.
it.each([
  ['main-765fcaa-turn-10.json.gz', 10, 0],
  ['m18d-turn-15-midturn.json.gz', 15, 1],
] as const)('FR-626 continues historical %s from its actual saved turn and paid Orders', (file, turn, paid) => {
  const raw = fixture(file);
  const original: SavedGame = JSON.parse(raw);
  if (paid) {
    expect(original.game.rulesRevision).toBe('m18d');
    expect(original.replayBoundary).toMatchObject({ turn: 10, checkpointChanges: expect.anything() });
    expect(original.ordersThisTurn[0]).toMatchObject({ kind: 'proposeOverture', overture: 'consulate' });
    expect(original.turnStartTreasuries![N1] - original.game.nations[0].treasury).toBe(500);
  }
  const imported = load(raw);
  expect(imported.replayBoundary).toMatchObject({ turn, appliedOrders: paid });
  expect(imported.replayBoundary?.checkpoint).toEqual(original.game);
  expect(imported.game).toEqual(original.game);
  expect(imported.game.townProgress).toBeUndefined();
  expect(imported.orderLog).toEqual(original.orderLog);
  expect(imported.eventLog).toEqual(original.eventLog);
  expect(imported.ordersThisTurn).toEqual(original.ordersThisTurn);
  const live = createGameStore();
  live.getState().restoreGame(imported);
  expect(live.getState().submitOrder({ kind: 'proposeOverture', nationId: N1, targetId: 'minor-2', overture: 'consulate' })).toEqual({ ok: true });
  for (let t = turn; t <= turn + 2; t++) {
    const current = saveOf(live.getState());
    expect(current.game.turn).toBe(t);
    const encoded = serializeSave(current);
    expect(JSON.parse(encoded).replayBoundary).toHaveProperty('checkpointChanges');
    expect(encoded.length).toBeLessThan(2_000_000);
    const reloaded = load(encoded);
    expect(reloaded.replayBoundary).toEqual(imported.replayBoundary);
    expect(reloaded.eventLog).toEqual(current.eventLog);
    expect(replaySession(reloaded)).toEqual(current.game);
    const continued = createGameStore();
    continued.getState().restoreGame(reloaded);
    continued.getState().advanceTurn();
    live.getState().advanceTurn();
    expect(continued.getState().game).toEqual(live.getState().game);
    expect(continued.getState().eventLog).toEqual(live.getState().eventLog);
  }
});

// Written by M18h (1cf9fd6) after 38 idle turns, then a $500 consulate on turn 39.
// M18h replayed this position exactly. Replaying its history with towns first changed N2's warehouse.
it('FR-626 FR-628 continues a paid M18h save from its saved position and replays the M18i settlement', () => {
  const raw = fixture('m18h-large-seed-1-turn-39.json.gz');
  const historical: SavedGame = JSON.parse(raw);
  expect(historical.version).toBe(1);
  expect(historical.game.rulesRevision).toBe('m18h');
  expect(historical.replayBoundary).toBeUndefined();
  expect(historical.ordersThisTurn).toEqual([{ kind: 'proposeOverture', nationId: N1, targetId: 'minor-1', overture: 'consulate' }]);
  expect(historical.turnStartTreasuries![N1]).toBe(6200);
  expect(historical.game.nations[0].treasury).toBe(5700);
  expect(historical.game.nations[1].warehouse).toMatchObject({ cotton: 6, cannedFood: 20, lumber: 3, steel: 1, furniture: 3, armaments: 2 });

  const imported = load(raw);
  expect(imported.game).toEqual(historical.game);
  expect(imported.orderLog).toEqual(historical.orderLog);
  expect(imported.eventLog).toEqual(historical.eventLog);
  expect(replaySession(imported)).toEqual(historical.game);
  expect(imported.replayBoundary).toEqual({ turn: 39, appliedOrders: 1, checkpoint: historical.game });

  const live = createGameStore();
  live.getState().restoreGame(imported);
  const secondOrder = { kind: 'proposeOverture', nationId: N1, targetId: 'minor-2', overture: 'consulate' } as const;
  expect(live.getState().submitOrder(secondOrder)).toEqual({ ok: true });
  expect(live.getState().game.nations[0].treasury).toBe(5200);
  const midturn = load(serializeSave(saveOf(live.getState())));
  expect(midturn.ordersThisTurn).toEqual([...historical.ordersThisTurn, secondOrder]);
  expect(replaySession(midturn)).toEqual(live.getState().game);

  const continued = createGameStore();
  continued.getState().restoreGame(midturn);
  continued.getState().advanceTurn();
  live.getState().advanceTurn();
  const settled = load(serializeSave(saveOf(continued.getState())));
  expect(settled.version).toBe(1);
  expect(settled.game.rulesRevision).toBe('m18i');
  const report = settled.eventLog.at(-1)!;
  expect(report.turn).toBe(39);
  // FR-627 / FR-628: continuing the same saved position on M18h delivered 0 Lumber, 0 Steel.
  // Towns-first freight gives both remaining cars to the town on the first M18i settlement.
  expect(report.events.filter(e => e.type === 'town-receipt')).toEqual([{
    type: 'town-receipt', turn: 39, nationId: N2, provinceId: 'province-nation-2-2', seatTileId: '20-6',
    lines: [{ commodity: 'lumber', offered: 1, delivered: 1 }, { commodity: 'steel', offered: 1, delivered: 1 }],
  }]);
  expect(settled.eventLog).toEqual(live.getState().eventLog);
  expect(settled.game).toEqual(live.getState().game);
  expect(settled.replayBoundary).toEqual(imported.replayBoundary);
  expect(replaySession(settled)).toEqual(live.getState().game);
});

it.each(['growing', 'blockaded', 'captured'] as const)('FR-626 round-trips a %s town and its next settlement', stage => {
  // Give the coastal seat a constructed port and a partially earned wood upgrade.
  let game = newGame({ seed: 1, world: 'continent' });
  const shore = tileAt(game, '10-7');
  const province = game.provinces.find(p => p.id === shore.provinceId)!;
  game = { ...game, provinces: game.provinces.map(p => p.id === province.id ? { ...p, seatTileId: shore.id } : p),
    nations: game.nations.map(n => ({ ...n, controller: 'human' })) };
  for (const id of province.tileIds.slice(0, 4)) game = setTile(game, id, { resource: { type: ResourceType.Timber, level: 1 } });
  game = setTile(game, shore.id, { port: true });
  const owner = stage === 'captured' ? N2 : N1;
  if (stage === 'captured') game = transferProvince(game, province.id, owner);
  game = setBuilding(addPort(game, owner, tileAt(game, shore.id)), owner, 'furnitureFactory', { capacity: 8 });
  if (stage === 'blockaded') {
    game = setPair(game, N1, N2, { war: { since: 1, aggressors: [N2] } });
    const approach = portApproach(game, tileAt(game, shore.id))!;
    game = withFleets(game, [{ id: 'blockader', name: 'Frigate', ownerNationId: N2, location: approach.seaId, approach,
      aggression: 'normal', ships: [{ ...WARSHIPS.frigate, id: 'ship', experience: 0 }] }]);
  }
  game = { ...game, townProgress: { [province.id]: { ownerId: N1, connectedSettlements: 6,
    matured: { textile: 0, wood: 1, metal: 0 }, upgradeSettlements: { textile: 0, wood: 1, metal: 0 } } } };
  const live = createGameStore({ game });
  live.setState({ replayBoundary: { turn: 1, appliedOrders: 0, checkpoint: game } });
  expect(live.getState().submitOrder({ kind: 'setTransportAllocations', nationId: N1, allocations: { furniture: 1, lumber: 0 } })).toEqual({ ok: true });
  const openingFurniture = game.nations[0].warehouse.furniture ?? 0;
  live.getState().advanceTurn();
  const settled = live.getState().game;
  expect(townsOf(settled, owner).find(t => t.provinceId === province.id)?.connected).toBe(stage !== 'blockaded');
  expect(settled.townProgress?.[province.id]).toMatchObject(stage === 'captured'
    ? { ownerId: owner, connectedSettlements: 1, matured: { wood: 0 } }
    : { ownerId: owner, matured: { wood: stage === 'blockaded' ? 1 : 2 } });
  const saved = load(serializeSave(saveOf(live.getState())));
  const receipts = live.getState().eventLog[0].events.filter(e => e.type === 'town-receipt' && e.provinceId === province.id);
  expect(receipts).toEqual(stage === 'growing' ? [{ type: 'town-receipt', nationId: N1, turn: 1,
    provinceId: province.id, seatTileId: shore.id, lines: [
      { commodity: 'lumber', offered: 2, delivered: 0 }, { commodity: 'furniture', offered: 1, delivered: 1 },
    ] }] : []);
  expect(settled.nations[0].warehouse.furniture ?? 0).toBe(openingFurniture + (stage === 'growing' ? 1 : 0));
  expect(saved.eventLog).toEqual(live.getState().eventLog);
  expect(replaySession(saved)).toEqual(settled);
  expect(saved.game.townProgress).toEqual(settled.townProgress);
  const continued = createGameStore();
  continued.getState().restoreGame(saved);
  continued.getState().advanceTurn();
  live.getState().advanceTurn();
  expect(continued.getState().game).toEqual(live.getState().game);
  expect(continued.getState().eventLog).toEqual(live.getState().eventLog);
  expect(replaySession(continued.getState())).toEqual(live.getState().game);
});
