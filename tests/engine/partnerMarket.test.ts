// M7 nation-to-nation trade (FR-182 to FR-192): on the continent the trade phase settles every deal with a
// counterparty. Minor nations offer what their tiles hold and buy goods; Great Powers bid and offer; each
// commodity settles in the Board of Trade order, each minor's units going first to the Great Power it favours.
// Testland is nation-1, Valdoria nation-2; Arvelia minor-1, Sundmark minor-2, Lorran minor-3, Pellis minor-4.
// Continent start offers: timber 8 (Arvelia 4, Sundmark 1, Lorran 2, Pellis 1), coal 5 (3, 1, 0, 1),
// iron ore 4 (2, 1, 1, 0), cotton 5 (2, 1, 0, 2); every minor bids for 2 clothing, 2 furniture, 2 hardware.
import { describe, it, expect } from 'vitest';
import * as engine from '@/engine';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { createTurnRng } from '@/engine/rng';
import { tradeSystem } from '@/engine/systems/tradeSystem';
import { tradeDeliverySystem } from '@/engine/systems/tradeDeliverySystem';
import { marketOf, nextPrices } from '@/engine/market/market';
import {
  boardOfTrade, favouritePartner, marketModeOf, minorDemand, minorOffers, partnerRanking, tradeBarrier,
} from '@/engine/market/partners';
import { dealBook } from '@/engine/market/dealBook';
import { pairKey } from '@/engine/diplomacy/relations';
import { START_PRICES, TRADE_COMMODITIES } from '@/definisions/marketPrices';
import { BOARD_ORDER } from '@/definisions/partnerTrade';
import type { GameState } from '@/types/GameState';
import type { TradeAmounts, TradeCommodity } from '@/types/Market';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { deepFreeze, N1, N2, nationOf, setPair, setTile, setTreasury, setWarehouse, stockOf, treasury } from './fixtures';

const ARVELIA = 'minor-1';
const SUNDMARK = 'minor-2';
const LORRAN = 'minor-3';
const PELLIS = 'minor-4';
const MINORS = [ARVELIA, SUNDMARK, LORRAN, PELLIS];

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const sell = (nationId: string, commodity: string, amount: number): Order =>
  ({ kind: 'sellCommodity', nationId, commodity: commodity as TradeCommodity, amount });
const buy = (nationId: string, commodity: string, amount: number): Order =>
  ({ kind: 'buyCommodity', nationId, commodity: commodity as TradeCommodity, amount });

/** Applies the orders in sequence and fails the test on the first refused one. */
const ordered = (state: GameState, ...orders: Order[]): GameState =>
  orders.reduce((s, order) => {
    const { state: next, result } = tryApplyOrder(s, order);
    expect({ order, result }).toEqual({ order, result: { ok: true } });
    return next;
  }, state);

/** Test setup: the nation holds a consulate in each minor given (FR-163). */
const consulates = (state: GameState, nationId: string, ...minors: string[]): GameState =>
  minors.reduce((s, m) => setPair(s, nationId, m, { consulates: [...s.diplomacy[pairKey(nationId, m)].consulates, nationId].sort() }), state);
const setHolds = (state: GameState, nationId: string, holds: number): GameState => ({
  ...state,
  nations: state.nations.map(n => (n.id === nationId ? { ...n, merchantMarine: { ...n.merchantMarine, holds } } : n)),
});
const points = (s: GameState, a: string, b: string) => s.diplomacy[pairKey(a, b)].points;

/** The trade phase alone, with the events it emits. */
function trade(s: GameState): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const state = tradeSystem(s, createTurnContext({ turn: s.turn, seed: s.seed, emit: e => events.push(e) }));
  return { state, events };
}

/** The deals as compact rows: [side, nation, counterparty, commodity, amount, unit price]. */
const deals = (events: GameEvent[]) =>
  events.flatMap(e =>
    e.type === 'goods-sold' ? [['sold', e.nationId, e.counterpartyId, e.commodity, e.amount, e.price]]
      : e.type === 'goods-bought' ? [['bought', e.nationId, e.counterpartyId, e.commodity, e.amount, e.price]]
        : []
  );
const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const deliveries = (s: GameState, nationId: string) => marketOf(s).deliveries[nationId] ?? {};

describe('FR-182 the market mode', () => {
  it('FR-182 two-islands builds "world" (the v1 market, no mode key), the continent "partners"', () => {
    const v1 = newGame({ seed: 1, world: 'two-islands' });
    expect(marketModeOf(v1)).toBe('world');
    expect(Object.hasOwn(v1.market!, 'mode')).toBe(false);
    expect(continent().market!.mode).toBe('partners');
    expect(marketModeOf(continent())).toBe('partners');
  });

  it('FR-182 newGame({ market }) overrides the world\'s mode both ways', () => {
    expect(marketModeOf(newGame({ seed: 1, world: 'continent', market: 'world' }))).toBe('world');
    expect(newGame({ seed: 1, world: 'continent', market: 'world' }).market).toEqual(newGame({ seed: 1, world: 'two-islands' }).market);
    expect(marketModeOf(newGame({ seed: 1, world: 'two-islands', market: 'partners' }))).toBe('partners');
  });

  it('FR-182 in "partners" nothing is sold to the world: an offer nobody wants comes back, unsold, and pays nothing', () => {
    const s = ordered(continent(), sell(N1, MaterialType.Lumber, 2));
    expect(stockOf(s, N1, MaterialType.Lumber)).toBe(8);

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([]);
    expect(ofType(events, 'offer-unsold')).toEqual([{ type: 'offer-unsold', nationId: N1, commodity: MaterialType.Lumber, amount: 2 }]);
    expect(stockOf(state, N1, MaterialType.Lumber)).toBe(10);
    expect(treasury(state, N1)).toBe(10000);
  });

  it('FR-182 in "partners" nothing is bought from the world: a bid nobody fills is refunded and nothing arrives', () => {
    const s = ordered(continent(), buy(N1, MaterialType.Steel, 2));
    expect(treasury(s, N1)).toBe(9400);

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([]);
    expect(treasury(state, N1)).toBe(10000);
    expect(deliveries(state, N1)).toEqual({});
  });

  it('FR-182 the continent with market "world" trades with the world as in v1: paid at the world price, no counterparty', () => {
    const s = ordered(newGame({ seed: 1, world: 'continent', market: 'world' }), sell(N1, MaterialType.Lumber, 1));

    const { state, events } = trade(s);

    expect(ofType(events, 'goods-sold')).toEqual([{ type: 'goods-sold', nationId: N1, commodity: MaterialType.Lumber, amount: 1, price: 300, income: 300 }]);
    expect(treasury(state, N1)).toBe(10300);
  });

  it('FR-182 the trade phase keeps the mode and clears the orders', () => {
    const { state } = trade(ordered(continent(), sell(N1, MaterialType.Lumber, 1)));
    expect(marketOf(state).mode).toBe('partners');
    expect(marketOf(state).orders).toEqual({});
  });
});

describe('FR-183 what minors offer', () => {
  it('FR-183 continent start: one unit per tile holding a tradeable resource', () => {
    expect(MINORS.map(m => minorOffers(continent(), m))).toEqual([
      { timber: 4, coal: 3, ironOre: 2, cotton: 2 },
      { cotton: 1, timber: 1, coal: 1, ironOre: 1 },
      { timber: 2, ironOre: 1 },
      { cotton: 2, coal: 1, timber: 1 },
    ].map(o => expect.objectContaining(o)));
    for (const m of MINORS) {
      const offers = minorOffers(continent(), m) as Record<string, number>;
      expect(Object.values(offers).every(n => n > 0)).toBe(true);
    }
    expect(minorOffers(continent(), ARVELIA)).toEqual({ timber: 4, coal: 3, ironOre: 2, cotton: 2 });
  });

  it('FR-183 at most 6 units of a commodity: Arvelia with 9 timber tiles offers 6', () => {
    let s = continent();
    for (const id of ['10-4', '12-4', '11-5', '12-5', '10-5']) s = setTile(s, id, { resource: { type: ResourceType.Timber, level: 1, discovered: true } });
    expect(minorOffers(s, ARVELIA)).toEqual({ timber: 6, coal: 1, cotton: 1 });
  });

  it('FR-183 a colony offers nothing; an unknown id offers nothing', () => {
    const s = { ...continent(), minorNations: continent().minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: N1 } : m)) };
    expect(minorOffers(s, ARVELIA)).toEqual({});
    expect(minorOffers(s, 'minor-9')).toEqual({});
  });

  it('FR-183 units not sold vanish and the stock is endless: the same offer every turn, whatever was bought', () => {
    const s = ordered(consulates(continent(), N1, ARVELIA), buy(N1, ResourceType.Coal, 3));
    const after = resolveTurn(s, {}, s.seed).state;
    expect(minorOffers(after, ARVELIA)).toEqual(minorOffers(continent(), ARVELIA));
  });
});

describe('FR-184 what minors buy', () => {
  it('FR-184 every minor bids for 2 clothing, 2 furniture and 2 hardware a turn', () => {
    for (const m of MINORS) expect(minorDemand(continent(), m)).toEqual({ clothing: 2, furniture: 2, hardware: 2 });
    expect(minorDemand(continent(), 'minor-9')).toEqual({});
  });

  it('FR-184 a minor always pays: a nation with $0 sells it 2 furniture for $1,800', () => {
    let s = setTreasury(setWarehouse(consulates(continent(), N1, ARVELIA), N1, { furniture: 2 }), N1, 0);
    s = ordered(s, sell(N1, GoodsType.Furniture, 2));

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([['sold', N1, ARVELIA, GoodsType.Furniture, 2, 900]]);
    expect(treasury(state, N1)).toBe(1800);
  });
});

describe('FR-185 who may trade', () => {
  it('FR-185 a Great Power and a minor need a consulate: without one no deal, the bid refunded', () => {
    const s = ordered(continent(), buy(N1, ResourceType.Coal, 2));
    const { state, events } = trade(s);
    expect(deals(events)).toEqual([]);
    expect(treasury(state, N1)).toBe(10000);
    expect(tradeBarrier(continent(), N1, ARVELIA)).toBe('no-consulate');
  });

  it('FR-185 FR-163 a consulate ordered this turn counts in this turn\'s trade (the diplomacy phase runs first)', () => {
    const s = ordered(continent(), { kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: ARVELIA }, buy(N1, ResourceType.Coal, 2));
    expect(tradeBarrier(s, N1, ARVELIA)).toBeUndefined();

    const { events } = resolveTurn(s, {}, s.seed);

    expect(deals(events)).toEqual([['bought', N1, ARVELIA, ResourceType.Coal, 2, 100]]);
  });

  it('FR-185 FR-167 at war: no deal even with a consulate; a war declared this turn already stops this turn\'s trade', () => {
    const atWar = setPair(consulates(continent(), N1, ARVELIA), N1, ARVELIA, { war: { aggressors: [N1], since: 1 } });
    expect(tradeBarrier(atWar, N1, ARVELIA)).toBe('at-war');
    expect(deals(trade(ordered(atWar, buy(N1, ResourceType.Coal, 2))).events)).toEqual([]);

    const declared = ordered(consulates(continent(), N1, ARVELIA), buy(N1, ResourceType.Coal, 2), { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA });
    expect(deals(resolveTurn(declared, {}, declared.seed).events)).toEqual([]);
  });

  it('FR-185 FR-171 a boycott by either side stops trade', () => {
    for (const boycotter of [N1, ARVELIA]) {
      const s = setPair(consulates(continent(), N1, ARVELIA), N1, ARVELIA, { boycotts: [boycotter] });
      expect(tradeBarrier(s, N1, ARVELIA)).toBe('boycott');
      expect(deals(trade(ordered(s, buy(N1, ResourceType.Coal, 2))).events)).toEqual([]);
    }
  });

  it('FR-185 two Great Powers trade without a consulate, but not at war or under a boycott', () => {
    const open = setPair(continent(), N1, N2, { consulates: [], embassies: [] });
    expect(tradeBarrier(open, N1, N2)).toBeUndefined();
    const steel = (s: GameState) => ordered(s, sell(N2, MaterialType.Steel, 1), buy(N1, MaterialType.Steel, 1));
    expect(deals(trade(steel(open)).events)).toEqual([['sold', N2, N1, MaterialType.Steel, 1, 300], ['bought', N1, N2, MaterialType.Steel, 1, 300]]);

    for (const patch of [{ war: { aggressors: [N2], since: 1 } }, { boycotts: [N2] }]) {
      const s = setPair(open, N1, N2, patch);
      expect(tradeBarrier(s, N1, N2)).toBe('war' in patch ? 'at-war' : 'boycott');
      expect(deals(trade(steel(s)).events)).toEqual([]);
    }
  });

  it('FR-185 minors never trade with each other; nobody trades with itself or an unknown country', () => {
    expect(tradeBarrier(continent(), ARVELIA, SUNDMARK)).toBe('not-a-partner');
    expect(tradeBarrier(continent(), N1, N1)).toBe('not-a-partner');
    expect(tradeBarrier(continent(), N1, 'minor-9')).toBe('not-a-partner');
  });
});

describe('FR-186 matching in the Board of Trade order', () => {
  it('FR-186 BOARD_ORDER: the 15 Imp1 rows, then fuel and oil', () => {
    expect(BOARD_ORDER).toEqual([
      'clothing', 'furniture', 'hardware', 'armaments', 'cannedFood', 'fabric', 'lumber', 'paper', 'steel',
      'cotton', 'wool', 'timber', 'coal', 'ironOre', 'horses', 'fuel', 'oil',
    ]);
    expect([...BOARD_ORDER].sort()).toEqual([...TRADE_COMMODITIES].sort());
  });

  it('FR-186 example: Arvelia offers 3 coal, Testland (favourite) bids 2 and Valdoria 4: Testland 2, Valdoria 1', () => {
    let s = setPair(consulates(consulates(continent(), N1, ARVELIA), N2, ARVELIA), N1, ARVELIA, { points: 31 });
    s = ordered(s, buy(N1, ResourceType.Coal, 2), buy(N2, ResourceType.Coal, 4));

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([['bought', N1, ARVELIA, ResourceType.Coal, 2, 100], ['bought', N2, ARVELIA, ResourceType.Coal, 1, 100]]);
    expect(ofType(events, 'offer-missed')).toEqual([]);
    expect([deliveries(state, N1), deliveries(state, N2)]).toEqual([{ coal: 2 }, { coal: 1 }]);
    expect([treasury(state, N1), treasury(state, N2)]).toEqual([9800, 9900]);
  });

  it('FR-186 FR-188 example: Valdoria offers 2 steel, Testland bids 3 and no minor sells steel: Testland buys the 2 with its own holds', () => {
    // The seller's holds are not used: Valdoria has none left at settlement
    let s = setHolds(ordered(continent(), sell(N2, MaterialType.Steel, 2), buy(N1, MaterialType.Steel, 3)), N2, 0);
    let { state, events } = trade(s);
    expect(deals(events)).toEqual([['sold', N2, N1, MaterialType.Steel, 2, 300], ['bought', N1, N2, MaterialType.Steel, 2, 300]]);
    expect([treasury(state, N1), treasury(state, N2)]).toEqual([9400, 10600]);
    expect(stockOf(state, N2, MaterialType.Steel)).toBe(8);

    // The buyer's holds are: with 1 hold left Testland takes 1 and the other reached it and passed on
    s = setHolds(ordered(continent(), sell(N2, MaterialType.Steel, 2), buy(N1, MaterialType.Steel, 3)), N1, 1);
    ({ state, events } = trade(s));
    expect(deals(events)).toEqual([['sold', N2, N1, MaterialType.Steel, 1, 300], ['bought', N1, N2, MaterialType.Steel, 1, 300]]);
    expect(ofType(events, 'offer-missed')).toEqual([
      { type: 'offer-missed', nationId: N1, counterpartyId: N2, commodity: MaterialType.Steel, amount: 1, reason: 'no-hold' },
    ]);
    expect(ofType(events, 'offer-unsold')).toEqual([{ type: 'offer-unsold', nationId: N2, commodity: MaterialType.Steel, amount: 1 }]);
    expect(stockOf(state, N2, MaterialType.Steel)).toBe(9);
  });

  it('FR-186 the commodities settle top-down: with 1 hold left Testland gets its cotton (row 10) and misses its coal (row 13)', () => {
    const s = setHolds(ordered(consulates(continent(), N1, ARVELIA), buy(N1, ResourceType.Coal, 1), buy(N1, ResourceType.Cotton, 1)), N1, 1);

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([['bought', N1, ARVELIA, ResourceType.Cotton, 1, 100]]);
    expect(ofType(events, 'offer-missed')).toEqual([
      { type: 'offer-missed', nationId: N1, counterpartyId: ARVELIA, commodity: ResourceType.Coal, amount: 1, reason: 'no-hold' },
    ]);
    expect(treasury(state, N1)).toBe(9900);
  });

  it('FR-186 step 1 before step 3: Testland bids 4 coal, takes Arvelia\'s 3, then 1 of Valdoria\'s 2', () => {
    const s = ordered(consulates(continent(), N1, ARVELIA), buy(N1, ResourceType.Coal, 4), sell(N2, ResourceType.Coal, 2));

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([
      ['bought', N1, ARVELIA, ResourceType.Coal, 3, 100],
      ['sold', N2, N1, ResourceType.Coal, 1, 100],
      ['bought', N1, N2, ResourceType.Coal, 1, 100],
    ]);
    expect(ofType(events, 'offer-unsold')).toEqual([{ type: 'offer-unsold', nationId: N2, commodity: ResourceType.Coal, amount: 1 }]);
    expect(stockOf(state, N2, ResourceType.Coal)).toBe(9);
  });

  it('FR-186 step 2 before step 3: Arvelia\'s demand takes Testland\'s 2 clothing before Valdoria\'s bid', () => {
    let s = setWarehouse(consulates(continent(), N1, ARVELIA), N1, { clothing: 2 });
    s = ordered(s, sell(N1, GoodsType.Clothing, 2), buy(N2, GoodsType.Clothing, 2));

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([['sold', N1, ARVELIA, GoodsType.Clothing, 2, 900]]);
    expect([treasury(state, N1), treasury(state, N2)]).toEqual([11800, 10000]);
  });

  it('FR-186 minors in id order, one event per counterparty: 4 coal from Arvelia (3) and Sundmark (1), not Pellis', () => {
    const s = ordered(consulates(continent(), N1, ARVELIA, SUNDMARK, PELLIS), buy(N1, ResourceType.Coal, 4));

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([['bought', N1, ARVELIA, ResourceType.Coal, 3, 100], ['bought', N1, SUNDMARK, ResourceType.Coal, 1, 100]]);
    expect(deliveries(state, N1)).toEqual({ coal: 4 });
  });

  it('FR-186 FR-188 a minor\'s demand takes a hold of the seller: with 1 hold left Testland sells 1 of 2 clothing, the other comes back', () => {
    let s = setWarehouse(consulates(continent(), N1, ARVELIA), N1, { clothing: 2 });
    s = setHolds(ordered(s, sell(N1, GoodsType.Clothing, 2)), N1, 1);

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([['sold', N1, ARVELIA, GoodsType.Clothing, 1, 900]]);
    expect(ofType(events, 'offer-unsold')).toEqual([{ type: 'offer-unsold', nationId: N1, commodity: GoodsType.Clothing, amount: 1 }]);
    expect(stockOf(state, N1, GoodsType.Clothing)).toBe(1);
  });

  it('FR-186 a minor\'s demand is filled from several sellers in its order: Arvelia buys 2 furniture, 1 from each when each offers 1', () => {
    let s = setWarehouse(setWarehouse(consulates(consulates(continent(), N1, ARVELIA), N2, ARVELIA), N1, { furniture: 1 }), N2, { furniture: 1 });
    s = ordered(s, sell(N1, GoodsType.Furniture, 1), sell(N2, GoodsType.Furniture, 1));

    expect(deals(trade(s).events)).toEqual([['sold', N1, ARVELIA, GoodsType.Furniture, 1, 900], ['sold', N2, ARVELIA, GoodsType.Furniture, 1, 900]]);
  });

  it('FR-186 FR-013 the trade phase leaves a deep-frozen input unchanged', () => {
    let s = setWarehouse(consulates(consulates(continent(), N1, ARVELIA), N2, ARVELIA), N1, { clothing: 2 });
    s = ordered(s, sell(N1, GoodsType.Clothing, 2), buy(N1, ResourceType.Coal, 2), buy(N2, ResourceType.Coal, 2));
    const snapshot = structuredClone(s);
    const frozen = deepFreeze(structuredClone(s));

    trade(frozen);

    expect(frozen).toEqual(snapshot);
  });

  it('FR-186 FR-173 the order of state.nations changes nothing', () => {
    let s = consulates(consulates(continent(), N1, ARVELIA), N2, ARVELIA);
    s = ordered(s, buy(N1, ResourceType.Coal, 2), buy(N2, ResourceType.Coal, 2));
    const swapped = { ...s, nations: [...s.nations].reverse() };

    const a = trade(s);
    const b = trade(swapped);

    expect(b.events).toEqual(a.events);
    expect({ ...b.state, nations: [...b.state.nations].reverse() }).toEqual(a.state);
  });
});

describe('FR-187 the favourite partner', () => {
  it('FR-187 example: Testland at 30 points with a 10% subsidy (35) comes before Valdoria at 33 with none', () => {
    let s = setPair(continent(), N1, ARVELIA, { points: 30, consulates: [N1], subsidies: { [N1]: 10 } });
    s = setPair(s, N2, ARVELIA, { points: 33 });
    expect(partnerRanking(s, ARVELIA)).toEqual([N1, N2]);
    expect(favouritePartner(s, ARVELIA)).toBe(N1);
    expect(favouritePartner(setPair(s, N1, ARVELIA, { subsidies: {} }), ARVELIA)).toBe(N2);
  });

  it('FR-187 FR-152 ties in intentOrder of the turn: Testland first on turn 1, Valdoria on turn 2', () => {
    expect(partnerRanking(continent(), ARVELIA)).toEqual([N1, N2]);
    expect(partnerRanking({ ...continent(), turn: 2 }, ARVELIA)).toEqual([N2, N1]);
  });

  it('FR-187 the favourite gets the first units: Valdoria at 33 takes 2 of Arvelia\'s 3 coal, Testland 1', () => {
    let s = setPair(consulates(consulates(continent(), N1, ARVELIA), N2, ARVELIA), N2, ARVELIA, { points: 33 });
    s = ordered(s, buy(N1, ResourceType.Coal, 2), buy(N2, ResourceType.Coal, 2));

    expect(deals(trade(s).events)).toEqual([['bought', N2, ARVELIA, ResourceType.Coal, 2, 100], ['bought', N1, ARVELIA, ResourceType.Coal, 1, 100]]);
  });

  it('FR-187 on turn 2 with equal points Valdoria is served first', () => {
    let s = { ...consulates(consulates(continent(), N1, ARVELIA), N2, ARVELIA), turn: 2 };
    s = ordered(s, buy(N1, ResourceType.Coal, 2), buy(N2, ResourceType.Coal, 2));

    expect(deals(trade(s).events)).toEqual([['bought', N2, ARVELIA, ResourceType.Coal, 2, 100], ['bought', N1, ARVELIA, ResourceType.Coal, 1, 100]]);
  });
});

describe('FR-188 holds', () => {
  it('FR-188 FR-063 the order-time check stays: offers and bids together at most 4 holds', () => {
    const s = ordered(consulates(continent(), N1, ARVELIA), buy(N1, ResourceType.Coal, 3), sell(N1, MaterialType.Lumber, 1));
    expect(validateOrder(s, buy(N1, ResourceType.Timber, 1))).toEqual({ ok: false, reason: 'limit-reached' });
  });

  it('FR-188 each hold carries one unit a turn: 4 holds buy 4 units in all, the rest of the offers pass on', () => {
    let s = consulates(continent(), N1, ARVELIA);
    s = ordered(s, buy(N1, ResourceType.Coal, 2), buy(N1, ResourceType.Timber, 2));
    expect(deals(trade(s).events)).toEqual([['bought', N1, ARVELIA, ResourceType.Timber, 2, 100], ['bought', N1, ARVELIA, ResourceType.Coal, 2, 100]]);
  });
});

describe('FR-189 prices and cash', () => {
  const subsidised = (percent: 5 | 10 | 25) => setPair(consulates(continent(), N1, ARVELIA), N1, ARVELIA, { subsidies: { [N1]: percent } });

  it('FR-189 example: 10% subsidy toward Arvelia, 2 coal at P = 100 cost $220 ($200 reserved, $20 more paid)', () => {
    const s = ordered(subsidised(10), buy(N1, ResourceType.Coal, 2));
    expect(treasury(s, N1)).toBe(9800);

    const { state, events } = trade(s);

    expect(ofType(events, 'goods-bought')).toEqual([
      { type: 'goods-bought', nationId: N1, commodity: ResourceType.Coal, amount: 2, price: 110, cost: 220, counterpartyId: ARVELIA },
    ]);
    expect(treasury(state, N1)).toBe(9780);
  });

  it('FR-189 example: 1 clothing at P = 900 sells for $810 with a 10% subsidy', () => {
    const s = ordered(setWarehouse(subsidised(10), N1, { clothing: 1 }), sell(N1, GoodsType.Clothing, 1));

    const { state, events } = trade(s);

    expect(ofType(events, 'goods-sold')).toEqual([
      { type: 'goods-sold', nationId: N1, commodity: GoodsType.Clothing, amount: 1, price: 810, income: 810, counterpartyId: ARVELIA },
    ]);
    expect(treasury(state, N1)).toBe(10810);
  });

  it('FR-189 the price is rounded down: wool-like P = 105 with 10% is $115, sold with 5% at P = 1,369 is $1,300', () => {
    let s = subsidised(10);
    s = { ...s, market: { ...marketOf(s), prices: { ...marketOf(s).prices, timber: 105, furniture: 1369 } } };
    s = ordered(setWarehouse(s, N1, { furniture: 1 }), buy(N1, ResourceType.Timber, 1), sell(N1, GoodsType.Furniture, 1));
    expect(deals(trade(s).events)).toEqual([['sold', N1, ARVELIA, GoodsType.Furniture, 1, 1232], ['bought', N1, ARVELIA, ResourceType.Timber, 1, 115]]);

    const five = { ...subsidised(5), market: { ...marketOf(continent()), prices: { ...START_PRICES, furniture: 1369 } } };
    const sold = ordered(setWarehouse(five, N1, { furniture: 1 }), sell(N1, GoodsType.Furniture, 1));
    expect(deals(trade(sold).events)).toEqual([['sold', N1, ARVELIA, GoodsType.Furniture, 1, 1300]]);
  });

  it('FR-189 between Great Powers the buyer pays P less the seller\'s subsidy toward it; the unused reserve comes back', () => {
    let s = setPair(continent(), N1, N2, { subsidies: { [N2]: 10 } });
    s = ordered(s, sell(N2, MaterialType.Steel, 2), buy(N1, MaterialType.Steel, 3));

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([['sold', N2, N1, MaterialType.Steel, 2, 270], ['bought', N1, N2, MaterialType.Steel, 2, 270]]);
    expect([treasury(state, N1), treasury(state, N2)]).toEqual([10000 - 540, 10540]);
  });

  it('FR-189 the buyer\'s own subsidy toward the seller changes nothing between Great Powers', () => {
    let s = setPair(continent(), N1, N2, { subsidies: { [N1]: 25 } });
    s = ordered(s, sell(N2, MaterialType.Steel, 1), buy(N1, MaterialType.Steel, 1));
    expect(deals(trade(s).events)).toEqual([['sold', N2, N1, MaterialType.Steel, 1, 300], ['bought', N1, N2, MaterialType.Steel, 1, 300]]);
  });

  it('FR-189 FR-192 a unit the treasury cannot cover is not bought: offer-missed "no-cash", the rest of the reserve refunded', () => {
    // 25%: $125 a coal. After the bid of 2 ($200 reserved) $30 is left: the first coal comes out of the reserve,
    // the second needs $50 more than the $75 left of it.
    let s = setTreasury(subsidised(25), N1, 230);
    s = ordered(s, buy(N1, ResourceType.Coal, 2));
    expect(treasury(s, N1)).toBe(30);

    const { state, events } = trade(s);

    expect(deals(events)).toEqual([['bought', N1, ARVELIA, ResourceType.Coal, 1, 125]]);
    expect(ofType(events, 'offer-missed')).toEqual([
      { type: 'offer-missed', nationId: N1, counterpartyId: ARVELIA, commodity: ResourceType.Coal, amount: 1, reason: 'no-cash' },
    ]);
    expect(treasury(state, N1)).toBe(105);
  });

  it('FR-189 offered units left the warehouse when ordered; unsold ones are back at the end of the phase; bought ones arrive with the deliveries', () => {
    let s = setWarehouse(consulates(continent(), N1, ARVELIA), N1, { furniture: 3 });
    s = ordered(s, sell(N1, GoodsType.Furniture, 3), buy(N1, ResourceType.Coal, 1));
    expect(stockOf(s, N1, GoodsType.Furniture)).toBe(0);

    const { state } = trade(s);
    expect(stockOf(state, N1, GoodsType.Furniture)).toBe(1);
    expect(stockOf(state, N1, ResourceType.Coal)).toBe(10);
    expect(deliveries(state, N1)).toEqual({ coal: 1 });
    expect(stockOf(tradeDeliverySystem(state, createTurnContext({ turn: 1 })), N1, ResourceType.Coal)).toBe(11);
  });
});

describe('FR-190 prices follow excess demand', () => {
  it('FR-190 the next prices are FR-065 on (unfilled bids and demand) minus (unsold offers), one ctx.rng draw per commodity', () => {
    const s = ordered(consulates(continent(), N1, ARVELIA), buy(N1, ResourceType.Timber, 4));
    const unsold: TradeAmounts = { cotton: 5, timber: 4, coal: 5, ironOre: 4 };
    const unfilled: TradeAmounts = { clothing: 8, furniture: 8, hardware: 8 };

    const { state } = trade(s);

    expect(marketOf(state).prices).toEqual(nextPrices(START_PRICES, unsold, unfilled, createTurnRng(s.seed, s.turn + 1)));
  });

  it('FR-190 example: minors offer 9 timber, 4 are bought, nobody else bids or offers timber: push -2.5%', () => {
    let s = setTile(consulates(continent(), N1, ARVELIA), '12-5', { resource: { type: ResourceType.Timber, level: 1, discovered: true } });
    expect(MINORS.reduce((sum, m) => sum + ((minorOffers(s, m) as Record<string, number>).timber ?? 0), 0)).toBe(9);
    s = ordered(s, buy(N1, ResourceType.Timber, 4));
    const rng = createTurnRng(s.seed, s.turn + 1);
    const draws = TRADE_COMMODITIES.map(() => rng.next());
    const drift = (draws[TRADE_COMMODITIES.indexOf(ResourceType.Timber)] * 2 - 1) * 0.03;

    const { state } = trade(s);

    expect(marketOf(state).prices.timber).toBe(Math.round(100 * (1 + drift - 0.025)));
  });
});

describe('FR-191 FR-172 trade raises relations', () => {
  it('FR-191 example: Testland buys 2 coal and 1 timber from Arvelia and sells it 1 clothing: +3', () => {
    let s = setWarehouse(consulates(continent(), N1, ARVELIA), N1, { clothing: 1 });
    s = ordered(s, buy(N1, ResourceType.Coal, 2), buy(N1, ResourceType.Timber, 1), sell(N1, GoodsType.Clothing, 1));

    const { state, events } = trade(s);

    expect(points(state, N1, ARVELIA)).toBe(33);
    expect(ofType(events, 'relation-changed')).toEqual([]);
  });

  it('FR-172 example: 39 points (yellow) and one trade make 40 (beige): relation-changed from 3 to 4 for the Great Power', () => {
    let s = setPair(consulates(continent(), N1, ARVELIA), N1, ARVELIA, { points: 39 });
    s = ordered(s, buy(N1, ResourceType.Coal, 1));

    const { state, events } = trade(s);

    expect(points(state, N1, ARVELIA)).toBe(40);
    expect(ofType(events, 'relation-changed')).toEqual([{ type: 'relation-changed', nationId: N1, otherId: ARVELIA, from: 3, to: 4 }]);
  });

  it('FR-191 each pair gains on its own: coal from Arvelia and Sundmark raises both pairs by 1', () => {
    const s = ordered(consulates(continent(), N1, ARVELIA, SUNDMARK), buy(N1, ResourceType.Coal, 4));
    const { state } = trade(s);
    expect([points(state, N1, ARVELIA), points(state, N1, SUNDMARK), points(state, N1, PELLIS)]).toEqual([31, 31, 30]);
  });

  it('FR-191 a Great Power pair gains while it holds an embassy; at 49 one trade makes level 5 for both', () => {
    const steel = (s: GameState) => ordered(s, sell(N2, MaterialType.Steel, 1), buy(N1, MaterialType.Steel, 1));
    expect(points(trade(steel(continent())).state, N1, N2)).toBe(41);
    expect(points(trade(steel(setPair(continent(), N1, N2, { consulates: [], embassies: [] }))).state, N1, N2)).toBe(40);

    const { events } = trade(steel(setPair(continent(), N1, N2, { points: 49 })));
    expect(ofType(events, 'relation-changed')).toEqual([
      { type: 'relation-changed', nationId: N1, otherId: N2, from: 4, to: 5 },
      { type: 'relation-changed', nationId: N2, otherId: N1, from: 4, to: 5 },
    ]);
  });

  it('FR-191 FR-172 no deal, no change; the points stay at most 89', () => {
    expect(points(trade(ordered(continent(), buy(N1, ResourceType.Coal, 2))).state, N1, ARVELIA)).toBe(30);
    const top = ordered(setPair(consulates(continent(), N1, ARVELIA), N1, ARVELIA, { points: 89 }), buy(N1, ResourceType.Coal, 1));
    expect(points(trade(top).state, N1, ARVELIA)).toBe(89);
  });
});

describe('FR-192 deal events and the Deal Book data', () => {
  /** Testland with a 10% subsidy toward Arvelia: sells 1 clothing, buys 2 coal, has no hold left for its iron ore. */
  function ledgerTurn() {
    let s = setPair(setWarehouse(consulates(continent(), N1, ARVELIA), N1, { clothing: 1 }), N1, ARVELIA, { subsidies: { [N1]: 10 } });
    s = setHolds(ordered(s, sell(N1, GoodsType.Clothing, 1), buy(N1, ResourceType.Coal, 2), buy(N1, ResourceType.IronOre, 1)), N1, 3);
    return trade(s);
  }

  it('FR-192 in "partners" goods-sold and goods-bought carry the counterparty; in "world" they do not', () => {
    const { events } = ledgerTurn();
    expect(ofType(events, 'goods-sold').map(e => e.counterpartyId)).toEqual([ARVELIA]);
    expect(ofType(events, 'goods-bought').map(e => e.counterpartyId)).toEqual([ARVELIA]);

    const world = trade(ordered(newGame({ seed: 1, world: 'two-islands' }), sell(N1, MaterialType.Lumber, 1), buy(N1, ResourceType.Coal, 1)));
    for (const e of [...ofType(world.events, 'goods-sold'), ...ofType(world.events, 'goods-bought')]) expect(Object.hasOwn(e, 'counterpartyId')).toBe(false);
  });

  it('FR-192 offer-missed names the counterparty and the reason; offer-unsold the units back home', () => {
    const { events } = ledgerTurn();
    expect(ofType(events, 'offer-missed')).toEqual([
      { type: 'offer-missed', nationId: N1, counterpartyId: ARVELIA, commodity: ResourceType.IronOre, amount: 1, reason: 'no-hold' },
    ]);
  });

  it('FR-192 dealBook: the sales, the purchases and the missed offers, and the bottom line', () => {
    const { events } = ledgerTurn();

    expect(dealBook(events, N1)).toEqual({
      sold: [{ kind: 'sold', commodity: GoodsType.Clothing, amount: 1, price: 810, total: 810, counterpartyId: ARVELIA }],
      bought: [
        { kind: 'bought', commodity: ResourceType.Coal, amount: 2, price: 110, total: 220, counterpartyId: ARVELIA },
        { kind: 'missed', commodity: ResourceType.IronOre, amount: 1, counterpartyId: ARVELIA, reason: 'no-hold' },
      ],
      bottomLine: { sold: 810, bought: 220, militaryUpkeep: 0, net: 590 },
    });
    expect(dealBook(events, N2)).toEqual({ sold: [], bought: [], bottomLine: { sold: 0, bought: 0, militaryUpkeep: 0, net: 0 } });
  });

  it('FR-192 dealBook lists the units not sold under Sold, and reads a "world" turn too', () => {
    const { events } = trade(ordered(continent(), sell(N1, MaterialType.Lumber, 2)));
    expect(dealBook(events, N1).sold).toEqual([{ kind: 'unsold', commodity: MaterialType.Lumber, amount: 2 }]);

    const world = trade(ordered(newGame({ seed: 1, world: 'two-islands' }), sell(N1, MaterialType.Lumber, 1), buy(N1, ResourceType.Coal, 2)));
    expect(dealBook(world.events, N1)).toEqual({
      sold: [{ kind: 'sold', commodity: MaterialType.Lumber, amount: 1, price: 300, total: 300 }],
      bought: [{ kind: 'bought', commodity: ResourceType.Coal, amount: 2, price: 100, total: 200 }],
      bottomLine: { sold: 300, bought: 200, militaryUpkeep: 0, net: 100 },
    });
  });
});

describe('FR-194 the Board of Trade rows (engine data for the screen)', () => {
  it('FR-194 one row per commodity in BOARD_ORDER with price, stock, bid, offer, the minors that sell and buy it', () => {
    const s = ordered(continent(), { kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: ARVELIA }, buy(N1, ResourceType.Coal, 2));
    const rows = boardOfTrade(setPair(s, N1, PELLIS, { boycotts: [N1] }), N1);

    expect(rows.map(r => r.commodity)).toEqual(BOARD_ORDER);
    const coal = rows.find(r => r.commodity === ResourceType.Coal)!;
    expect(coal).toEqual({
      commodity: ResourceType.Coal,
      price: 100,
      available: 10,
      bid: 2,
      offer: 0,
      sellers: [
        { minorId: ARVELIA, units: 3, favouriteId: N1 },
        { minorId: SUNDMARK, units: 1, favouriteId: N1, barrier: 'no-consulate' },
        { minorId: PELLIS, units: 1, favouriteId: N1, barrier: 'boycott' },
      ],
      buyers: [],
    });
    const clothing = rows.find(r => r.commodity === GoodsType.Clothing)!;
    expect(clothing.sellers).toEqual([]);
    expect(clothing.buyers.map(b => [b.minorId, b.units, b.barrier])).toEqual([
      [ARVELIA, 2, undefined], [SUNDMARK, 2, 'no-consulate'], [LORRAN, 2, 'no-consulate'], [PELLIS, 2, 'boycott'],
    ]);
  });

  it('FR-194 the engine index exports the M7 API the screens use', () => {
    for (const name of ['boardOfTrade', 'dealBook', 'favouritePartner', 'marketModeOf', 'minorDemand', 'minorOffers', 'partnerRanking', 'tradeBarrier', 'BOARD_ORDER']) {
      expect(typeof (engine as Record<string, unknown>)[name]).not.toBe('undefined');
    }
    expect(nationOf(continent(), N1).merchantMarine.holds).toBe(4);
  });
});
