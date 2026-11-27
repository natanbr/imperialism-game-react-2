// M18j T-02: where the Developer may go and what it may buy (FR-631), the land purchase Order and its price (FR-632),
// settlement with competing buyers (FR-633), and the holding with work on held land (FR-634).
import { describe, expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { universityCapital } from '@/engine/orders/civilianOrders';
import { applyOrder, tryApplyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import { computerOrders } from '@/engine/ai/players';
import { partnerTieOrder } from '@/engine/market/partners';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { createTurnContext, type GameEvent, type TurnSystem } from '@/engine/turn/context';
import { transferProvince } from '@/engine/world/provinces';
import { newsLines } from '@/components/gameText';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { ResourceType } from '@/types/Resource';
import type { TradeCommodity } from '@/types/Market';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';
import {
  deepFreeze, invariantViolations, locate, N1, N2, overseasViolations, put, setPair, setTechnologies, setTile, setTreasury, tileAt,
  treasury, worldViolations,
} from '../fixtures';

// Imported when a test runs, so each test of this file reports its own result before the phase exists.
const purchasePhase = async (): Promise<TurnSystem> => (await import('@/engine/overseas/holdings')).landPurchaseSystem;

const ARVELIA = 'minor-1';
const ARVELIA_PROVINCE = 'province-minor-1';
// Arvelia (continent seed 1): 12-3 coal hills, 10-4 coal hills, 12-4 iron hills, 10-3 forest timber, 10-5 horse ranch,
// 13-5 plantation cotton, 11-4 its capital. Testland's 9-3 forest borders it. Sundmark's 12-10 is coal hills.
const COAL = '12-3';
const COAL2 = '10-4';
const IRON = '12-4';
const TIMBER = '10-3';
const HORSES = '10-5';
const COTTON = '13-5';
const MINOR_CAPITAL = '11-4';
const SUNDMARK_COAL = '12-10';
const TESTLAND_FOREST = '9-3';

const developer = (nationId: string) => `developer-${nationId}-1`;
const civilian = (nationId: string, index: number) => `worker-${nationId}-${index}`;
// START_CIVILIANS order: prospector, farmer, rancher, forester, miner, driller, engineer
const PROSPECTOR = 1;
const FORESTER = 4;
const MINER = 5;
const DRILLER = 6;
const ENGINEER = 7;

const capitalOf = (state: GameState, nationId: string) => universityCapital(state, state.nations.find(n => n.id === nationId)!)!.id;

/** Test setup: the nation's one Developer, Available and unmoved, last on the tile (its capital by default). */
function addDeveloper(state: GameState, nationId: string, tileId = capitalOf(state, nationId)): GameState {
  const worker: Worker = {
    id: developer(nationId), type: WorkerType.Developer, nationId, assignedTileId: tileId, efficiency: 100,
    status: WorkerStatus.Available, justMoved: false,
  };
  return setTile(state, tileId, { workers: [...tileAt(state, tileId).workers, worker] });
}

/** The nation holds an embassy (and a consulate) with the minor in the settled record. */
const embassy = (state: GameState, nationId: string, minorId = ARVELIA, points = 60) =>
  setPair(state, nationId, minorId, { points, consulates: [nationId], embassies: [nationId] });

/** Testland with its Developer at the capital, an embassy in Arvelia and $50,000. */
const base = (seed = 1) => addDeveloper(setTreasury(embassy(newGame({ seed, world: 'continent' }), N1), N1, 50_000), N1);

/** Both Great Powers with a Developer, an embassy in Arvelia at the given points and $50,000. */
const twoBuyers = (n1Points: number, n2Points: number, seed = 1) =>
  addDeveloper(setTreasury(embassy(embassy(base(seed), N1, ARVELIA, n1Points), N2, ARVELIA, n2Points), N2, 50_000), N2);

const buy = (tileId: string, nationId = N1): Order => ({ kind: 'buyLand', nationId, workerId: developer(nationId), tileId });
const move = (workerId: string, toTileId: string, nationId = N1): Order => ({ kind: 'moveWorker', nationId, workerId, toTileId });
const develop = (workerId: string, toTileId: string, nationId = N1): Order => ({ kind: 'moveAndStartDevelopment', nationId, workerId, toTileId });

function setPrice(state: GameState, commodity: TradeCommodity, price: number): GameState {
  return { ...state, market: { ...state.market!, prices: { ...state.market!.prices, [commodity]: price } } };
}

/** Test setup: the tile held by `holderId` at `level`, as a settled purchase leaves it (FR-634). */
function hold(state: GameState, tileId: string, holderId = N1, level = 0): GameState {
  const tile = tileAt(state, tileId);
  const held = setTile(state, tileId, { resource: { ...tile.resource!, level } });
  return { ...held, overseasLand: { ...held.overseasLand, [tileId]: { tileId, holderId, minorId: ARVELIA, turn: 1, price: 2000 } } };
}

function order(state: GameState, action: Order): GameState {
  const attempt = tryApplyOrder(state, action);
  expect(attempt.result).toEqual({ ok: true });
  return attempt.state;
}

/** The phase alone, with a context that fails on any RNG draw (FR-633: settlement draws none). */
async function settle(state: GameState, turn = state.turn) {
  const events: GameEvent[] = [];
  const ctx = {
    ...createTurnContext({ turn, seed: state.seed, emit: event => events.push(event) }),
    get rng(): never { throw new Error('FR-633: settlement draws no random number'); },
    rngFor: (): never => { throw new Error('FR-633: settlement draws no random number'); },
  };
  const phase = await purchasePhase();
  return { state: phase(state, ctx), events };
}

const landEvents = (events: readonly GameEvent[]) => events.filter(e => e.type === 'land-purchased' || e.type === 'land-purchase-refused');
const nameOf = (id: string) => id;

describe('FR-631 where the Developer may go and what it may buy', () => {
  it('FR-631 one Order moves the Developer any distance into a Minor Nation where its nation holds an embassy', () => {
    const s = deepFreeze(base());
    expect(validateOrder(s, move(developer(N1), COAL))).toEqual({ ok: true });
    expect(validateOrder(s, move(developer(N1), MINOR_CAPITAL))).toEqual({ ok: true });
    expect(validateOrder(s, move(developer(N1), TESTLAND_FOREST))).toEqual({ ok: true });
    const moved = applyOrder(s, move(developer(N1), COAL));
    expect(locate(moved, developer(N1))!.tile.id).toBe(COAL);
    // Sundmark: no embassy
    expect(validateOrder(s, move(developer(N1), SUNDMARK_COAL))).toEqual({ ok: false, reason: 'needs-embassy' });
  });

  it('FR-631 the Minor Nation stays closed without an embassy, with one ordered this turn, at war and under a boycott either way', () => {
    const noEmbassy = setPair(base(), N1, ARVELIA, { embassies: [] });
    expect(validateOrder(noEmbassy, move(developer(N1), COAL))).toEqual({ ok: false, reason: 'needs-embassy' });
    expect(validateOrder(noEmbassy, buy(COAL))).toEqual({ ok: false, reason: 'needs-embassy' });

    const ordered = order(noEmbassy, { kind: 'proposeOverture', nationId: N1, overture: 'embassy', targetId: ARVELIA });
    expect(validateOrder(ordered, buy(COAL))).toEqual({ ok: false, reason: 'needs-embassy' });

    const war = setPair(base(), N1, ARVELIA, { war: { aggressors: [N1], since: 1 } });
    expect(validateOrder(war, move(developer(N1), COAL))).toEqual({ ok: false, reason: 'at-war' });
    expect(validateOrder(war, buy(COAL))).toEqual({ ok: false, reason: 'at-war' });

    for (const boycotter of [N1, ARVELIA]) {
      const boycott = setPair(base(), N1, ARVELIA, { boycotts: [boycotter] });
      expect(validateOrder(boycott, move(developer(N1), COAL))).toEqual({ ok: false, reason: 'boycott' });
      expect(validateOrder(boycott, buy(COAL))).toEqual({ ok: false, reason: 'boycott' });
    }

    // Already standing in Arvelia when the embassy is gone: no purchase there either
    const inside = setPair(put(base(), developer(N1), COAL2), N1, ARVELIA, { embassies: [] });
    expect(validateOrder(inside, buy(COAL2))).toEqual({ ok: false, reason: 'needs-embassy' });
  });

  it('FR-631 another Great Power\'s land and colony stay closed; its own colony whose land is still the Minor Nation\'s is open', () => {
    const s = base();
    const valdoria = s.map.tiles.flat().find(t => t.ownerNationId === N2 && t.resource?.type === ResourceType.Timber)!;
    expect(validateOrder(s, move(developer(N1), valdoria.id))).toEqual({ ok: false, reason: 'not-owner' });
    expect(validateOrder(s, buy(valdoria.id))).toEqual({ ok: false, reason: 'not-owner' });

    const colonyOf = (state: GameState, owner: string) => ({ ...state, minorNations: state.minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: owner } : m)) });
    expect(validateOrder(colonyOf(s, N2), move(developer(N1), COAL))).toEqual({ ok: false, reason: 'colony' });
    expect(validateOrder(colonyOf(s, N2), buy(COAL))).toEqual({ ok: false, reason: 'colony' });
    const own = colonyOf(setPair(s, N1, ARVELIA, { embassies: [], consulates: [] }), N1);
    expect(validateOrder(own, move(developer(N1), COAL))).toEqual({ ok: true });
    expect(validateOrder(own, buy(COAL))).toEqual({ ok: true });
  });

  it('FR-631 FR-633 its own colony closes under a boycott either way and once a war has begun; a war declared this turn still sells', async () => {
    // Codex task 62 finding 5: the own-colony exemption returned before the pair's war and boycott were read
    const colonyOf = (state: GameState, owner: string) => ({ ...state, minorNations: state.minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: owner } : m)) });
    const own = colonyOf(setPair(base(), N1, ARVELIA, { embassies: [], consulates: [] }), N1);
    const barred: [string, GameState, string][] = [
      ['Testland boycotts', setPair(own, N1, ARVELIA, { boycotts: [N1] }), 'boycott'],
      ['Arvelia boycotts', setPair(own, N1, ARVELIA, { boycotts: [ARVELIA] }), 'boycott'],
      ['war begun', setPair(own, N1, ARVELIA, { war: { aggressors: [N1], since: 1 } }), 'at-war'],
    ];
    for (const [label, s, reason] of barred) {
      expect({ label, move: validateOrder(s, move(developer(N1), COAL)), buy: validateOrder(s, buy(COAL)) })
        .toEqual({ label, move: { ok: false, reason }, buy: { ok: false, reason } });
      // A purchase ordered while open is refused and refunded when the bar stands at settlement
      const pending = order(own, buy(COAL));
      const cost = 50_000 - treasury(pending, N1)!;
      expect(cost).toBeGreaterThan(0);
      const barredPending = { ...s, intents: pending.intents, map: pending.map, nations: pending.nations };
      const { state, events } = await settle(barredPending);
      expect({ label, events: landEvents(events) }).toEqual({ label, events: [{
        type: 'land-purchase-refused', nationId: N1, workerId: developer(N1), tileId: COAL, minorId: ARVELIA, cost, reason,
      }] });
      expect(treasury(state, N1)).toBe(50_000);
    }
    // A war declared this turn begins next turn (FR-167): the End Turn of the declaration still sells, as outside a colony
    const declared = setPair(own, N1, ARVELIA, { war: { aggressors: [N1], since: own.turn + 1 } });
    expect(validateOrder(declared, buy(COAL))).toEqual({ ok: true });
    const sold = await settle(order(declared, buy(COAL)));
    expect(landEvents(sold.events).map(e => e.type)).toEqual(['land-purchased']);
    // Open, it needs no embassy
    expect(validateOrder(own, buy(COAL))).toEqual({ ok: true });
  });

  it('FR-631 refuses the Minor Nation\'s capital, food, horses, a hidden seam, a held tile and the nation\'s own land', () => {
    const s = base();
    expect(validateOrder(s, buy(MINOR_CAPITAL))).toEqual({ ok: false, reason: 'invalid-site' });
    const capitalWithCoal = setTile(s, MINOR_CAPITAL, { resource: { type: ResourceType.Coal, level: 1, discovered: true } });
    expect(validateOrder(capitalWithCoal, buy(MINOR_CAPITAL))).toEqual({ ok: false, reason: 'invalid-site' });
    expect(validateOrder(s, buy(HORSES))).toEqual({ ok: false, reason: 'invalid-site' });
    for (const [terrain, food] of [[TerrainType.Farm, ResourceType.Grain], [TerrainType.Orchard, ResourceType.Fruit], [TerrainType.OpenRange, ResourceType.Livestock], [TerrainType.Plantation, ResourceType.Fish]] as const) {
      expect(validateOrder(setTile(s, COTTON, { terrain, resource: { type: food, level: 1, discovered: true } }), buy(COTTON))).toEqual({ ok: false, reason: 'invalid-site' });
    }
    expect(validateOrder(setTile(s, COAL, { resource: { type: ResourceType.Coal, level: 0, discovered: false } }), buy(COAL))).toEqual({ ok: false, reason: 'invalid-target' });
    expect(validateOrder(setTile(s, COAL, { resource: undefined }), buy(COAL))).toEqual({ ok: false, reason: 'invalid-target' });
    expect(validateOrder(hold(s, COAL, N2), buy(COAL))).toEqual({ ok: false, reason: 'already-owned' });
    expect(validateOrder(hold(s, COAL, N1), buy(COAL))).toEqual({ ok: false, reason: 'already-owned' });
    // Its own coal, standing on it
    const ownCoal = '5-2';
    const onOwn = put(setTile(s, ownCoal, { resource: { type: ResourceType.Coal, level: 0, discovered: true } }), developer(N1), ownCoal);
    expect(validateOrder(onOwn, buy(ownCoal))).toEqual({ ok: false, reason: 'not-owner' });
  });

  it('FR-631 every terrain x resource pair is accepted or refused with a stable reason, and an accepted one is priced', () => {
    // The spec's lists (rules 03 section 5): what a Developer may buy, on which terrain
    const buyableResources: string[] = ['gold', 'gems', 'coal', 'ironOre', 'cotton', 'wool', 'timber', 'oil'];
    const buyableTerrains: string[] = ['hardwoodForest', 'scrubForest', 'fertileHills', 'barrenHills', 'mountains', 'plantation', 'desert', 'tundra', 'swamp'];
    const price: Record<string, number> = { gold: 4000, gems: 10_000 };
    const s = base();
    const seen: Record<string, number> = {};
    for (const terrain of Object.values(TerrainType)) {
      for (const resource of [undefined, ...Object.values(ResourceType)]) {
        const site = setTile(s, COAL2, { terrain, hasRiver: false, resource: resource && { type: resource, level: 1, discovered: true } });
        const result = validateOrder(site, buy(COAL2));
        const expected = terrain === TerrainType.Water || terrain === TerrainType.River || resource === undefined
          ? 'invalid-target'
          : buyableTerrains.includes(terrain) && buyableResources.includes(resource) ? 'ok' : 'invalid-site';
        expect([terrain, resource, result]).toEqual([terrain, resource, expected === 'ok' ? { ok: true } : { ok: false, reason: expected }]);
        if (expected === 'ok') {
          expect([terrain, resource, treasury(applyOrder(site, buy(COAL2)), N1)]).toEqual([terrain, resource, 50_000 - (price[resource!] ?? 2000)]);
        }
        seen[expected] = (seen[expected] ?? 0) + 1;
      }
    }
    expect(seen).toEqual({ ok: 72, 'invalid-site': 149, 'invalid-target': 45 });
  });

  it('FR-631 no other civilian may enter Minor Nation land, even with the embassy', () => {
    const s = base();
    for (const index of [PROSPECTOR, FORESTER, MINER, DRILLER, ENGINEER]) {
      expect(validateOrder(s, move(civilian(N1, index), COAL))).toEqual({ ok: false, reason: 'not-owner' });
    }
    expect(validateOrder(s, develop(civilian(N1, FORESTER), TIMBER))).toEqual({ ok: false, reason: 'not-owner' });
    expect(validateOrder(s, { kind: 'buyLand', nationId: N1, workerId: civilian(N1, MINER), tileId: COAL })).toEqual({ ok: false, reason: 'wrong-worker-type' });
  });

  it('FR-631 a Developer that moved or is buying cannot order again this turn', () => {
    const moved = order(base(), move(developer(N1), COAL));
    expect(validateOrder(moved, buy(COAL))).toEqual({ ok: false, reason: 'worker-moved' });
    const buying = order(base(), buy(COAL));
    expect(validateOrder(buying, buy(IRON))).toEqual({ ok: false, reason: 'worker-busy' });
  });
});

describe('FR-632 the land purchase Order and its price', () => {
  it('FR-632 coal costs 20 x its board price: $2,220 at $111 and $2,400 at $120, charged at order time', () => {
    for (const [unit, cost] of [[111, 2220], [120, 2400]]) {
      const s = deepFreeze(setPrice(base(), ResourceType.Coal, unit));
      const after = order(s, buy(COAL));
      expect(treasury(after, N1)).toBe(50_000 - cost);
      expect(after.intents).toEqual([{ id: 'intent-1-1', kind: 'buy-land', nationId: N1, turn: 1, targetId: ARVELIA, workerId: developer(N1), tileId: COAL, cost }]);
      const { worker, tile } = locate(after, developer(N1))!;
      expect([tile.id, worker.status, worker.justMoved, worker.previousTileId]).toEqual([COAL, WorkerStatus.Working, true, capitalOf(s, N1)]);
      // Nothing of Arvelia's tile changes at order time
      expect({ ...tile, workers: [] }).toEqual({ ...tileAt(s, COAL), workers: [] });
      expect(after.overseasLand).toBeUndefined();
    }
  });

  it('FR-632 START_PRICES where the market has no price, the start market on a state without one, gold $4,000 and gems $10,000', () => {
    const s = base();
    const noCoal = { ...s, market: { ...s.market!, prices: Object.fromEntries(Object.entries(s.market!.prices).filter(([k]) => k !== 'coal')) as Record<TradeCommodity, number> } };
    expect(treasury(order(noCoal, buy(COAL)), N1)).toBe(48_000);
    const noMarket = { ...setPrice(s, ResourceType.Coal, 150) };
    delete noMarket.market;
    expect(treasury(order(noMarket, buy(COAL)), N1)).toBe(48_000);
    const gold = setTile(s, COAL, { terrain: TerrainType.Mountains, resource: { type: ResourceType.Gold, level: 1, discovered: true } });
    expect(treasury(order(gold, buy(COAL)), N1)).toBe(46_000);
    const gems = setTile(s, COAL, { terrain: TerrainType.Mountains, resource: { type: ResourceType.Gems, level: 1, discovered: true } });
    expect(treasury(order(gems, buy(COAL)), N1)).toBe(40_000);
  });

  it('FR-632 short of cash, the nation buys within its open credit and is refused above it', () => {
    const open = applyOrder(base(), { kind: 'openCredit', nationId: N1 });
    const short = deepFreeze(setTreasury(open, N1, 2000 - 201));
    const refused = tryApplyOrder(short, buy(COAL));
    expect(refused.state).toBe(short);
    expect(refused.result).toEqual({ ok: false, reason: 'insufficient-funds', cost: 2000, buyingPower: 1999 });
    expect(treasury(order(setTreasury(open, N1, 2000 - 200), buy(COAL)), N1)).toBe(-200);
    // Without credit the cash alone counts
    expect(validateOrder(setTreasury(base(), N1, 1999), buy(COAL))).toEqual({ ok: false, reason: 'insufficient-funds' });
  });

  it('FR-632 cancelling before End Turn restores the treasury, the Developer and the tile exactly', () => {
    const start = deepFreeze(base());
    const bought = order(start, buy(COAL));
    const cancel: Order = { kind: 'cancelWorkerAction', nationId: N1, workerId: developer(N1), tileId: COAL };
    const cancelled = order(bought, cancel);
    expect(treasury(cancelled, N1)).toBe(50_000);
    expect(cancelled.intents).toEqual([]);
    expect(locate(cancelled, developer(N1))!.worker.status).toBe(WorkerStatus.Moved);
    // The second cancel undoes the move, as for every civilian (FR-031)
    expect(order(cancelled, cancel)).toEqual(start);

    // Bought where it already stood: one cancel restores it all
    const standing = deepFreeze(put(base(), developer(N1), COAL));
    expect(order(order(standing, buy(COAL)), cancel)).toEqual(standing);
    // A cancelled purchase settles nothing
    const { events } = resolveTurn(cancelled, {});
    expect(landEvents(events)).toEqual([]);
  });

  it('FR-632 cancelling the purchase and its move puts the Developer back in its place in the stack, ahead of the civilian behind it', () => {
    // Codex task 62 finding 8: the undone move appended the Developer after the Prospector on the capital tile
    const s = base();
    const capital = capitalOf(s, N1);
    const others = tileAt(s, capital).workers.filter(w => w.id !== developer(N1));
    const dev = locate(s, developer(N1))!.worker;
    const behind = others.findIndex(w => w.id === civilian(N1, PROSPECTOR));
    expect(behind).toBeGreaterThanOrEqual(0);
    const stack = [...others.slice(0, behind), dev, ...others.slice(behind)];
    const start = deepFreeze(setTile(s, capital, { workers: stack }));
    const ids = (state: GameState) => tileAt(state, capital).workers.map(w => w.id);

    const cancel: Order = { kind: 'cancelWorkerAction', nationId: N1, workerId: developer(N1), tileId: TIMBER };
    const bought = order(start, buy(TIMBER));
    const restored = order(order(bought, cancel), cancel);
    expect(ids(restored)).toEqual(ids(start));
    expect(treasury(restored, N1)).toBe(50_000);
    expect(restored.intents).toEqual([]);
    expect(restored).toEqual(start);
    expect(JSON.stringify(restored)).toBe(JSON.stringify(start));

    // The same for a plain move of another civilian with one behind it (FR-031)
    const prospector = civilian(N1, PROSPECTOR);
    const moved = order(start, move(prospector, TESTLAND_FOREST));
    const back = order(moved, { kind: 'cancelWorkerAction', nationId: N1, workerId: prospector, tileId: TESTLAND_FOREST });
    expect(ids(back)).toEqual(ids(start));
    expect(JSON.stringify(back)).toBe(JSON.stringify(start));
  });

  it('FR-632 the price recorded at order time is the one charged, and the one refunded', async () => {
    const bought = order(setPrice(base(), ResourceType.Coal, 111), buy(COAL));
    const repriced = setPrice(bought, ResourceType.Coal, 140);
    const { state, events } = await settle(repriced);
    expect(treasury(state, N1)).toBe(50_000 - 2220);
    expect(state.overseasLand?.[COAL]?.price).toBe(2220);
    expect(landEvents(events)).toEqual([{ type: 'land-purchased', nationId: N1, workerId: developer(N1), tileId: COAL, minorId: ARVELIA, cost: 2220 }]);

    const lost = setPair(repriced, N1, ARVELIA, { embassies: [] });
    const refused = await settle(lost);
    expect(treasury(refused.state, N1)).toBe(50_000);
  });

  it('FR-632 FR-640 another nation\'s validation and planning are the same with and without this intent', () => {
    const start = twoBuyers(60, 60);
    const ordered = order(start, buy(COAL));
    const withoutIntent = { ...ordered, intents: [] };
    const valdoria: Order[] = [buy(COAL, N2), buy(IRON, N2), move(developer(N2), COAL, N2), move(developer(N2), TIMBER, N2)];
    for (const o of valdoria) {
      expect(validateOrder(ordered, o)).toEqual(validateOrder(withoutIntent, o));
      expect(validateOrder(ordered, o)).toEqual(validateOrder(start, o));
    }
    expect(validateOrder(ordered, buy(COAL, N2))).toEqual({ ok: true });
    expect(computerOrders(ordered)[N2]).toEqual(computerOrders(withoutIntent)[N2]);
    expect(computerOrders(ordered)[N2]).toEqual(computerOrders(start)[N2]);
  });
});

describe('FR-633 settlement and competing buyers', () => {
  it('FR-633 the End Turn passes the tile to its buyer at level 0; the Developer stays there, Available; the buyer alone reads it', () => {
    const start = base();
    const { state, events } = resolveTurn(start, { [N1]: [buy(COAL)] });
    expect(state.overseasLand).toEqual({ [COAL]: { tileId: COAL, holderId: N1, minorId: ARVELIA, turn: 1, price: 2000 } });
    const tile = tileAt(state, COAL);
    expect([tile.ownerNationId, tile.provinceId, tile.resource]).toEqual([undefined, ARVELIA_PROVINCE, { type: ResourceType.Coal, level: 0, discovered: true }]);
    const { worker } = locate(state, developer(N1))!;
    expect([locate(state, developer(N1))!.tile.id, worker.status, worker.justMoved]).toEqual([COAL, WorkerStatus.Available, false]);
    expect(landEvents(events)).toEqual([{ type: 'land-purchased', nationId: N1, workerId: developer(N1), tileId: COAL, minorId: ARVELIA, cost: 2000 }]);
    expect(newsLines(landEvents(events), N1, nameOf).length).toBe(1);
    expect(newsLines(landEvents(events), N2, nameOf)).toEqual([]);
    // Not a trade: relation points do not move for it (the trade phase may still move them for trade)
    const without = resolveTurn(start, {});
    expect(state.diplomacy).toEqual(without.state.diplomacy);
    expect(treasury(state, N1)).toBe(treasury(without.state, N1) - 2000);
    expect(state.intents).toEqual([]);
  });

  it('FR-633 two buyers of one tile: the Minor Nation sells to the first in its partner ranking and refunds the other in full', async () => {
    for (const [n1, n2, winner, loser] of [[70, 60, N1, N2], [60, 70, N2, N1]] as const) {
      const start = deepFreeze(twoBuyers(n1, n2));
      const ordered = order(order(start, buy(COAL, N2)), buy(COAL, N1));
      const { state, events } = await settle(ordered);
      expect(state.overseasLand?.[COAL]?.holderId).toBe(winner);
      expect(treasury(state, winner)).toBe(50_000 - 2000);
      expect(treasury(state, loser)).toBe(50_000);
      expect(landEvents(events)).toEqual(expect.arrayContaining([
        { type: 'land-purchased', nationId: winner, workerId: developer(winner), tileId: COAL, minorId: ARVELIA, cost: 2000 },
        { type: 'land-purchase-refused', nationId: loser, workerId: developer(loser), tileId: COAL, minorId: ARVELIA, cost: 2000, reason: 'outbid' },
      ]));
      expect(landEvents(events).length).toBe(2);
      for (const id of [N1, N2]) expect(locate(state, developer(id))!.worker.status).toBe(WorkerStatus.Available);
      // Each reads its own line only
      expect(newsLines(events, loser, nameOf).length).toBe(1);
      expect(newsLines(events, winner, nameOf).length).toBe(1);
    }
    // Half the subsidy counts: 60 points and a 25% subsidy (72.5) beat 70 points
    const subsidised = setPair(twoBuyers(70, 60), N2, ARVELIA, { subsidies: { [N2]: 25 } });
    const { state } = await settle(order(order(subsidised, buy(COAL, N1)), buy(COAL, N2)));
    expect(state.overseasLand?.[COAL]?.holderId).toBe(N2);
  });

  it('FR-633 a cancel after the End Turn refunded an outbid purchase is refused and leaves the refunded treasury as it is', () => {
    const ordered = order(order(deepFreeze(twoBuyers(60, 70)), buy(COAL, N2)), buy(COAL, N1));
    const { state, events } = resolveTurn(ordered, {});
    expect(landEvents(events).find(e => e.nationId === N1)).toMatchObject({ type: 'land-purchase-refused', reason: 'outbid', cost: 2000 });
    expect(state.intents).toEqual([]);
    expect(locate(state, developer(N1))).toMatchObject({ tile: { id: COAL }, worker: { status: WorkerStatus.Available } });
    const cancel: Order = { kind: 'cancelWorkerAction', nationId: N1, workerId: developer(N1), tileId: COAL };
    const attempt = tryApplyOrder(state, cancel);
    expect(attempt.result).toEqual({ ok: false, reason: 'invalid-target' });
    expect(treasury(attempt.state, N1)).toBe(treasury(state, N1));
    expect(attempt.state).toEqual(state);
  });

  it('FR-633 with equal points the FR-401 seed order decides, with no random draw', async () => {
    const winners: string[] = [];
    for (const seed of [1, 4]) {
      const start = twoBuyers(60, 60, seed);
      const { state } = await settle(order(order(start, buy(COAL, N1)), buy(COAL, N2)));
      expect(state.overseasLand?.[COAL]?.holderId).toBe(partnerTieOrder(start, ARVELIA)[0]);
      winners.push(state.overseasLand![COAL].holderId);
    }
    expect(new Set(winners).size).toBe(2);
  });

  it('FR-633 a purchase whose embassy was lost, whose war has begun, under a boycott, or on a tile taken in the last combat is refunded with its reason', async () => {
    const bought = order(base(), buy(COAL));
    const cases: [string, GameState, string][] = [
      ['embassy lost', setPair(bought, N1, ARVELIA, { embassies: [] }), 'needs-embassy'],
      ['war begun', setPair(bought, N1, ARVELIA, { war: { aggressors: [N1], since: 1 } }), 'at-war'],
      ['boycott', setPair(bought, N1, ARVELIA, { boycotts: [ARVELIA] }), 'boycott'],
      ['conquered', transferProvince(bought, ARVELIA_PROVINCE, N2), 'not-owner'],
      ['held', hold(bought, COAL, N2), 'already-owned'],
    ];
    for (const [name, state, reason] of cases) {
      const result = await settle(deepFreeze(state));
      expect([name, treasury(result.state, N1)]).toEqual([name, 50_000]);
      expect([name, landEvents(result.events)]).toEqual([name, [{ type: 'land-purchase-refused', nationId: N1, workerId: developer(N1), tileId: COAL, minorId: ARVELIA, cost: 2000, reason }]]);
      expect([name, result.state.overseasLand?.[COAL]?.holderId]).toEqual([name, name === 'held' ? N2 : undefined]);
      expect([name, tileAt(result.state, COAL).resource?.level]).toEqual([name, name === 'held' ? 0 : 1]);
      expect(locate(result.state, developer(N1))!.worker.status).toBe(WorkerStatus.Available);
    }
  });

  it('FR-633 a war declared this turn begins next turn, so the sale still happens', async () => {
    const declared = setPair(order(base(), buy(COAL)), N1, ARVELIA, { war: { aggressors: [N1], since: 2 } });
    const settled = await settle(declared);
    expect(settled.state.overseasLand?.[COAL]?.holderId).toBe(N1);

    const war: Order = { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA };
    const { state, events } = resolveTurn(base(), { [N1]: [war, buy(COAL)] });
    expect(events.filter(e => e.type === 'order-rejected')).toEqual([]);
    expect(state.overseasLand?.[COAL]?.holderId).toBe(N1);
    expect(state.diplomacy[`${ARVELIA}|${N1}`].war?.since).toBe(2);
  });

  it('FR-633 the phase returns its input when nothing is bought, draws no random number and never mutates its input', async () => {
    const quiet = deepFreeze(base());
    expect((await settle(quiet)).state).toBe(quiet);
    for (const seed of [1, 2, 3, 4]) {
      const islands = deepFreeze(newGame({ seed, world: 'two-islands' }));
      expect((await settle(islands)).state).toBe(islands);
    }
    const frozen = deepFreeze(order(twoBuyers(70, 60), buy(COAL, N1)));
    const snapshot = structuredClone(frozen);
    await settle(frozen);
    expect(frozen).toEqual(snapshot);
  });
});

describe('FR-634 ownership: the holding, and work on held land', () => {
  it('FR-634 no other Great Power may buy or work the held tile', () => {
    const s = hold(twoBuyers(60, 60), COAL, N1);
    expect(validateOrder(s, buy(COAL, N2))).toEqual({ ok: false, reason: 'already-owned' });
    expect(validateOrder(s, develop(civilian(N2, MINER), COAL, N2))).toEqual({ ok: false, reason: 'not-owner' });
    const onIt = put(s, civilian(N2, MINER), COAL);
    expect(validateOrder(onIt, { kind: 'startDevelopment', nationId: N2, workerId: civilian(N2, MINER), tileId: COAL })).toEqual({ ok: false, reason: 'not-owner' });
  });

  it('FR-634 a rival\'s Developer may stand on the held tile, still open Minor Nation land, but never buy or work it', () => {
    const s = deepFreeze(hold(twoBuyers(60, 60), COAL, N1));
    const standing = order(s, move(developer(N2), COAL, N2));
    expect(locate(standing, developer(N2))!.tile.id).toBe(COAL);
    expect(standing.overseasLand).toEqual(s.overseasLand);
    expect(overseasViolations(standing)).toEqual([]);
    // On a later turn, Available on the tile: no purchase, and a Developer starts no job (FR-630)
    const nextTurn = put(s, developer(N2), COAL);
    expect(validateOrder(nextTurn, buy(COAL, N2))).toEqual({ ok: false, reason: 'already-owned' });
    expect(validateOrder(nextTurn, { kind: 'startDevelopment', nationId: N2, workerId: developer(N2), tileId: COAL })).toEqual({ ok: false, reason: 'wrong-worker-type' });
    // The holder's own work there is unchanged by it
    expect(validateOrder(nextTurn, develop(civilian(N1, MINER), COAL))).toEqual({ ok: true });
  });

  it('FR-634 (inferred) at war with the Minor Nation or under a boycott the holder\'s Miner may still work its held tile; its Developer may not buy', () => {
    const held = deepFreeze(hold(base(), COAL));
    const closings: [Parameters<typeof setPair>[3], string][] = [[{ war: { aggressors: [N1], since: 1 } }, 'at-war'], [{ boycotts: [ARVELIA] }, 'boycott'], [{ boycotts: [N1] }, 'boycott']];
    for (const [patch, barrier] of closings) {
      const closed = setPair(held, N1, ARVELIA, patch);
      expect(validateOrder(closed, develop(civilian(N1, MINER), COAL))).toEqual({ ok: true });
      expect(validateOrder(closed, buy(COAL2))).toEqual({ ok: false, reason: barrier });
    }
  });

  it('FR-634 the holder\'s Miner opens a level-1 mine in 3 turns for $100, and the News reaches the holder', () => {
    const first = resolveTurn(base(), { [N1]: [buy(COAL)] });
    let state = first.state;
    expect(validateOrder(state, develop(civilian(N1, MINER), COAL))).toEqual({ ok: true });
    const before = treasury(state, N1);
    const started = order(state, develop(civilian(N1, MINER), COAL));
    expect(treasury(started, N1)).toBe(before - 100);
    expect(tileAt(started, COAL).developmentJob).toEqual({ workerId: civilian(N1, MINER), workerType: WorkerType.Miner, targetLevel: 1, startedOnTurn: 2, durationTurns: 3 });
    state = started;
    const levels: number[] = [];
    let done: GameEvent[] = [];
    for (let turn = 0; turn < 3; turn++) {
      const next = resolveTurn(state, {});
      levels.push(tileAt(next.state, COAL).resource!.level);
      done = next.events.filter(e => e.type === 'development-completed');
      state = next.state;
    }
    expect(levels).toEqual([0, 0, 1]);
    expect(done).toEqual([{ type: 'development-completed', tileId: COAL, nationId: N1, level: 1 }]);
    expect(newsLines(done, N1, nameOf).length).toBe(1);
    expect(state.overseasLand?.[COAL]?.holderId).toBe(N1);
  });

  it('FR-634 the home rules apply on held land: oil needs Oil Drilling, level 3 is the last, the improver must suit the terrain', () => {
    const oil = hold(setTile(base(), COAL2, { terrain: TerrainType.Desert, resource: { type: ResourceType.Oil, level: 0, discovered: true } }), COAL2);
    expect(validateOrder(setTechnologies(oil, N1), develop(civilian(N1, DRILLER), COAL2))).toEqual({ ok: false, reason: 'missing-technology', techId: 'oilDrilling' });
    expect(validateOrder(setTechnologies(oil, N1, 'oilDrilling'), develop(civilian(N1, DRILLER), COAL2))).toEqual({ ok: true });
    expect(validateOrder(hold(base(), COAL, N1, 3), develop(civilian(N1, MINER), COAL))).toEqual({ ok: false, reason: 'invalid-target' });
    expect(validateOrder(hold(base(), COAL, N1), develop(civilian(N1, FORESTER), COAL))).toEqual({ ok: false, reason: 'invalid-site' });
    expect(validateOrder(hold(base(), TIMBER, N1), develop(civilian(N1, FORESTER), TIMBER))).toEqual({ ok: true });
  });

  it('FR-634 the holder\'s Engineer and Prospector may not enter or build there, so no rail reaches it', () => {
    const s = hold(base(), COAL, N1);
    expect(validateOrder(s, move(civilian(N1, ENGINEER), COAL))).toEqual({ ok: false, reason: 'not-owner' });
    expect(validateOrder(s, move(civilian(N1, PROSPECTOR), COAL))).toEqual({ ok: false, reason: 'not-owner' });
    expect(validateOrder(s, { kind: 'moveAndStartConstruction', nationId: N1, workerId: civilian(N1, ENGINEER), toTileId: COAL, structure: 'depot' })).toEqual({ ok: false, reason: 'not-owner' });
    const onIt = put(s, civilian(N1, ENGINEER), COAL);
    for (const structure of ['depot', 'port', 'fort', 'rail'] as const) {
      expect(validateOrder(onIt, { kind: 'startConstruction', nationId: N1, workerId: civilian(N1, ENGINEER), tileId: COAL, structure })).toEqual({ ok: false, reason: 'not-owner' });
    }
    // The holder's improver may walk onto its held tile, but not onto Arvelia's other land
    expect(validateOrder(s, move(civilian(N1, MINER), COAL))).toEqual({ ok: true });
    expect(validateOrder(s, move(civilian(N1, MINER), IRON))).toEqual({ ok: false, reason: 'not-owner' });
  });

  it('FR-634 the per-turn invariants hold through a purchase and a mine, and catch a broken holding', () => {
    const start = base();
    let state = start;
    const turns: Record<string, Order[]>[] = [{ [N1]: [buy(COAL)] }, { [N1]: [develop(civilian(N1, MINER), COAL)] }, {}, {}, {}];
    for (const orders of turns) {
      const next = resolveTurn(state, orders);
      expect(next.events.filter(e => e.type === 'order-rejected')).toEqual([]);
      expect([...invariantViolations(next.state, next.events), ...worldViolations(next.state, start, state)]).toEqual([]);
      state = next.state;
    }
    expect(tileAt(state, COAL).resource!.level).toBe(1);

    expect(overseasViolations(state)).toEqual([]);
    const onValdoria = state.map.tiles.flat().find(t => t.ownerNationId === N2)!.id;
    const badLand = { ...state, overseasLand: { ...state.overseasLand, [onValdoria]: { tileId: onValdoria, holderId: N1, minorId: ARVELIA, turn: 1, price: 2000 } } };
    expect(overseasViolations(badLand)).toEqual([`holding ${onValdoria} of ${N1} is not on ${ARVELIA}'s land`]);
    const twoDevelopers = setTile(state, IRON, { workers: [{ ...locate(state, developer(N1))!.worker, id: 'developer-extra' }] });
    expect(overseasViolations(twoDevelopers)).toEqual([`nation ${N1} has 2 Developers`]);
    const rivalWorking = setTile(put(state, civilian(N2, MINER), COAL, { status: WorkerStatus.Working }), COAL, {
      developmentJob: { workerId: civilian(N2, MINER), workerType: WorkerType.Miner, targetLevel: 2, startedOnTurn: 5, durationTurns: 3 },
    });
    expect(overseasViolations(rivalWorking)).toEqual([
      `miner ${civilian(N2, MINER)} of ${N2} stands on minor land ${COAL}`,
      `${civilian(N2, MINER)} of ${N2} works ${COAL}, held by ${N1}`,
    ]);
    const strayProspector = put(state, civilian(N1, PROSPECTOR), IRON);
    expect(overseasViolations(strayProspector)).toEqual([`prospector ${civilian(N1, PROSPECTOR)} of ${N1} stands on minor land ${IRON}`]);
  });

  it('FR-634 the invariants accept a Developer working on its purchase during the turn', () => {
    const bought = order(base(), buy(COAL));
    expect(invariantViolations(bought)).toEqual([]);
    expect(overseasViolations(bought)).toEqual([]);
    const orphan = { ...bought, intents: [] };
    expect(invariantViolations(orphan)).toEqual([`worker ${developer(N1)} on ${COAL} is working without a job`]);
  });
});
