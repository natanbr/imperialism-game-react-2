// M18j T-04 (FR-641): version-1 saves across the Developer's rules. The M18h and M18d captures were written by the base
// rules at 8c03962 (seed 3, the app's store, saveOf at the Unix epoch, serializeSave): a settled save and the same turn
// with two accepted Orders (a freight allocation and a $500 consulate), on the continent and a Standard Random map, and a
// Two islands save with one Order. The M18i capture was written by main 521a7b4 with the same recipe (continent, two
// accepted Orders); it matches the M18h one except its rules marker, since towns-first freight changes nothing by turn 7.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { readSave, saveOf, serializeSave, type SavedGame } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';
import { replaySession } from '@/store/sessionReplay';
import { universityCapital } from '@/engine/orders/civilianOrders';
import type { GameState } from '@/types/GameState';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';
import { locate, N1, N2, setPair, setTile, setTreasury, tileAt, treasury } from '../engine/fixtures';
import { ARVELIA, ARVELIA_P, clearArmy, continent, NE1, relocate, SUNDMARK } from '../engine/armyFixtures';

const fixture = (name: string) => gunzipSync(readFileSync(join(__dirname, 'fixtures', name))).toString();

function load(raw: string) {
  const slot = readSave({ getItem: () => raw });
  if (slot.kind !== 'usable') throw new Error('Expected a usable v1 save');
  return slot.save;
}

const developers = (game: GameState) => game.map.tiles.flat().flatMap(t => t.workers).filter(w => w.type === WorkerType.Developer);
const m18jEvents = (save: SavedGame) => save.eventLog.flatMap(r => r.events)
  .filter(e => ['developer-arrived', 'land-purchased', 'land-purchase-refused', 'overseas-profit', 'overseas-land-lost'].includes(e.type));

/** Saves, reloads and replays each turn, and continues the reloaded game beside the live one (FR-358, FR-587). */
function continueBeside(live: ReturnType<typeof createGameStore>, turns: number) {
  const boundary = live.getState().replayBoundary;
  for (let t = 0; t < turns; t++) {
    const current = saveOf(live.getState());
    const encoded = serializeSave(current);
    expect(encoded.length).toBeLessThan(2_000_000);
    const reloaded = load(encoded);
    expect(reloaded.replayBoundary).toEqual(boundary);
    expect(reloaded.game).toEqual(current.game);
    expect(reloaded.eventLog).toEqual(current.eventLog);
    expect(replaySession(reloaded)).toEqual(current.game);
    const continued = createGameStore();
    continued.getState().restoreGame(reloaded);
    continued.getState().advanceTurn();
    live.getState().advanceTurn();
    expect(continued.getState().game).toEqual(live.getState().game);
    expect(continued.getState().eventLog).toEqual(live.getState().eventLog);
  }
  const last = saveOf(live.getState());
  expect(replaySession(load(serializeSave(last)))).toEqual(last.game);
}

it.each([
  ['m18h-continent-turn-7.json.gz', 'm18h', 7, 0],
  ['m18h-continent-turn-7-midturn.json.gz', 'm18h', 7, 2],
  ['m18h-random-turn-5.json.gz', 'm18h', 5, 0],
  ['m18h-random-turn-5-midturn.json.gz', 'm18h', 5, 2],
  ['m18i-continent-turn-7-midturn.json.gz', 'm18i', 7, 2],
] as const)('FR-641 continues the genuine save %s (%s) from its saved position with no Developer, holding or back pay', (file, revision, turn, paid) => {
  const raw = fixture(file);
  const original: SavedGame = JSON.parse(raw);
  expect(original.game.rulesRevision).toBe(revision);
  expect(original.replayBoundary).toBeUndefined();
  expect(original.ordersThisTurn).toHaveLength(paid);
  const imported = load(raw);
  // FR-641 (as FR-626): the replay boundary moves from turn 1 to the imported position, after its accepted Orders
  expect(imported.replayBoundary).toEqual({ turn, appliedOrders: paid, checkpoint: original.game });
  expect(imported.game).toEqual(original.game);
  expect(developers(imported.game)).toEqual([]);
  expect(imported.game).not.toHaveProperty('overseasLand');
  const live = createGameStore();
  live.getState().restoreGame(imported);
  continueBeside(live, 2);
  const after = saveOf(live.getState());
  expect(after.game.turn).toBe(turn + 2);
  // Chain m18h -> m18i -> m18j: either older marker becomes 'm18j' at the first continued settlement (FR-641 / FR-642).
  expect(after.game.rulesRevision).toBe('m18j');
  expect(after.replayBoundary).toEqual(imported.replayBoundary);
  expect(after.eventLog.slice(0, original.eventLog.length)).toEqual(original.eventLog);
  expect(m18jEvents(after)).toEqual([]);
});

it('FR-641 a genuine Two islands save keeps its replay boundary and the m18d revision', () => {
  const raw = fixture('m18d-two-islands-turn-4-midturn.json.gz');
  const original: SavedGame = JSON.parse(raw);
  expect(original.game.rulesRevision).toBe('m18d');
  const imported = load(raw);
  expect(imported.replayBoundary).toBeUndefined();
  expect(imported).toEqual(original);
  const live = createGameStore();
  live.getState().restoreGame(imported);
  continueBeside(live, 2);
  const after = saveOf(live.getState());
  expect(after.game.rulesRevision).toBe('m18d');
  expect(after.replayBoundary).toBeUndefined();
  expect(load(serializeSave(after)).replayBoundary).toBeUndefined();
});

const developer = (nationId: string) => `developer-${nationId}-1`;
const SUNDMARK_COAL = '12-10';
const IRON = '12-4';

/** Sundmark's first discovered timber tile (a forest, so for sale). */
const sundmarkTimber = (s: GameState) => s.provinces.find(p => p.id === 'province-minor-2')!.tileIds
  .find(id => tileAt(s, id).resource?.type === 'timber' && tileAt(s, id).resource?.discovered !== false)!;

/**
 * Hand-built M18j campaign (continent seed 1, partners market): Testland, the human, holds an embassy in Sundmark at 60
 * points, its Developer at the capital and $50,000, and is at war with an undefended Arvelia with its 1st Regulars in its
 * North-East. Valdoria holds Arvelia's iron at level 1.
 */
function campaign(): GameState {
  let s = relocate(clearArmy(continent('partners'), ARVELIA, ARVELIA_P), ['regiment-1'], NE1);
  s = setPair(s, N1, ARVELIA, { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [], pact: false });
  s = setPair(s, N1, SUNDMARK, { points: 60, consulates: [N1], embassies: [N1] });
  s = setTreasury(s, N1, 50_000);
  const capital = universityCapital(s, s.nations[0])!.id;
  const worker: Worker = { id: developer(N1), type: WorkerType.Developer, nationId: N1, assignedTileId: capital, efficiency: 100,
    status: WorkerStatus.Available, justMoved: false };
  s = setTile(s, capital, { workers: [...tileAt(s, capital).workers, worker] });
  s = setTile(s, IRON, { resource: { ...tileAt(s, IRON).resource!, level: 1 } });
  return { ...s, overseasLand: { [IRON]: { tileId: IRON, holderId: N2, minorId: ARVELIA, turn: 1, price: 2300 } } };
}

it('FR-641 saves, reloads and replays an M18j game with a cancelled and a pending purchase, a new holding and a conquered one', () => {
  const game = campaign();
  const SUNDMARK_TIMBER = sundmarkTimber(game);
  expect(SUNDMARK_TIMBER).toBeDefined();
  const live = createGameStore({ game });
  live.setState({ replayBoundary: { turn: 1, appliedOrders: 0, checkpoint: game } });
  const submit = (order: Parameters<ReturnType<typeof live.getState>['submitOrder']>[0]) => expect(live.getState().submitOrder(order)).toEqual({ ok: true });
  submit({ kind: 'buyLand', nationId: N1, workerId: developer(N1), tileId: SUNDMARK_COAL });
  submit({ kind: 'cancelWorkerAction', nationId: N1, workerId: developer(N1), tileId: SUNDMARK_COAL });
  expect(treasury(live.getState().game, N1)).toBe(50_000);
  // The second cancel undoes the move (FR-031), so the Developer may set out again this turn
  submit({ kind: 'cancelWorkerAction', nationId: N1, workerId: developer(N1), tileId: SUNDMARK_COAL });
  submit({ kind: 'buyLand', nationId: N1, workerId: developer(N1), tileId: SUNDMARK_TIMBER });
  submit({ kind: 'moveArmy', nationId: N1, fromProvinceId: NE1, regimentIds: ['regiment-1'], toProvinceId: ARVELIA_P });
  const pending = live.getState().game;
  expect(pending.intents.filter(i => i.kind === 'buy-land')).toHaveLength(1);
  const cost = 50_000 - treasury(pending, N1);
  expect(cost).toBeGreaterThan(0);

  // Mid-turn: the pending purchase, its payment and the cancelled one survive a reload and a replay
  const midTurn = load(serializeSave(saveOf(live.getState())));
  expect(midTurn.game).toEqual(pending);
  expect(replaySession(midTurn)).toEqual(pending);

  continueBeside(live, 2);
  const after = saveOf(live.getState());
  const events = m18jEvents(after);
  expect(events).toContainEqual({ type: 'land-purchased', nationId: N1, workerId: developer(N1), tileId: SUNDMARK_TIMBER, minorId: SUNDMARK, cost });
  expect(events).toContainEqual({ type: 'overseas-land-lost', nationId: N2, tileId: IRON, minorId: ARVELIA, cause: 'conquest', byId: N1 });
  expect(after.game.overseasLand).toEqual({ [SUNDMARK_TIMBER]: { tileId: SUNDMARK_TIMBER, holderId: N1, minorId: SUNDMARK, turn: 1, price: cost } });
  expect(tileAt(after.game, IRON)).toMatchObject({ ownerNationId: N1, resource: { level: 1 } });
  expect(locate(after.game, developer(N1))).toBeDefined();
  expect(events.some(e => e.type === 'overseas-profit' && e.nationId === N1)).toBe(true);
  expect(after.game.rulesRevision).toBe('m18j');
});
