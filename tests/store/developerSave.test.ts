// M18j T-04 (FR-641): version-1 saves across the Developer's rules. The M18h and M18d captures were written by the base
// rules at 8c03962 (seed 3, the app's store, saveOf at the Unix epoch, serializeSave): a settled save and the same turn
// with two accepted Orders (a freight allocation and a $500 consulate), on the continent and a Standard Random map, and a
// Two islands save with one Order. The M18i capture was written by main 521a7b4 with the same recipe (continent, two
// accepted Orders); it matches the M18h one except its rules marker, since towns-first freight changes nothing by turn 7.
// The M18i continent seed 8 capture is main 521a7b4 after 38 idle End Turns (sha256 of the JSON 005f669b…48b13ba).
// The two Two islands seed 1 captures are main 521a7b4 too, with a moved and a cancelled Prospector (Codex task 63).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { readSave, saveOf, serializeSave, type SavedGame } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';
import { replaySession } from '@/store/sessionReplay';
import { universityCapital } from '@/engine/orders/civilianOrders';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
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

it('FR-641 FR-629 an imported save whose embassy already qualifies gets its Developer at its first continued settlement, not at load, with no back pay', () => {
  const original: SavedGame = JSON.parse(fixture('m18h-continent-turn-7.json.gz'));
  // The M18h rules granted nothing; the same position with Testland's embassy in Arvelia already at 60 points (level 6)
  const game = setPair(original.game, N1, ARVELIA, { points: 60, consulates: [N1], embassies: [N1] });
  const imported = load(JSON.stringify({ ...original, game }));
  expect(imported.replayBoundary).toEqual({ turn: 7, appliedOrders: 0, checkpoint: game });
  expect(developers(imported.game)).toEqual([]);
  const live = createGameStore();
  live.getState().restoreGame(imported);
  continueBeside(live, 1);
  const after = saveOf(live.getState());
  // The continued End Turn of turn 7 runs the M18j rules: one Developer, Available on the capital tile for turn 8
  const capital = universityCapital(after.game, after.game.nations.find(n => n.id === N1)!)!.id;
  expect(developers(after.game).map(w => [w.id, w.status, w.assignedTileId])).toEqual([[`developer-${N1}-7`, WorkerStatus.Available, capital]]);
  expect(m18jEvents(after)).toEqual([expect.objectContaining({ type: 'developer-arrived', nationId: N1 })]);
  expect(after.game).not.toHaveProperty('overseasLand');
  expect(after.game.rulesRevision).toBe('m18j');
  expect(after.replayBoundary).toEqual(imported.replayBoundary);
});

// Written by main 521a7b4 (M18i) after 38 idle human turns on continent seed 8 (the app's store, saveOf at the Unix epoch,
// serializeSave). Valdoria's embassy in Sundmark stands at 60 points, which the M18j rules reward with a Developer.
it('FR-641 a genuine M18i campaign replays under its own rules, and its first continued settlement runs the M18j rules', () => {
  const raw = fixture('m18i-continent-seed-8-turn-39.json.gz');
  expect(createHash('sha256').update(raw).digest('hex')).toBe('005f669b350c27c34e209263177273643b1dbb03c47a67e30bfd8576348b13ba');
  const original: SavedGame = JSON.parse(raw);
  expect(original.version).toBe(1);
  expect([original.game.turn, original.game.rulesRevision, original.replayBoundary, original.ordersThisTurn]).toEqual([39, 'm18i', undefined, []]);
  expect(original.game.diplomacy[`${SUNDMARK}|${N2}`]).toMatchObject({ points: 60, embassies: [N2] });
  expect(developers(original.game)).toEqual([]);

  // Codex task 62 finding 1: replaying the log settled every turn under M18j (`m18j`, `developer-nation-2-38`).
  // Every logged turn settles under the rules it was played with, so the replay is the saved game.
  const replayed = replaySession(original);
  expect(replayed.rulesRevision).toBe('m18i');
  expect(developers(replayed)).toEqual([]);
  expect(replayed).toEqual(original.game);

  // Continue: the boundary moves to the saved position, which replays exactly
  const imported = load(raw);
  expect(imported.replayBoundary).toEqual({ turn: 39, appliedOrders: 0, checkpoint: original.game });
  expect(replaySession(imported)).toEqual(original.game);

  // The first live settlement after the import runs the current rules
  const live = createGameStore();
  live.getState().restoreGame(imported);
  continueBeside(live, 1);
  const after = saveOf(live.getState());
  expect(after.game.rulesRevision).toBe('m18j');
  expect(developers(after.game).map(w => w.id)).toEqual([`developer-${N2}-39`]);
  expect(after.replayBoundary).toEqual(imported.replayBoundary);
});

it('FR-629 an embassy the human orders this turn counts from the next settlement: store, mid-turn reload and batched End Turn agree', () => {
  const start = setPair(newGame({ seed: 1, world: 'continent' }), N1, ARVELIA, { points: 65, consulates: [N1], embassies: [] });
  const embassy = { kind: 'proposeOverture', nationId: N1, overture: 'embassy', targetId: ARVELIA } as const;
  const testland = (game: GameState) => developers(game).filter(w => w.nationId === N1).map(w => w.id);

  // Batched: the Order passed to the End Turn with the turn's other Orders
  const batched = resolveTurn(start, { [N1]: [embassy] });
  expect(batched.state.diplomacy[`${ARVELIA}|${N1}`].embassies).toEqual([N1]);
  expect(testland(batched.state)).toEqual([]);
  expect(testland(resolveTurn(batched.state, {}).state)).toEqual([`developer-${N1}-2`]);

  // Codex task 62 finding 2: the store applies the human's Order when submitted, so End Turn granted `developer-nation-1-1`
  const live = createGameStore({ game: start });
  live.setState({ replayBoundary: { turn: 1, appliedOrders: 0, checkpoint: start } });
  expect(live.getState().submitOrder(embassy)).toEqual({ ok: true });
  const midTurn = load(serializeSave(saveOf(live.getState())));
  expect(midTurn.ordersThisTurn).toEqual([embassy]);
  const reloaded = createGameStore();
  reloaded.getState().restoreGame(midTurn);
  for (const [label, store] of [['store', live], ['reloaded', reloaded]] as const) {
    store.getState().advanceTurn();
    expect({ label, granted: testland(store.getState().game) }).toEqual({ label, granted: [] });
    expect(store.getState().game.diplomacy[`${ARVELIA}|${N1}`].embassies).toEqual([N1]);
    store.getState().advanceTurn();
    expect({ label, granted: testland(store.getState().game) }).toEqual({ label, granted: [`developer-${N1}-2`] });
    const saved = load(serializeSave(saveOf(store.getState())));
    expect(replaySession(saved)).toEqual(store.getState().game);
  }
  expect(reloaded.getState().game).toEqual(live.getState().game);
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

// Written by main 521a7b4 on Two islands seed 1 (the app's store with world 'two-islands', saveOf at the Unix epoch,
// serializeSave): on turn 2 the Prospector worker-nation-1-1 moved from the capital 2-9 to 3-1, saved with the move
// pending, then the move cancelled and saved again. Two islands keeps the m18d rules, so Continue installs no checkpoint:
// the saved log itself must replay. On main an undone move puts the civilian last on its tile.
const TWO_ISLANDS_MOVE = 'm18i-two-islands-seed-1-turn-2-move.json.gz';
const TWO_ISLANDS_CANCELLED = 'm18i-two-islands-seed-1-turn-2-cancelled.json.gz';
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const capitalStack = (game: GameState) => tileAt(game, '2-9').workers.map(w => w.id);

it.each([
  [TWO_ISLANDS_MOVE, '922d1d32b8e756d10665392800570e4587f50d0403964841753b812894b15521', 1],
  [TWO_ISLANDS_CANCELLED, 'e7d16b34c28e2384ed78106d2080061a021b10ef559c8a63d4d5237c40f0775b', 2],
] as const)('FR-641 FR-642 the genuine Two islands save %s replays and continues byte for byte, with no boundary (Codex task 63 finding 1)', (file, hash, orders) => {
  const raw = fixture(file);
  expect(sha256(raw)).toBe(hash);
  const original: SavedGame = JSON.parse(raw);
  expect([original.version, original.game.turn, original.game.rulesRevision, original.replayBoundary, original.ordersThisTurn.length])
    .toEqual([1, 2, 'm18d', undefined, orders]);
  // Red before the fix: the replayed move recorded `previousIndex: 0`, and the replayed cancel put the Prospector first
  expect(JSON.stringify(replaySession(original))).toBe(JSON.stringify(original.game));

  const imported = load(raw);
  expect(imported.replayBoundary).toBeUndefined();
  const live = createGameStore();
  live.getState().restoreGame(imported);
  const resaved = serializeSave(saveOf(live.getState(), new Date(0)));
  expect(resaved).toBe(raw);
  expect(JSON.stringify(replaySession(load(resaved)))).toBe(JSON.stringify(original.game));
  continueBeside(live, 2);
  const after = saveOf(live.getState());
  expect([after.game.turn, after.game.rulesRevision, after.replayBoundary]).toEqual([4, 'm18d', undefined]);
});

it('FR-641 FR-031 cancelling the genuine pending Two islands move gives main\'s cancelled save byte for byte (Codex task 63 finding 1)', () => {
  const cancelled = fixture(TWO_ISLANDS_CANCELLED);
  expect(capitalStack(JSON.parse(cancelled).game)).toEqual([2, 3, 4, 5, 6, 7, 1].map(n => `worker-nation-1-${n}`));
  const live = createGameStore();
  live.getState().restoreGame(load(fixture(TWO_ISLANDS_MOVE)));
  expect(live.getState().submitOrder({ kind: 'cancelWorkerAction', nationId: N1, workerId: 'worker-nation-1-1', tileId: '3-1' })).toEqual({ ok: true });
  expect(serializeSave(saveOf(live.getState(), new Date(0)))).toBe(cancelled);
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
