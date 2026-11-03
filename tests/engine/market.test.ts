// FR-060 to FR-066: the world market. One market per game; every nation trades on it.
import { describe, it, expect } from 'vitest';
import { applyOrder, tryApplyOrder } from '@/engine/orders/apply';
import { Order, RejectReason } from '@/engine/orders/Order';
import { validateOrder } from '@/engine/orders/validate';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { createTurnContext, GameEvent } from '@/engine/turn/context';
import { Rng } from '@/engine/rng';
import { tradeSystem } from '@/engine/systems/tradeSystem';
import { tradeDeliverySystem } from '@/engine/systems/tradeDeliverySystem';
import { isTradeCommodity, marketOf, nextPrices, startMarket, tradeCapacityOf, tradeOrdersOf } from '@/engine/market/market';
import { newGame as engineNewGame } from '@/engine/newGame';
import {
  MAX_BUY_BIDS, PRICE_CEILING, PRICE_FLOOR, START_PRICES, TRADE_COMMODITIES,
} from '@/definisions/marketPrices';
import { MIGRANT_COST, TRAINING_COST } from '@/definisions/ResourceConversions';
import { GameState } from '@/types/GameState';
import { TradeCommodity } from '@/types/Market';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import {
  deepFreeze, emptyWarehouse, game, N1, N2, nationOf, setBuilding, setTreasury, setWarehouse, stockOf, treasury,
} from './fixtures';

const sell = (commodity: string, amount: number, nationId = N1): Order =>
  ({ kind: 'sellCommodity', nationId, commodity: commodity as TradeCommodity, amount });
const buy = (commodity: string, amount: number, nationId = N1): Order =>
  ({ kind: 'buyCommodity', nationId, commodity: commodity as TradeCommodity, amount });

const setHolds = (state: GameState, nationId: string, holds: number): GameState => ({
  ...state,
  nations: state.nations.map(n => (n.id === nationId ? { ...n, merchantMarine: { ...n.merchantMarine, holds } } : n)),
});

const setPrice = (state: GameState, commodity: TradeCommodity, price: number): GameState => {
  const market = marketOf(state);
  return { ...state, market: { ...market, prices: { ...market.prices, [commodity]: price } } };
};

/** Applies the orders in sequence and fails the test on the first refused one. */
const ordered = (state: GameState, ...orders: Order[]): GameState =>
  orders.reduce((s, order) => {
    const { state: next, result } = tryApplyOrder(s, order);
    expect({ order, result }).toEqual({ order, result: { ok: true } });
    return next;
  }, state);

/** nation-1 (5 holds, $10,000) with 3 furniture, 2 steel, 5 grain and 2 gold in its warehouse. */
const stocked = () => emptyWarehouse(game(), N1, { furniture: 3, steel: 2, grain: 5, gold: 2 });

const resolve = (state: GameState) => resolveTurn(state, {}, state.seed);

describe('FR-060 the world market', () => {
  it('FR-060 trades every warehouse commodity except raw food, gold and gems, in a fixed order', () => {
    expect(TRADE_COMMODITIES).toEqual([
      GoodsType.Clothing, GoodsType.Furniture, GoodsType.Hardware, GoodsType.Armaments,
      MaterialType.CannedFood, MaterialType.Fabric, MaterialType.Paper, MaterialType.Lumber, MaterialType.Steel, MaterialType.Fuel,
      ResourceType.Cotton, ResourceType.Wool, ResourceType.Horses, ResourceType.Timber, ResourceType.Coal, ResourceType.IronOre, ResourceType.Oil,
    ]);
    for (const untradeable of ['grain', 'fruit', 'livestock', 'fish', 'gold', 'gems', 'toString', '__proto__', 'constructor', 'mint']) {
      expect({ untradeable, tradeable: isTradeCommodity(untradeable) }).toEqual({ untradeable, tradeable: false });
    }
    for (const c of TRADE_COMMODITIES) expect(isTradeCommodity(c)).toBe(true);
  });

  it('FR-060 start prices: resources $100 (horses $300), materials $300 (canned food $100), goods $900', () => {
    const expected: Record<string, number> = {
      clothing: 900, furniture: 900, hardware: 900, armaments: 900,
      cannedFood: 100, fabric: 300, paper: 300, lumber: 300, steel: 300, fuel: 300,
      cotton: 100, wool: 100, horses: 300, timber: 100, coal: 100, ironOre: 100, oil: 100,
    };
    expect(START_PRICES).toEqual(expected);
  });

  it('FR-060 a new game and the test worlds start with the start market; a state without one reads as the start market', () => {
    const fresh = { prices: { ...START_PRICES }, orders: {}, deliveries: {} };
    expect(startMarket()).toEqual(fresh);
    expect(engineNewGame({ seed: 1 }).market).toEqual(fresh);
    expect(game().market).toEqual(fresh);
    expect(marketOf({ ...game(), market: undefined })).toEqual(fresh);
    // Every call gives a new object, so no state shares a market with another.
    expect(startMarket()).not.toBe(startMarket());
  });
});

interface Case {
  name: string;
  setup?: (s: GameState) => GameState;
  order: Order;
  expected: 'ok' | RejectReason;
}

const sellCases: Case[] = [
  { name: 'FR-061 offering 2 of 3 furniture is ok', order: sell('furniture', 2), expected: 'ok' },
  { name: 'FR-061 offering the whole stock is ok', order: sell('furniture', 3), expected: 'ok' },
  { name: 'FR-061 offering 0 (nothing) is ok', order: sell('furniture', 0), expected: 'ok' },
  { name: 'FR-060 FR-061 raw food cannot be traded', order: sell('grain', 1), expected: 'invalid-target' },
  { name: 'FR-060 FR-061 gold cannot be traded', order: sell('gold', 1), expected: 'invalid-target' },
  { name: 'FR-026 FR-061 an inherited name (toString)', order: sell('toString', 1), expected: 'invalid-target' },
  { name: 'FR-026 FR-061 an inherited name (__proto__)', order: sell('__proto__', 1), expected: 'invalid-target' },
  { name: 'FR-061 an unknown commodity', order: sell('mint', 1), expected: 'invalid-target' },
  { name: 'FR-061 a negative amount', order: sell('furniture', -1), expected: 'invalid-amount' },
  { name: 'FR-061 a fractional amount', order: sell('furniture', 1.5), expected: 'invalid-amount' },
  { name: 'FR-061 a NaN amount', order: sell('furniture', Number.NaN), expected: 'invalid-amount' },
  { name: 'FR-061 more than the warehouse holds', order: sell('furniture', 4), expected: 'insufficient-resources' },
  { name: 'FR-061 FR-063 more units than the holds', setup: s => setHolds(s, N1, 2), order: sell('furniture', 3), expected: 'limit-reached' },
  { name: 'FR-061 FR-063 sales and bids share the holds', setup: s => ordered(setHolds(s, N1, 4), buy('coal', 2)), order: sell('furniture', 3), expected: 'limit-reached' },
  { name: 'FR-061 offering a commodity bid on this turn', setup: s => ordered(s, buy('steel', 1)), order: sell('steel', 1), expected: 'invalid-target' },
  { name: 'FR-061 lowering an offer is ok even with no stock and no holds left', setup: s => setHolds(ordered(s, sell('furniture', 3)), N1, 0), order: sell('furniture', 1), expected: 'ok' },
  { name: 'FR-061 an unknown nation', order: sell('furniture', 1, 'nation-9'), expected: 'unknown-nation' },
];

const buyCases: Case[] = [
  { name: 'FR-062 bidding for 2 coal is ok', order: buy('coal', 2), expected: 'ok' },
  { name: 'FR-062 bidding for canned food, a material, is ok', order: buy('cannedFood', 1), expected: 'ok' },
  { name: 'FR-060 FR-062 raw food cannot be bought', order: buy('fruit', 1), expected: 'invalid-target' },
  { name: 'FR-060 FR-062 gems cannot be bought', order: buy('gems', 1), expected: 'invalid-target' },
  { name: 'FR-026 FR-062 an inherited name (constructor)', order: buy('constructor', 1), expected: 'invalid-target' },
  { name: 'FR-062 a negative amount', order: buy('coal', -2), expected: 'invalid-amount' },
  { name: 'FR-062 a fractional amount', order: buy('coal', 0.5), expected: 'invalid-amount' },
  { name: 'FR-062 bidding for a commodity offered this turn', setup: s => ordered(s, sell('steel', 1)), order: buy('steel', 1), expected: 'invalid-target' },
  {
    name: 'FR-062 a fifth commodity in one turn', setup: s => ordered(setHolds(s, N1, 10), buy('coal', 1), buy('ironOre', 1), buy('timber', 1), buy('cotton', 1)),
    order: buy('wool', 1), expected: 'limit-reached',
  },
  {
    name: 'FR-062 raising one of four bids is ok', setup: s => ordered(setHolds(s, N1, 10), buy('coal', 1), buy('ironOre', 1), buy('timber', 1), buy('cotton', 1)),
    order: buy('coal', 3), expected: 'ok',
  },
  { name: 'FR-062 FR-063 more units than the holds', order: buy('coal', 6), expected: 'limit-reached' },
  { name: 'FR-062 FR-063 bids and sales share the holds', setup: s => ordered(s, sell('furniture', 3)), order: buy('coal', 3), expected: 'limit-reached' },
  { name: 'FR-062 not enough cash at the world price', setup: s => setTreasury(s, N1, 199), order: buy('coal', 2), expected: 'insufficient-funds' },
  { name: 'FR-062 exactly enough cash is ok', setup: s => setTreasury(s, N1, 200), order: buy('coal', 2), expected: 'ok' },
  { name: 'FR-062 the price is the market price, not the start price', setup: s => setTreasury(setPrice(s, ResourceType.Coal, 150), N1, 299), order: buy('coal', 2), expected: 'insufficient-funds' },
  { name: 'FR-062 lowering a bid is ok with no cash', setup: s => setTreasury(ordered(s, buy('coal', 3)), N1, 0), order: buy('coal', 1), expected: 'ok' },
];

describe('FR-061 FR-062 trade order validation', () => {
  it.each([...sellCases, ...buyCases].map(c => [c.name, c] as const))('%s', (_name, c) => {
    const state = deepFreeze(c.setup ? c.setup(stocked()) : stocked());
    const snapshot = structuredClone(state);

    const result = validateOrder(state, c.order);

    expect(result).toEqual(c.expected === 'ok' ? { ok: true } : { ok: false, reason: c.expected });
    expect(state).toEqual(snapshot);
  });

  it('FR-062 at most 4 buy bids a turn (rules 06)', () => {
    expect(MAX_BUY_BIDS).toBe(4);
  });
});

describe('FR-061 selling', () => {
  it('FR-061 the offered units leave the warehouse when ordered; the cash comes in the trade phase', () => {
    const start = deepFreeze(stocked());
    const s = applyOrder(start, sell('furniture', 2));

    expect(stockOf(s, N1, 'furniture')).toBe(1);
    expect(treasury(s, N1)).toBe(10000);
    expect(tradeOrdersOf(s, N1)).toEqual({ sell: { furniture: 2 }, buy: {} });
    expect(nationOf(s, N2)).toEqual(nationOf(start, N2));
    expect(stockOf(start, N1, 'furniture')).toBe(3);
  });

  it('FR-061 a lower offer gives the difference back; 0 cancels and leaves the state as it was', () => {
    const start = stocked();
    const offered = applyOrder(start, sell('furniture', 3));
    const lowered = applyOrder(offered, sell('furniture', 1));

    expect(stockOf(lowered, N1, 'furniture')).toBe(2);
    expect(tradeOrdersOf(lowered, N1).sell).toEqual({ furniture: 1 });
    expect(applyOrder(lowered, sell('furniture', 0))).toEqual(start);
  });
});

describe('FR-062 buying', () => {
  it('FR-062 a bid is paid when ordered at the world price; the goods are not in the warehouse yet', () => {
    const start = deepFreeze(setPrice(stocked(), ResourceType.Coal, 120));
    const s = applyOrder(start, buy('coal', 3));

    expect(treasury(s, N1)).toBe(10000 - 360);
    expect(stockOf(s, N1, 'coal')).toBe(0);
    expect(tradeOrdersOf(s, N1)).toEqual({ sell: {}, buy: { coal: 3 } });
    expect(treasury(start, N1)).toBe(10000);
  });

  it('FR-062 a lower bid is refunded at the same price; 0 cancels and leaves the state as it was', () => {
    const start = stocked();
    const lowered = applyOrder(applyOrder(start, buy('furniture', 3)), buy('furniture', 1));

    expect(treasury(lowered, N1)).toBe(10000 - 900);
    expect(applyOrder(lowered, buy('furniture', 0))).toEqual(start);
  });
});

describe('FR-063 cargo holds', () => {
  it('FR-063 a nation trades at most its holds a turn, sales and bids together', () => {
    expect(tradeCapacityOf(game(), N1)).toEqual({ holds: 5, used: 0, free: 5 });
    expect(tradeCapacityOf(game(), N2)).toEqual({ holds: 3, used: 0, free: 3 });

    const s = ordered(stocked(), sell('furniture', 2), buy('coal', 1));

    expect(tradeCapacityOf(s, N1)).toEqual({ holds: 5, used: 3, free: 2 });
  });

  it('FR-063 a new game has 4 holds (rules 06 section 3)', () => {
    const g = engineNewGame({ seed: 1 });
    expect(tradeCapacityOf(g, g.nations[0].id)).toEqual({ holds: 4, used: 0, free: 4 });
  });
});

const eventsOf = (events: GameEvent[], type: string) => events.filter(e => e.type === type);

describe('FR-064 the trade phase', () => {
  it('FR-064 sales are paid at the world price and reported; purchases are reported; the orders are cleared', () => {
    const start = ordered(stocked(), sell('furniture', 2), buy('coal', 2));
    const twin = stocked();

    const { state, events } = resolve(start);
    const without = resolve(twin).state;

    // The bid was paid when ordered; the sale is paid now.
    expect(treasury(state, N1) - treasury(without, N1)).toBe(2 * 900 - 2 * 100);
    expect(eventsOf(events, 'goods-sold')).toEqual([
      { type: 'goods-sold', nationId: N1, commodity: 'furniture', amount: 2, price: 900, income: 1800 },
    ]);
    expect(eventsOf(events, 'goods-bought')).toEqual([
      { type: 'goods-bought', nationId: N1, commodity: 'coal', amount: 2, price: 100, cost: 200 },
    ]);
    expect(marketOf(state).orders).toEqual({});
    expect(marketOf(state).deliveries).toEqual({});
    expect(tradeOrdersOf(state, N1)).toEqual({ sell: {}, buy: {} });
  });

  it('FR-064 deals run before production: the trade events come before the first goods-produced event', () => {
    const start = ordered(setWarehouse(stocked(), N1, { timber: 4 }), sell('furniture', 1),
      { kind: 'setProduction', nationId: N1, building: 'lumberMill', amount: 2 });

    const { events } = resolve(start);

    const sold = events.findIndex(e => e.type === 'goods-sold');
    const produced = events.findIndex(e => e.type === 'goods-produced');
    expect(sold).toBeGreaterThanOrEqual(0);
    expect(produced).toBeGreaterThan(sold);
  });

  it('FR-064 bought timber is not used by this turn\'s production; it is in the warehouse after the turn and used the next turn', () => {
    // A standing lumber order with no timber in stock: the order stays, production makes nothing.
    const base = setBuilding(emptyWarehouse(game(), N1), N1, 'lumberMill', { orders: { lumber: 1 } });
    const start = ordered(base, buy('timber', 2));

    const first = resolve(start);
    const without = resolve(base).state;

    const lumberMade = (events: GameEvent[]) =>
      events.some(e => e.type === 'goods-produced' && e.nationId === N1 && e.output === 'lumber');
    expect(lumberMade(first.events)).toBe(false);
    expect(stockOf(first.state, N1, 'timber') - stockOf(without, N1, 'timber')).toBe(2);
    expect(lumberMade(resolve(first.state).events)).toBe(true);
  });

  it('FR-064 bought canned food arrives before the meal and feeds the workers', () => {
    // No food in stock and no freight cars: without the canned food all 7 workers starve.
    const empty = emptyWarehouse(game(), N1);
    const noCars = { ...empty, nations: empty.nations.map(n => (n.id === N1 ? { ...n, transportCapacity: 0 } : n)) };
    const base = setHolds(noCars, N1, 7);
    const meal = (events: GameEvent[]) => events.find(e => e.type === 'workers-fed' && e.nationId === N1);

    expect(meal(resolve(base).events)).toMatchObject({ fed: 0, sick: 0, starved: 7 });
    expect(meal(resolve(ordered(base, buy('cannedFood', 7))).events)).toMatchObject({ fed: 7, sick: 0, starved: 0 });
  });

  it('FR-064 every nation trades on the same market in the same phase', () => {
    const start = ordered(setWarehouse(stocked(), N2, { coal: 3 }), sell('furniture', 1), sell('coal', 3, N2));

    const { events } = resolve(start);

    expect(eventsOf(events, 'goods-sold').map(e => (e.type === 'goods-sold' ? [e.nationId, e.commodity, e.amount] : []))).toEqual([
      [N1, 'furniture', 1],
      [N2, 'coal', 3],
    ]);
  });

  it('FR-013 FR-064 the trade phase and the delivery step leave a deep-frozen input unchanged', () => {
    const frozen = deepFreeze(ordered(stocked(), sell('furniture', 2), buy('coal', 2)));
    const snapshot = structuredClone(frozen);
    const ctx = createTurnContext({ turn: frozen.turn, seed: frozen.seed });

    const traded = tradeSystem(frozen, ctx);
    const delivered = tradeDeliverySystem(deepFreeze(traded), ctx);

    expect(frozen).toEqual(snapshot);
    expect(marketOf(traded).deliveries).toEqual({ [N1]: { coal: 2 } });
    expect(stockOf(delivered, N1, 'coal')).toBe(2);
    expect(marketOf(delivered).deliveries).toEqual({});
  });
});

/** An RNG that always returns `value`, and counts the draws. */
const fixedRng = (value: number): Rng & { draws: number } => {
  const rng = { draws: 0, next: () => { rng.draws += 1; return value; } };
  return rng;
};

describe('FR-065 prices', () => {
  const prices = () => ({ ...START_PRICES });

  it('FR-065 with no trade and no drift a price stays; the drift is at most 3% either way', () => {
    expect(nextPrices(prices(), {}, {}, fixedRng(0.5)).furniture).toBe(900);
    expect(nextPrices(prices(), {}, {}, fixedRng(0)).furniture).toBe(873);
    expect(nextPrices(prices(), {}, {}, fixedRng(0.999999)).furniture).toBe(927);
  });

  it('FR-065 every unit sold pushes the price down 0.5% and every unit bought up 0.5%, at most 3% either way', () => {
    const still = fixedRng(0.5);
    expect(nextPrices(prices(), { furniture: 2 }, {}, still).furniture).toBe(891);
    expect(nextPrices(prices(), { furniture: 10 }, {}, still).furniture).toBe(873);
    expect(nextPrices(prices(), {}, { coal: 4 }, still).coal).toBe(102);
    expect(nextPrices(prices(), {}, { coal: 40 }, still).coal).toBe(103);
    // Sales and purchases of one commodity cancel out.
    expect(nextPrices(prices(), { steel: 3 }, { steel: 3 }, still).steel).toBe(300);
  });

  it('FR-065 prices stay between 50% and 250% of the start price', () => {
    expect(PRICE_FLOOR).toBe(0.5);
    expect(PRICE_CEILING).toBe(2.5);
    const low = { ...prices(), furniture: 451 };
    const high = { ...prices(), furniture: 2249 };
    expect(nextPrices(low, { furniture: 10 }, {}, fixedRng(0)).furniture).toBe(450);
    expect(nextPrices(high, {}, { furniture: 10 }, fixedRng(0.999999)).furniture).toBe(2250);
  });

  it('FR-065 one draw per tradeable commodity, even when nobody trades, and the input is not changed', () => {
    const rng = fixedRng(0.5);
    const input = deepFreeze(prices());

    const next = nextPrices(input, {}, {}, rng);

    expect(rng.draws).toBe(TRADE_COMMODITIES.length);
    expect(Object.keys(next).sort()).toEqual([...TRADE_COMMODITIES].sort());
    expect(input).toEqual(START_PRICES);
  });

  it('FR-065 in a resolved turn every price moves at most 3% plus rounding, and some price moves', () => {
    const before = marketOf(game()).prices;
    const after = marketOf(resolve(game()).state).prices;

    for (const c of TRADE_COMMODITIES) {
      expect({ c, within: Math.abs(after[c] - before[c]) <= Math.ceil(before[c] * 0.03) }).toEqual({ c, within: true });
    }
    expect(TRADE_COMMODITIES.some(c => after[c] !== before[c])).toBe(true);
  });

  it('FR-065 a sale lowers the next price against the same turn without it (same seed, same drift)', () => {
    const withSale = resolve(ordered(setHolds(stocked(), N1, 6), sell('furniture', 3), sell('steel', 2))).state;
    const without = resolve(stocked()).state;

    // 3 furniture: -1.5% of 900 = 13.5; rounding of both prices gives at most 1 either way.
    const drop = marketOf(without).prices.furniture - marketOf(withSale).prices.furniture;
    expect(drop).toBeGreaterThanOrEqual(13);
    expect(drop).toBeLessThanOrEqual(14);
  });

  it('FR-065 the same seed gives the same prices; another seed gives other prices', () => {
    const play = (seed: number, turns: number) => {
      let s: GameState = { ...game(), seed };
      for (let i = 0; i < turns; i++) s = resolve(s).state;
      return marketOf(s).prices;
    };

    expect(play(7, 5)).toEqual(play(7, 5));
    expect(play(8, 5)).not.toEqual(play(7, 5));
  });

  it('FR-065 over 39 turns with no trade every price stays within its bounds', () => {
    let s = game();
    for (let i = 0; i < 39; i++) {
      s = resolve(s).state;
      for (const c of TRADE_COMMODITIES) {
        const p = marketOf(s).prices[c];
        expect({ c, p, ok: Number.isInteger(p) && p >= START_PRICES[c] * PRICE_FLOOR && p <= START_PRICES[c] * PRICE_CEILING })
          .toEqual({ c, p, ok: true });
      }
    }
  });
});

describe('FR-066 recruitment and training cost money', () => {
  it('FR-066 a migrant costs canned food, clothing and furniture and no cash; training costs cash (FR-058, unchanged)', () => {
    expect(MIGRANT_COST).toEqual({ cannedFood: 1, clothing: 1, furniture: 1 });
    expect(TRAINING_COST).toEqual({ untrained: { cash: 100, paper: 1 }, trained: { cash: 1000, paper: 2 } });
  });

  it('FR-066 a nation without the goods buys them in one turn and recruits on the next', () => {
    // Enough raw food that nobody eats the bought canned food at the meal.
    const base = emptyWarehouse(game(), N1, { grain: 20, fruit: 20, livestock: 20 });
    const recruit: Order = { kind: 'recruitWorkers', nationId: N1, delta: 1 };
    expect(validateOrder(base, recruit)).toEqual({ ok: false, reason: 'insufficient-resources' });

    const bought = ordered(base, buy('cannedFood', 1), buy('clothing', 1), buy('furniture', 1));
    expect(treasury(bought, N1)).toBe(10000 - (100 + 900 + 900));
    // The goods arrive at the end of the turn, not when bought.
    expect(validateOrder(bought, recruit)).toEqual({ ok: false, reason: 'insufficient-resources' });

    const next = resolve(bought).state;
    expect(validateOrder(next, recruit)).toEqual({ ok: true });
    const recruited = applyOrder(next, recruit);
    expect(treasury(recruited, N1)).toBe(treasury(next, N1));
    expect(nationOf(recruited, N1).industry.recruits).toBe(1);
  });
});
