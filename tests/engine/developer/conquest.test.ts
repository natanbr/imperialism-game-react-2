// M18j T-04 (FR-637): what conquest, colonisation, a Great Power's fall and a colony boycott do to the Developer's
// holdings: they end with no refund, the conqueror owns the tile at its level, and the other nations' civilians there go
// to their own capital tiles with their jobs ended. The provinces here are taken undefended, so no random number is drawn.
import { describe, expect, it } from 'vitest';
import { universityCapital } from '@/engine/orders/civilianOrders';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { combatSystem } from '@/engine/systems/combatSystem';
import { capitalProvinceOf } from '@/engine/army/armies';
import { fallCapital, takeProvince } from '@/engine/army/conquest';
import { transferProvince } from '@/engine/world/provinces';
import { newsLines } from '@/components/gameText';
import type { GameState } from '@/types/GameState';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';
import { deepFreeze, locate, N1, N2, overseasViolations, setPair, setTile, setTreasury, tileAt, treasury, worldViolations } from '../fixtures';
import { ARVELIA, ARVELIA_P, clearArmy, continent, NE1, relocate, SUNDMARK } from '../armyFixtures';

const R1 = 'regiment-1';
const SUNDMARK_P = 'province-minor-2';
// Arvelia (continent seed 1): 12-3 coal hills, 12-4 iron hills, 10-3 forest timber, 13-5 plantation cotton. Sundmark: 12-10 coal hills.
const COAL = '12-3';
const IRON = '12-4';
const TIMBER = '10-3';
const COTTON = '13-5';
const SUNDMARK_COAL = '12-10';
const MINER = 5;

const developer = (nationId: string) => `developer-${nationId}-1`;
const miner = (nationId: string) => `worker-${nationId}-${MINER}`;
const capitalOf = (state: GameState, nationId: string) => universityCapital(state, state.nations.find(n => n.id === nationId)!)?.id;
const ownerOfTile = (state: GameState, tileId: string) => tileAt(state, tileId).ownerNationId;
const levelOf = (state: GameState, tileId: string) => tileAt(state, tileId).resource?.level;
const lost = (events: GameEvent[]) => events.filter(e => e.type === 'overseas-land-lost');
const nameOf = (id: string) => id;

/** Test setup: the nation's one Developer, Available, on the tile. */
function addDeveloper(state: GameState, nationId: string, tileId: string): GameState {
  const worker: Worker = {
    id: developer(nationId), type: WorkerType.Developer, nationId, assignedTileId: tileId, efficiency: 100,
    status: WorkerStatus.Available, justMoved: false,
  };
  return setTile(state, tileId, { workers: [...tileAt(state, tileId).workers, worker] });
}

/** Test setup: the tile held by `holderId` at `level`, as a settled purchase leaves it (FR-634). */
function hold(state: GameState, tileId: string, holderId: string, level: number, minorId = ARVELIA): GameState {
  const tile = tileAt(state, tileId);
  const held = setTile(state, tileId, { resource: { ...tile.resource!, level } });
  return { ...held, overseasLand: { ...held.overseasLand, [tileId]: { tileId, holderId, minorId, turn: 1, price: 2000 } } };
}

function ordered(state: GameState, ...orders: Order[]): GameState {
  return orders.reduce((s, order) => {
    const { state: next, result } = tryApplyOrder(s, order);
    if (!result.ok) throw new Error(`${order.kind} refused: ${result.reason}`);
    return next;
  }, state);
}

const develop = (nationId: string, tileId: string): Order => ({ kind: 'moveAndStartDevelopment', nationId, workerId: miner(nationId), toTileId: tileId });
const attack = (nationId: string, fromProvinceId: string, toProvinceId: string): Order =>
  ({ kind: 'moveArmy', nationId, fromProvinceId, regimentIds: [R1], toProvinceId });

function run(state: GameState, step: (s: GameState, emit: (e: GameEvent) => void) => GameState) {
  const events: GameEvent[] = [];
  return { state: step(state, e => events.push(e)), events };
}

/**
 * Testland at war with an undefended Arvelia, its 1st Regulars in its North-East; both powers hold an embassy and $50,000.
 * Testland holds Arvelia's coal (level 0) and its Miner is opening the mine; Valdoria holds the iron at level 1, its Miner
 * opening level 2, and its Developer stands on the cotton.
 */
function bothHold(): GameState {
  let s = relocate(clearArmy(continent('partners'), ARVELIA, ARVELIA_P), [R1], NE1);
  s = setPair(s, N2, ARVELIA, { points: 60, consulates: [N2], embassies: [N2] });
  s = setTreasury(setTreasury(s, N1, 50_000), N2, 50_000);
  s = hold(hold(s, COAL, N1, 0), IRON, N2, 1);
  s = addDeveloper(s, N2, COTTON);
  s = ordered(s, develop(N1, COAL), develop(N2, IRON));
  return setPair(s, N1, ARVELIA, { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [], pact: false });
}

describe('FR-637 a holding in a conquered province', () => {
  it('FR-637 the conquering holder owns its tile and a third power\'s holding there ends, both at their level and with no refund', () => {
    const start = deepFreeze(ordered(bothHold(), attack(N1, NE1, ARVELIA_P)));
    const ctx = (events: GameEvent[]) => createTurnContext({ turn: start.turn, seed: start.seed, emit: e => events.push(e) });
    const events: GameEvent[] = [];
    const state = combatSystem(start, ctx(events));

    expect([ownerOfTile(state, COAL), ownerOfTile(state, IRON), levelOf(state, COAL), levelOf(state, IRON)]).toEqual([N1, N1, 0, 1]);
    expect(state.overseasLand).toBeUndefined();
    expect([treasury(state, N1), treasury(state, N2)]).toEqual([treasury(start, N1), treasury(start, N2)]);
    // The holder's own Miner stays on its new land, its job ended; Valdoria's Miner and Developer go to Valdoria's capital
    expect([tileAt(state, COAL).developmentJob, tileAt(state, IRON).developmentJob]).toEqual([undefined, undefined]);
    expect(locate(state, miner(N1))).toMatchObject({ tile: { id: COAL }, worker: { status: WorkerStatus.Available } });
    for (const id of [miner(N2), developer(N2)]) {
      const home = locate(state, id)!;
      expect({ tile: home.tile.id, status: home.worker.status, justMoved: home.worker.justMoved, assigned: home.worker.assignedTileId, previous: home.worker.previousTileId })
        .toEqual({ tile: capitalOf(state, N2), status: WorkerStatus.Available, justMoved: false, assigned: capitalOf(state, N2), previous: undefined });
    }
    expect(lost(events)).toEqual([
      { type: 'overseas-land-lost', nationId: N1, tileId: COAL, minorId: ARVELIA, cause: 'conquest', byId: N1 },
      { type: 'overseas-land-lost', nationId: N2, tileId: IRON, minorId: ARVELIA, cause: 'conquest', byId: N1 },
    ]);
    expect(events.map(e => e.type).filter(t => t !== 'battle-resolved' && t !== 'grant-stopped'))
      .toEqual(['province-taken', 'overseas-land-lost', 'overseas-land-lost', 'minor-colonised']);
    expect(overseasViolations(state)).toEqual([]);
    // FR-639, FR-640: each holder reads its own loss only
    expect(newsLines(lost(events), N2, nameOf)).toHaveLength(1);
    expect(newsLines(lost(events).filter(e => e.nationId === N2), N1, nameOf)).toEqual([]);
  });

  it('FR-637 a province taken by a third power sends the holder\'s civilians home and ends their jobs', () => {
    let s = setTreasury(continent('partners'), N1, 50_000);
    s = addDeveloper(hold(hold(s, COAL, N1, 0), TIMBER, N1, 0), N1, TIMBER);
    s = deepFreeze(ordered(s, develop(N1, COAL)));
    const { state, events } = run(s, (x, emit) => fallCapital(takeProvince(x, ARVELIA_P, N2, x.turn, emit), ARVELIA, N2, x.turn, emit));

    expect([ownerOfTile(state, COAL), ownerOfTile(state, TIMBER), levelOf(state, COAL), levelOf(state, TIMBER)]).toEqual([N2, N2, 0, 0]);
    expect(state.overseasLand).toBeUndefined();
    expect(treasury(state, N1)).toBe(treasury(s, N1));
    expect([locate(state, miner(N1))!.tile.id, locate(state, developer(N1))!.tile.id]).toEqual([capitalOf(state, N1), capitalOf(state, N1)]);
    expect(tileAt(state, COAL)).toMatchObject({ workers: [] });
    expect(tileAt(state, COAL).developmentJob).toBeUndefined();
    // In the province's tile order
    expect(lost(events).map(e => [e.nationId, e.tileId, e.cause, 'byId' in e && e.byId])).toEqual([[N1, TIMBER, 'conquest', N2], [N1, COAL, 'conquest', N2]]);
    expect(state.minorNations.find(m => m.id === ARVELIA)!.colonyOf).toBe(N2);
    expect(overseasViolations(state)).toEqual([]);
  });

  it('FR-637 colonisation passes the Minor Nation\'s other provinces and ends the holdings there too', () => {
    // Hand-built: Arvelia also holds Sundmark's province, so colonising it passes a second province (every map minor has one)
    let s = transferProvince(continent('partners'), SUNDMARK_P, ARVELIA);
    s = hold(hold(s, COAL, N1, 0), SUNDMARK_COAL, N1, 1);
    const { state, events } = run(deepFreeze(s), (x, emit) => fallCapital(takeProvince(x, ARVELIA_P, N2, x.turn, emit), ARVELIA, N2, x.turn, emit));

    expect([ownerOfTile(state, COAL), ownerOfTile(state, SUNDMARK_COAL), levelOf(state, SUNDMARK_COAL)]).toEqual([N2, N2, 1]);
    expect(state.overseasLand).toBeUndefined();
    expect(lost(events).map(e => [e.tileId, e.cause])).toEqual([[COAL, 'conquest'], [SUNDMARK_COAL, 'colonisation']]);
  });

  it('FR-637 a conquest ends only the holdings on the province\'s tiles, and every province transfer drops them', () => {
    let s = hold(hold(continent('partners'), COAL, N1, 1), SUNDMARK_COAL, N2, 1, SUNDMARK);
    const { state, events } = run(deepFreeze(s), (x, emit) => takeProvince(x, ARVELIA_P, N2, x.turn, emit));
    expect(state.overseasLand).toEqual({ [SUNDMARK_COAL]: s.overseasLand![SUNDMARK_COAL] });
    expect(lost(events).map(e => e.tileId)).toEqual([COAL]);
    s = transferProvince(s, ARVELIA_P, N1);
    expect(s.overseasLand).toEqual({ [SUNDMARK_COAL]: { tileId: SUNDMARK_COAL, holderId: N2, minorId: SUNDMARK, turn: 1, price: 2000 } });
  });
});

describe('FR-637 a fallen Great Power', () => {
  it('FR-637 its holdings in other provinces end, the tiles stay with their Minor Nation at their level, and its civilians there are gone', () => {
    let s = setTreasury(continent('partners'), N1, 50_000);
    s = addDeveloper(hold(hold(hold(s, COAL, N1, 0), TIMBER, N1, 1), IRON, N2, 1), N1, TIMBER);
    s = deepFreeze(ordered(s, develop(N1, COAL)));
    const capital = capitalProvinceOf(s, N1)!.id;
    const { state, events } = run(s, (x, emit) => fallCapital(takeProvince(x, capital, N2, x.turn, emit), N1, N2, x.turn, emit));

    expect([ownerOfTile(state, COAL), ownerOfTile(state, TIMBER), levelOf(state, COAL), levelOf(state, TIMBER)]).toEqual([undefined, undefined, 0, 1]);
    // Valdoria's holding stays; Testland, without a capital tile, keeps no civilian
    expect(state.overseasLand).toEqual({ [IRON]: s.overseasLand![IRON] });
    expect([locate(state, miner(N1)), locate(state, developer(N1))]).toEqual([undefined, undefined]);
    expect(tileAt(state, COAL).developmentJob).toBeUndefined();
    expect(treasury(state, N1)).toBe(treasury(s, N1));
    expect(lost(events)).toEqual([
      { type: 'overseas-land-lost', nationId: N1, tileId: COAL, minorId: ARVELIA, cause: 'fall' },
      { type: 'overseas-land-lost', nationId: N1, tileId: TIMBER, minorId: ARVELIA, cause: 'fall' },
    ]);
    const types = events.map(e => e.type);
    expect(types.indexOf('nation-fallen')).toBeLessThan(types.indexOf('overseas-land-lost'));
    expect(overseasViolations(state)).toEqual([]);
  });
});

describe('FR-637 the world invariants after a holding ends', () => {
  it('FR-637 a tile its ended holding left at a new level passes then and on every later turn; a level changed with no holding is still caught', () => {
    const start = continent('partners');
    expect([levelOf(start, COAL), levelOf(start, TIMBER)]).toEqual([1, 1]);
    const s = deepFreeze(hold(hold(setTreasury(start, N1, 50_000), COAL, N1, 0), TIMBER, N1, 2));
    const capital = capitalProvinceOf(s, N1)!.id;
    const { state } = run(s, (x, emit) => fallCapital(takeProvince(x, capital, N2, x.turn, emit), N1, N2, x.turn, emit));
    expect(state.overseasLand).toBeUndefined();
    expect([levelOf(state, COAL), levelOf(state, TIMBER)]).toEqual([0, 2]);
    // The End Turn that ends them (`s` is the state it resolved from), and every one after
    expect(worldViolations(state, start, s)).toEqual([]);
    expect(worldViolations(state, start, state)).toEqual([]);
    const raised = setTile(state, TIMBER, { resource: { ...tileAt(state, TIMBER).resource!, level: 3 } });
    expect(worldViolations(raised, start, state)).toEqual([`minor tile ${TIMBER} changed`]);
    // Compared with the start alone, a changed level is reported
    expect(worldViolations(state, start)).toEqual([`minor tile ${COAL} changed`, `minor tile ${TIMBER} changed`]);
  });

  it('FR-633 FR-637 a purchase settled and ended in one End Turn leaves its tile at level 0, which the invariants accept', () => {
    const start = continent('partners');
    let s = setTreasury(setPair(start, N2, ARVELIA, { points: 60, consulates: [N2], embassies: [N2] }), N2, 50_000);
    s = addDeveloper(s, N2, capitalOf(s, N2)!);
    const bidding = deepFreeze(ordered(s, { kind: 'buyLand', nationId: N2, workerId: developer(N2), tileId: IRON }));
    // Sold at level 0 by the settlement, then the buyer fell in that End Turn's combat: no holding, no intent left
    const ended = setTile({ ...bidding, intents: [] }, IRON, { resource: { ...tileAt(bidding, IRON).resource!, level: 0 } });
    expect(worldViolations(ended, start, bidding)).toEqual([]);
    expect(worldViolations(ended, start, { ...bidding, intents: [] })).toEqual([`minor tile ${IRON} changed`]);
  });
});

describe('FR-637 the colony boycott (removal helper; the Order comes with Join the Empire, Q37)', () => {
  it('FR-637 ends only the boycotted rival\'s holdings in the owner\'s colonies whose land is still the Minor Nation\'s', async () => {
    const { endColonyBoycottedHoldings } = await import('@/engine/overseas/holdings');
    // Hand-built: Arvelia is Valdoria's colony but still owns its land (Join the Empire, not built)
    let s = continent('partners');
    s = { ...s, minorNations: s.minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: N2 } : m)) };
    s = setTreasury(hold(hold(hold(s, COAL, N1, 0), IRON, N2, 1), SUNDMARK_COAL, N1, 1, SUNDMARK), N1, 50_000);
    s = ordered(s, develop(N1, COAL));
    const start = deepFreeze(s);
    const { state, events } = run(start, (x, emit) => endColonyBoycottedHoldings(x, N2, N1, emit));

    expect(Object.keys(state.overseasLand!).sort()).toEqual([SUNDMARK_COAL, IRON].sort());
    expect([ownerOfTile(state, COAL), levelOf(state, COAL), tileAt(state, COAL).developmentJob]).toEqual([undefined, 0, undefined]);
    expect(locate(state, miner(N1))).toMatchObject({ tile: { id: capitalOf(state, N1) }, worker: { status: WorkerStatus.Available, justMoved: false } });
    expect(treasury(state, N1)).toBe(treasury(start, N1));
    expect(events).toEqual([{ type: 'overseas-land-lost', nationId: N1, tileId: COAL, minorId: ARVELIA, cause: 'colony-boycott' }]);
    expect(overseasViolations(state)).toEqual([]);
    // Nothing to remove: the input comes back unchanged
    const none = run(state, (x, emit) => endColonyBoycottedHoldings(x, N2, N1, emit));
    expect(none.state).toBe(state);
    expect(none.events).toEqual([]);
  });
});
