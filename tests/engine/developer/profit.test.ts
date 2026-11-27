// M18j T-03: a holding's output in the Minor Nation's offer (FR-635) and the overseas profit paid to its holder in the
// trade phase (FR-636), with the Deal Book data. Continent seed 1: Arvelia (minor-1) holds timber at 10-3, 11-3, 13-3
// and 13-4, coal at 12-3, 10-4 and 12-5, iron ore at 12-4 and 11-5, cotton at 13-5 and horses at 10-5, all at level 1.
import { describe, expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { applyBuyCommodity } from '@/engine/orders/tradeOrders';
import type { Order } from '@/engine/orders/Order';
import { boardOfTrade, minorOffers } from '@/engine/market/partners';
import { dealBook } from '@/engine/market/dealBook';
import { marketOf } from '@/engine/market/market';
import { pairKey } from '@/engine/diplomacy/relations';
import { tradeSystem } from '@/engine/systems/tradeSystem';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { transferProvince } from '@/engine/world/provinces';
import { newsLines } from '@/components/gameText';
import type { GameState } from '@/types/GameState';
import type { TradeCommodity } from '@/types/Market';
import { ResourceType } from '@/types/Resource';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';
import { deepFreeze, N1, N2, setPair, setTile, setTreasury, tileAt, treasury } from '../fixtures';

const ARVELIA = 'minor-1';
const ARVELIA_PROVINCE = 'province-minor-1';
const TIMBER = '10-3';
const COAL = '12-3';
const GOLD_TILE = '13-3';

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });

/** The nation holds an embassy (and a consulate) with Arvelia at `points` in the settled record. */
const embassy = (state: GameState, nationId = N1, points = 60) =>
  setPair(state, nationId, ARVELIA, { points, consulates: [nationId], embassies: [nationId] });

/** Test setup: the tile held by `holderId` at `level`, as a settled purchase leaves it (FR-634). */
function hold(state: GameState, tileId: string, holderId = N1, level = 0): GameState {
  const tile = tileAt(state, tileId);
  const held = setTile(state, tileId, { resource: { ...tile.resource!, level } });
  return { ...held, overseasLand: { ...held.overseasLand, [tileId]: { tileId, holderId, minorId: ARVELIA, turn: 1, price: 2000 } } };
}

function setPrice(state: GameState, commodity: TradeCommodity, price: number): GameState {
  return { ...state, market: { ...state.market!, prices: { ...state.market!.prices, [commodity]: price } } };
}

const setHolds = (state: GameState, nationId: string, holds: number): GameState => ({
  ...state,
  nations: state.nations.map(n => (n.id === nationId ? { ...n, merchantMarine: { ...n.merchantMarine, ships: undefined, holds } } : n)),
});

const colonyOf = (state: GameState, owner: string): GameState =>
  ({ ...state, minorNations: state.minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: owner } : m)) });

const buy = (nationId: string, commodity: TradeCommodity, amount: number): Order => ({ kind: 'buyCommodity', nationId, commodity, amount });

function ordered(state: GameState, ...orders: Order[]): GameState {
  return orders.reduce((s, o) => {
    const attempt = tryApplyOrder(s, o);
    expect({ o, result: attempt.result }).toEqual({ o, result: { ok: true } });
    return attempt.state;
  }, state);
}

/** The trade phase alone, with the events it emits. */
function trade(s: GameState): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const state = tradeSystem(s, createTurnContext({ turn: s.turn, seed: s.seed, emit: e => events.push(e) }));
  return { state, events };
}

const profitsOf = (events: readonly GameEvent[]) => events.filter(e => e.type === ('overseas-profit' as GameEvent['type']));
const deals = (events: readonly GameEvent[]) =>
  events.flatMap(e =>
    e.type === 'goods-sold' ? [['sold', e.nationId, e.counterpartyId, e.commodity, e.amount, e.price]]
      : e.type === 'goods-bought' ? [['bought', e.nationId, e.counterpartyId, e.commodity, e.amount, e.price]]
        : []);
const profit = (commodity: string, units: number, price: number, sharePercent: number, amount: number, nationId = N1) =>
  ({ type: 'overseas-profit', nationId, minorId: ARVELIA, commodity, units, price, sharePercent, amount });
const points = (s: GameState, a: string, b: string) => s.diplomacy[pairKey(a, b)].points;
const nameOf = (id: string) => id;

describe('FR-635 output, and what the Minor Nation offers', () => {
  it('FR-635 a Minor Nation with 3 timber tiles offers 3, and after one purchase still 3 (2 + 1 developed); a held level-1 tile adds 2', () => {
    const three = setTile(continent(), '13-4', { resource: undefined });
    expect(minorOffers(three, ARVELIA).timber).toBe(3);
    expect(minorOffers(hold(three, TIMBER), ARVELIA).timber).toBe(3);
    expect(minorOffers(hold(three, TIMBER, N1, 1), ARVELIA).timber).toBe(4);
  });

  it('FR-635 one with 7 timber tiles offers 6 (MINOR_OFFER_CAP), and after one purchase 6 + 1: developed units come outside the cap', () => {
    let seven = continent();
    for (const id of ['12-4', '11-5', '12-5']) seven = setTile(seven, id, { resource: { type: ResourceType.Timber, level: 1, discovered: true } });
    expect(minorOffers(seven, ARVELIA).timber).toBe(6);
    expect(minorOffers(hold(seven, TIMBER), ARVELIA).timber).toBe(7);
    expect(minorOffers(hold(seven, TIMBER, N1, 3), ARVELIA).timber).toBe(10);
  });

  it('FR-635 a bought coal tile lowers the coal offer by 1 until a Miner opens it; after that it adds 2', () => {
    expect(minorOffers(continent(), ARVELIA).coal).toBe(3);
    expect(minorOffers(hold(continent(), COAL), ARVELIA).coal).toBe(2);
    expect(minorOffers(hold(continent(), COAL, N1, 1), ARVELIA).coal).toBe(4);
    // The offer is the same whoever holds the tile, and the other commodities do not move
    expect({ ...minorOffers(hold(continent(), COAL, N1, 1), ARVELIA), coal: 3 }).toEqual(minorOffers(continent(), ARVELIA));
    expect(minorOffers(hold(continent(), COAL, N2, 1), ARVELIA)).toEqual(minorOffers(hold(continent(), COAL, N1, 1), ARVELIA));
  });

  it('FR-635 gold and gems never appear in the offer or on the Board', () => {
    for (const type of [ResourceType.Gold, ResourceType.Gems]) {
      const s = hold(setTile(continent(), GOLD_TILE, { resource: { type, level: 1, discovered: true } }), GOLD_TILE, N1, 2);
      expect(Object.hasOwn(minorOffers(s, ARVELIA), type)).toBe(false);
      expect(minorOffers(s, ARVELIA).timber).toBe(3);
      expect(boardOfTrade(s, N1).map(row => row.commodity)).not.toContain(type);
    }
  });

  it('FR-635 FR-224 a colony offers its developed units, to its owner only', () => {
    const colony = hold(colonyOf(continent(), N1), TIMBER, N1, 1);
    expect(minorOffers(colonyOf(continent(), N1), ARVELIA)).toEqual({});
    expect(minorOffers(colony, ARVELIA)).toEqual({ timber: 2 });
    // Valdoria holds a consulate with the colony and bids; only Testland, the owner, buys the colony's units
    let s = setPair(colony, N2, ARVELIA, { consulates: [N2] });
    s = applyBuyCommodity(applyBuyCommodity(s, buy(N2, ResourceType.Timber, 2) as never), buy(N1, ResourceType.Timber, 2) as never);
    expect(deals(trade(s).events).filter(d => d[2] === ARVELIA)).toEqual([['bought', N1, ARVELIA, ResourceType.Timber, 2, 100]]);
  });

  it('FR-635 the developed units sell like the Minor Nation\'s own: Testland buys all 5 of Arvelia\'s timber (3 + 2 developed)', () => {
    let s = setHolds(hold(embassy(continent()), TIMBER, N2, 1), N1, 5);
    s = ordered(s, buy(N1, ResourceType.Timber, 5));
    expect(deals(trade(s).events)).toEqual([['bought', N1, ARVELIA, ResourceType.Timber, 5, 100]]);
  });

  it('FR-635 FR-636 an End Turn after the purchase: coal offer 3, then 2, then 4 once the holder\'s Miner opens the mine, paid from that End Turn', () => {
    const MINER = `worker-${N1}-5`;
    const developer: Worker = {
      id: `developer-${N1}-1`, type: WorkerType.Developer, nationId: N1, assignedTileId: '9-3', efficiency: 100,
      status: WorkerStatus.Available, justMoved: false,
    };
    const start = setTreasury(setTile(embassy(continent(), N1, 65), '9-3', { workers: [...tileAt(continent(), '9-3').workers, developer] }), N1, 50_000);
    expect(minorOffers(start, ARVELIA).coal).toBe(3);
    let state = resolveTurn(start, { [N1]: [{ kind: 'buyLand', nationId: N1, workerId: developer.id, tileId: COAL }] }).state;
    expect(state.overseasLand?.[COAL]?.holderId).toBe(N1);
    expect(minorOffers(state, ARVELIA).coal).toBe(2);
    state = ordered(state, { kind: 'moveAndStartDevelopment', nationId: N1, workerId: MINER, toTileId: COAL });
    const paid: number[] = [];
    for (let turn = 0; turn < 3; turn++) {
      const board = marketOf(state).prices.coal!;
      const next = resolveTurn(state, {});
      const events = profitsOf(next.events) as Extract<GameEvent, { type: 'overseas-profit' }>[];
      paid.push(...events.map(e => e.amount));
      for (const e of events) expect(e).toEqual(profit(ResourceType.Coal, 2, board, 75, Math.floor((2 * board * 75) / 100)));
      state = next.state;
    }
    expect(paid.length).toBe(1);
    expect(tileAt(state, COAL).resource!.level).toBe(1);
    expect(minorOffers(state, ARVELIA).coal).toBe(4);
  });
});

describe('FR-636 overseas profit', () => {
  const coalMine = (relationPoints = 60) => hold(setPair(setPrice(continent(), ResourceType.Coal, 116), N1, ARVELIA, { points: relationPoints }), COAL, N1, 1);

  it('FR-636 a two-unit coal mine at $116 with level 6 pays floor(2 x 116 x 75 / 100) = $174, the holder only', () => {
    const s = deepFreeze(coalMine());
    const { state, events } = trade(s);
    expect(profitsOf(events)).toEqual([profit(ResourceType.Coal, 2, 116, 75, 174)]);
    expect(treasury(state, N1)).toBe(treasury(s, N1)! + 174);
    expect(treasury(state, N2)).toBe(treasury(s, N2));
    expect(state.overseasLand).toEqual(s.overseasLand);
  });

  it('FR-636 exact dollars at each relation level 0 to 8 (15, 25, 35, 45, 55, 65, 75, 90, 100%) and 100% in the holder\'s own colony', () => {
    const amounts = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(level => profitsOf(trade(coalMine(level * 10 + 5)).events).map(e => [(e as { sharePercent: number }).sharePercent, (e as { amount: number }).amount]));
    expect(amounts).toEqual([[[15, 34]], [[25, 58]], [[35, 81]], [[45, 104]], [[55, 127]], [[65, 150]], [[75, 174]], [[90, 208]], [[100, 232]]]);
    expect(profitsOf(trade(colonyOf(coalMine(30), N1)).events)).toEqual([profit(ResourceType.Coal, 2, 116, 100, 232)]);
  });

  it('FR-636 gold at tile level 1 with relation level 6 pays $150 with no free hold; gems pay $500 a unit; level 0 pays nothing', () => {
    const gold = (type: ResourceType, level: number, relation = 60) =>
      setHolds(hold(setPair(setTile(continent(), GOLD_TILE, { resource: { type, level: 1, discovered: true } }), N1, ARVELIA, { points: relation }), GOLD_TILE, N1, level), N1, 0);
    const s = gold(ResourceType.Gold, 1);
    const { state, events } = trade(s);
    expect(profitsOf(events)).toEqual([profit(ResourceType.Gold, 1, 200, 75, 150)]);
    expect(treasury(state, N1)).toBe(treasury(s, N1)! + 150);
    expect(profitsOf(trade(gold(ResourceType.Gems, 3, 85)).events)).toEqual([profit(ResourceType.Gems, 3, 500, 100, 1500)]);
    for (const type of [ResourceType.Gold, ResourceType.Gems]) {
      const idle = gold(type, 0);
      expect(profitsOf(trade(idle).events)).toEqual([]);
      expect(treasury(trade(idle).state, N1)).toBe(treasury(idle, N1));
    }
  });

  it('FR-636 profit is summed per Minor Nation and commodity before rounding down', () => {
    // Two level-0 timber tiles at $105, level 6: floor(2 x 105 x 0.75) = 157, not 2 x floor(78.75) = 156
    const s = hold(hold(setPair(setPrice(continent(), ResourceType.Timber, 105), N1, ARVELIA, { points: 60 }), TIMBER), '11-3');
    expect(profitsOf(trade(s).events)).toEqual([profit(ResourceType.Timber, 2, 105, 75, 157)]);
  });

  it('FR-636 war and boycott stop payment and the holding remains; lifting them resumes it', () => {
    const barred: [string, GameState][] = [
      ['war begun', setPair(coalMine(), N1, ARVELIA, { war: { aggressors: [N1], since: 1 } })],
      ['war declared this turn', setPair(coalMine(), N1, ARVELIA, { war: { aggressors: [N1], since: 2 } })],
      ['Testland boycotts', setPair(coalMine(), N1, ARVELIA, { boycotts: [N1] })],
      ['Arvelia boycotts', setPair(coalMine(), N1, ARVELIA, { boycotts: [ARVELIA] })],
    ];
    for (const [label, s] of barred) {
      const { state, events } = trade(s);
      expect({ label, profits: profitsOf(events) }).toEqual({ label, profits: [] });
      expect(treasury(state, N1)).toBe(treasury(s, N1));
      expect(state.overseasLand?.[COAL]).toEqual(s.overseasLand?.[COAL]);
      // Lifted on the same board (the trade phase moved the coal price)
      const lifted = setPair(s, N1, ARVELIA, { war: undefined, boycotts: [] });
      expect(profitsOf(trade(lifted).events)).toEqual([profit(ResourceType.Coal, 2, 116, 75, 174)]);
    }
  });

  it('FR-636 the holder\'s own colony pays 100% while open, and nothing at war (declared this turn or begun) or under a boycott either way', () => {
    // Codex task 62 finding 5: the colony share returned before the pair's war and boycott were read ($232 under a boycott)
    const colony = colonyOf(setPair(coalMine(30), N1, ARVELIA, { consulates: [], embassies: [] }), N1);
    expect(profitsOf(trade(colony).events)).toEqual([profit(ResourceType.Coal, 2, 116, 100, 232)]);
    const barred: [string, GameState][] = [
      ['war begun', setPair(colony, N1, ARVELIA, { war: { aggressors: [N1], since: 1 } })],
      ['war declared this turn', setPair(colony, N1, ARVELIA, { war: { aggressors: [N1], since: 2 } })],
      ['Testland boycotts', setPair(colony, N1, ARVELIA, { boycotts: [N1] })],
      ['Arvelia boycotts', setPair(colony, N1, ARVELIA, { boycotts: [ARVELIA] })],
    ];
    for (const [label, s] of barred) {
      const { state, events } = trade(s);
      expect({ label, profits: profitsOf(events) }).toEqual({ label, profits: [] });
      expect(treasury(state, N1)).toBe(treasury(s, N1));
      expect(state.overseasLand?.[COAL]).toEqual(s.overseasLand?.[COAL]);
    }
  });

  it('FR-636 buying 1 of its own timber at $110 with level 6 costs $110 and returns $82; Valdoria buying it or nobody pays the same $82', () => {
    const own = hold(embassy(setPrice(setTreasury(continent(), N1, 10_000), ResourceType.Timber, 110)), TIMBER);
    const s = ordered(own, buy(N1, ResourceType.Timber, 1));
    expect(treasury(s, N1)).toBe(10_000 - 110);
    const { state, events } = trade(s);
    expect(deals(events)).toEqual([['bought', N1, ARVELIA, ResourceType.Timber, 1, 110]]);
    expect(profitsOf(events)).toEqual([profit(ResourceType.Timber, 1, 110, 75, 82)]);
    expect(treasury(state, N1)).toBe(10_000 - 110 + 82);

    const byRival = ordered(setPair(own, N2, ARVELIA, { consulates: [N2] }), buy(N2, ResourceType.Timber, 1));
    const rival = trade(byRival);
    expect(deals(rival.events)).toEqual([['bought', N2, ARVELIA, ResourceType.Timber, 1, 110]]);
    expect(profitsOf(rival.events)).toEqual([profit(ResourceType.Timber, 1, 110, 75, 82)]);
    expect(profitsOf(trade(own).events)).toEqual([profit(ResourceType.Timber, 1, 110, 75, 82)]);
  });

  it('FR-636 land purchases and profits are not trades: they move no relation points', () => {
    const s = coalMine(65);
    const { state, events } = trade(s);
    expect(profitsOf(events).length).toBe(1);
    expect(points(state, N1, ARVELIA)).toBe(65);
    expect(events.filter(e => e.type === 'relation-changed')).toEqual([]);
    expect(state.diplomacy).toEqual(s.diplomacy);
  });

  it('FR-636 FR-640 overseas-profit is the holder\'s alone: the rival\'s Deal Book and News are as without it', () => {
    const { events } = trade(coalMine());
    expect(profitsOf(events).length).toBe(1);
    const without = events.filter(e => e.type !== ('overseas-profit' as GameEvent['type']));
    expect(profitsOf(events).every(e => 'nationId' in e && e.nationId === N1)).toBe(true);
    expect(dealBook(events, N2)).toEqual(dealBook(without, N2));
    expect(newsLines(events, N2, nameOf)).toEqual(newsLines(without, N2, nameOf));
  });

  it('FR-636 the Deal Book lists Overseas Profits by Minor Nation and commodity; the treasury explanation reconciles and the trade net is unchanged', () => {
    let s = hold(coalMine(), TIMBER);
    s = setPrice(s, ResourceType.Timber, 110);
    const { state, events } = trade(s);
    const book = dealBook(events, N1, { start: treasury(s, N1)!, end: treasury(state, N1)! });
    expect(book.overseasProfits).toEqual([
      { minorId: ARVELIA, commodity: ResourceType.Timber, units: 1, price: 110, sharePercent: 75, amount: 82 },
      { minorId: ARVELIA, commodity: ResourceType.Coal, units: 2, price: 116, sharePercent: 75, amount: 174 },
    ]);
    expect(book.bottomLine).toEqual({ sold: 0, bought: 0, militaryUpkeep: 0, net: 0 });
    expect(book.treasury).toEqual({ start: treasury(s, N1), end: treasury(s, N1)! + 256, change: 256, other: 0 });
    expect(dealBook(events, N2).overseasProfits).toEqual([]);
  });

  it('FR-636 no random draw of its own and no mutation: the prices step exactly as without the holding', () => {
    const s = deepFreeze(coalMine());
    const without: GameState = { ...s, overseasLand: undefined };
    expect(marketOf(trade(s).state).prices).toEqual(marketOf(trade(without).state).prices);
    expect(trade(s).state).toEqual({ ...trade(without).state, overseasLand: s.overseasLand, nations: trade(s).state.nations });
  });

  it('FR-636 an End Turn pays at the trade phase\'s board price, before the price step', () => {
    const s = coalMine();
    const { state, events } = resolveTurn(s, {});
    expect(profitsOf(events)).toEqual([profit(ResourceType.Coal, 2, 116, 75, 174)]);
    expect(state.overseasLand?.[COAL]?.holderId).toBe(N1);
  });

  it('FR-636 a holding pays only while its tile is the Minor Nation\'s land', () => {
    const conquered = transferProvince(coalMine(), ARVELIA_PROVINCE, N2);
    expect(profitsOf(trade(conquered).events)).toEqual([]);
  });
});
