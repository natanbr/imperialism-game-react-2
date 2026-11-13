// M7 QA fix round. FR-252, FR-253: in "partners" a bid or an offer that nobody the nation may trade with could take this
// turn is refused when ordered, with a reason the Board of Trade and the scripted player share; a bid or offer that a
// rival may win is still allowed. FR-255: the units of a bid or an offer that found no counterparty carry their cause.
// FR-256: the Deal Book data lists the diplomacy costs of the turn and explains the treasury's change.
// Testland is nation-1, Valdoria nation-2; Arvelia minor-1, Sundmark minor-2, Lorran minor-3, Pellis minor-4.
// Continent start offers: timber (Arvelia 4, Sundmark 1, Lorran 2, Pellis 1), coal (3, 1, 0, 1), iron ore (2, 1, 1, 0),
// cotton (2, 1, 0, 2); every minor buys 2 clothing, 2 furniture, 2 hardware; nobody offers or buys anything else.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { applyBuyCommodity, applySellCommodity } from '@/engine/orders/tradeOrders';
import { validateOrder } from '@/engine/orders/validate';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { tradeSystem } from '@/engine/systems/tradeSystem';
import { buyersOf, partnerRefusal, sellersOf } from '@/engine/market/partners';
import { dealBook } from '@/engine/market/dealBook';
import { pairKey } from '@/engine/diplomacy/relations';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import type { GameState } from '@/types/GameState';
import type { TradeCommodity } from '@/types/Market';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { N1, N2, setPair, setWarehouse } from './fixtures';

const ARVELIA = 'minor-1';
const SUNDMARK = 'minor-2';
const LORRAN = 'minor-3';
const PELLIS = 'minor-4';

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const sell = (nationId: string, commodity: string, amount: number): Order => ({ kind: 'sellCommodity', nationId, commodity: commodity as TradeCommodity, amount });
const buy = (nationId: string, commodity: string, amount: number): Order => ({ kind: 'buyCommodity', nationId, commodity: commodity as TradeCommodity, amount });
const consulate = (nationId: string, targetId: string): Order => ({ kind: 'proposeOverture', nationId, overture: 'consulate', targetId });

const ordered = (state: GameState, ...orders: Order[]): GameState =>
  orders.reduce((s, order) => {
    const { state: next, result } = tryApplyOrder(s, order);
    expect({ order, result }).toEqual({ order, result: { ok: true } });
    return next;
  }, state);
/** Places a bid or an offer with its order-time effects but without the order-time check (see partnerMarket.test.ts). */
const placed = (state: GameState, ...orders: Order[]): GameState =>
  orders.reduce((s, o) => (o.kind === 'sellCommodity' ? applySellCommodity(s, o) : o.kind === 'buyCommodity' ? applyBuyCommodity(s, o) : s), state);
/** Test setup: the nation holds a consulate in each minor given (FR-163). */
const consulates = (state: GameState, nationId: string, ...minors: string[]): GameState =>
  minors.reduce((s, m) => setPair(s, nationId, m, { consulates: [...s.diplomacy[pairKey(nationId, m)].consulates, nationId].sort() }), state);
const refused = (reason: string) => ({ ok: false, reason });
const OK = { ok: true };

function trade(s: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  tradeSystem(s, createTurnContext({ turn: s.turn, seed: s.seed, emit: e => events.push(e) }));
  return events;
}
const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

describe('FR-252 a bid needs a minor that sells the commodity and that the nation may trade with', () => {
  it('FR-252 a commodity no minor nation offers this turn: "no-seller", for goods and materials alike', () => {
    for (const commodity of [MaterialType.Lumber, MaterialType.Steel, GoodsType.Clothing, ResourceType.Wool, ResourceType.Horses]) {
      expect(validateOrder(consulates(continent(), N1, ARVELIA), buy(N1, commodity, 1))).toEqual(refused('no-seller'));
    }
    expect(sellersOf(continent(), ResourceType.Coal)).toEqual([ARVELIA, SUNDMARK, PELLIS]);
    expect(sellersOf(continent(), MaterialType.Lumber)).toEqual([]);
  });

  it('FR-252 every seller barred: "sellers-barred" without a consulate, at war, under a boycott; a consulate ordered this turn opens it', () => {
    expect(validateOrder(continent(), buy(N1, ResourceType.Coal, 1))).toEqual(refused('sellers-barred'));
    // Arvelia at war, Sundmark under a boycott, Pellis without a consulate: still no seller open to Testland
    let s = setPair(consulates(continent(), N1, ARVELIA, SUNDMARK), N1, ARVELIA, { war: { aggressors: [N1], since: 1 } });
    s = setPair(s, N1, SUNDMARK, { boycotts: [SUNDMARK] });
    expect(validateOrder(s, buy(N1, ResourceType.Coal, 1))).toEqual(refused('sellers-barred'));
    // Lorran sells no coal: a consulate there does not help; one with Pellis, ordered this turn, does
    expect(validateOrder(ordered(s, consulate(N1, LORRAN)), buy(N1, ResourceType.Coal, 1))).toEqual(refused('sellers-barred'));
    expect(validateOrder(ordered(s, consulate(N1, PELLIS)), buy(N1, ResourceType.Coal, 1))).toEqual(OK);
    // A war declared this turn already bars the seller (FR-246)
    const war = ordered(consulates(continent(), N1, ARVELIA), { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA });
    expect(validateOrder(war, buy(N1, ResourceType.Coal, 1))).toEqual(refused('sellers-barred'));
  });

  it('FR-252 a bid a rival may win is allowed: Arvelia favours Valdoria, Testland may still bid', () => {
    const s = setPair(consulates(continent(), N1, ARVELIA), N2, ARVELIA, { points: 40 });
    expect(partnerRefusal(s, N1, 'buy', ResourceType.Coal)).toBeUndefined();
    expect(validateOrder(s, buy(N1, ResourceType.Coal, 3))).toEqual(OK);
  });

  it('FR-252 lowering a bid is always allowed: a bid whose consulate was withdrawn can come down, not go up', () => {
    let s = ordered(continent(), consulate(N1, ARVELIA), buy(N1, ResourceType.Coal, 2));
    s = ordered(s, { kind: 'withdrawOverture', nationId: N1, overture: 'consulate', targetId: ARVELIA });
    expect(validateOrder(s, buy(N1, ResourceType.Coal, 3))).toEqual(refused('sellers-barred'));
    expect(validateOrder(s, buy(N1, ResourceType.Coal, 1))).toEqual(OK);
    expect(validateOrder(s, buy(N1, ResourceType.Coal, 0))).toEqual(OK);
  });

  it('FR-252 the market\'s reason comes before the nation\'s own limits: with every hold taken a lumber bid is "no-seller"', () => {
    const s = ordered(consulates(continent(), N1, ARVELIA), buy(N1, ResourceType.Coal, 2), buy(N1, ResourceType.Timber, 2));
    expect(validateOrder(s, buy(N1, ResourceType.IronOre, 1))).toEqual(refused('limit-reached'));
    expect(validateOrder(s, buy(N1, MaterialType.Lumber, 1))).toEqual(refused('no-seller'));
  });

  it('FR-252 FR-253 in "world" nothing changes: the world sells and buys everything', () => {
    const world = newGame({ seed: 1, world: 'continent', market: 'world' });
    expect(validateOrder(world, buy(N1, MaterialType.Steel, 1))).toEqual(OK);
    expect(validateOrder(world, sell(N1, MaterialType.Lumber, 1))).toEqual(OK);
    expect(partnerRefusal(world, N1, 'buy', MaterialType.Steel)).toBeUndefined();
  });
});

describe('FR-253 an offer needs a buyer the nation may trade with: a minor that wants it, or a Great Power that may bid for it', () => {
  it('FR-253 a commodity no minor wants and no Great Power may bid for: "no-buyer"', () => {
    for (const commodity of [MaterialType.Lumber, MaterialType.Steel, ResourceType.Timber, ResourceType.Coal]) {
      expect(validateOrder(consulates(continent(), N1, ARVELIA), sell(N1, commodity, 1))).toEqual(refused('no-buyer'));
    }
    expect(buyersOf(continent(), N1, MaterialType.Lumber)).toEqual([]);
  });

  it('FR-253 goods with every minor buyer barred: "buyers-barred"; a consulate with one of them opens the offer', () => {
    const s = setWarehouse(continent(), N1, { clothing: 2 });
    expect(validateOrder(s, sell(N1, GoodsType.Clothing, 1))).toEqual(refused('buyers-barred'));
    expect(validateOrder(ordered(s, consulate(N1, PELLIS)), sell(N1, GoodsType.Clothing, 2))).toEqual(OK);
  });

  it('FR-253 raw a rival may bid for is allowed: Valdoria with a consulate in Arvelia (which sells timber) may buy Testland\'s timber', () => {
    const s = consulates(continent(), N2, ARVELIA);
    expect(buyersOf(s, N1, ResourceType.Timber)).toEqual([N2]);
    expect(validateOrder(s, sell(N1, ResourceType.Timber, 2))).toEqual(OK);
    // Arvelia sells iron ore too, so Valdoria may bid for Testland's iron ore as well
    expect(validateOrder(s, sell(N1, ResourceType.IronOre, 1))).toEqual(OK);
    // At war with Valdoria, the one buyer is barred
    expect(validateOrder(setPair(s, N1, N2, { war: { aggressors: [N2], since: 1 } }), sell(N1, ResourceType.Timber, 1))).toEqual(refused('buyers-barred'));
  });

  it('FR-253 a Great Power that already bids for the commodity is a buyer', () => {
    const s = placed(continent(), buy(N2, MaterialType.Steel, 1));
    expect(buyersOf(s, N1, MaterialType.Steel)).toEqual([N2]);
    expect(validateOrder(s, sell(N1, MaterialType.Steel, 1))).toEqual(OK);
  });

  it('FR-252 FR-253 the scripted player\'s orders pass the check: 6 turns of both nations scripted, no order refused', () => {
    let s = continent();
    for (let turn = 0; turn < 6; turn++) {
      const orders = { [N1]: scriptedPlayer(s, N1), [N2]: scriptedPlayer(s, N2) };
      const { state, events } = resolveTurn(s, orders, s.seed);
      expect(ofType(events, 'order-rejected')).toEqual([]);
      s = state;
    }
  });
});

describe('FR-255 the cause of units not traded', () => {
  it('FR-255 a bid nobody offered: "nobody"', () => {
    const events = trade(placed(continent(), buy(N1, MaterialType.Steel, 2)));
    expect(ofType(events, 'bid-unfilled')).toEqual([{ type: 'bid-unfilled', nationId: N1, commodity: MaterialType.Steel, amount: 2, cause: { kind: 'nobody' } }]);
  });

  it('FR-255 a war declared after the bid: "barred", each seller with its barrier (Arvelia at war, Sundmark and Pellis no consulate)', () => {
    const s = ordered(consulates(continent(), N1, ARVELIA), buy(N1, ResourceType.Coal, 2), { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA });
    const { events } = resolveTurn(s, {}, s.seed);
    expect(ofType(events, 'bid-unfilled').filter(e => e.nationId === N1)).toEqual([
      {
        type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Coal, amount: 2,
        cause: { kind: 'barred', barred: [{ countryId: ARVELIA, barrier: 'at-war' }, { countryId: SUNDMARK, barrier: 'no-consulate' }, { countryId: PELLIS, barrier: 'no-consulate' }] },
      },
    ]);
  });

  it('FR-255 FR-259 an offer the favourite rival served first: "served-first" with Valdoria, and the barred minors that still wanted clothing', () => {
    let s = setPair(consulates(consulates(continent(), N1, ARVELIA), N2, ARVELIA), N2, ARVELIA, { points: 40 });
    s = ordered(setWarehouse(setWarehouse(s, N1, { clothing: 2 }), N2, { clothing: 2 }), sell(N1, GoodsType.Clothing, 2), sell(N2, GoodsType.Clothing, 2));
    const events = trade(s);
    const barred = [SUNDMARK, LORRAN, PELLIS].map(countryId => ({ countryId, barrier: 'no-consulate' }));
    expect(ofType(events, 'offer-unsold')).toEqual([
      { type: 'offer-unsold', nationId: N1, commodity: GoodsType.Clothing, amount: 2, cause: { kind: 'served-first', rivalIds: [N2], barred } },
    ]);
  });

  it('FR-255 FR-259 an offer above the open buyers\' demand: "used-up" (Arvelia wanted 2 of 3), and the barred minors that still wanted furniture', () => {
    const s = ordered(setWarehouse(consulates(continent(), N1, ARVELIA), N1, { furniture: 3 }), sell(N1, GoodsType.Furniture, 3));
    const barred = [SUNDMARK, LORRAN, PELLIS].map(countryId => ({ countryId, barrier: 'no-consulate' }));
    expect(ofType(trade(s), 'offer-unsold')).toEqual([{ type: 'offer-unsold', nationId: N1, commodity: GoodsType.Furniture, amount: 1, cause: { kind: 'used-up', barred } }]);
  });

  it('FR-259 a barred minor whose units all went to a rival is not named: a consulate there would not have served Testland', () => {
    // Iron ore: Arvelia 2, Sundmark 1, Lorran 1. Testland has a consulate in Arvelia only; Valdoria in all three and is Arvelia's favourite
    let s = setPair(consulates(consulates(continent(), N1, ARVELIA), N2, ARVELIA, SUNDMARK, LORRAN), N2, ARVELIA, { points: 40 });
    // Valdoria bids for all 4: Sundmark's and Lorran's units went to it, so only Valdoria explains Testland's 2
    const all = trade(ordered(s, buy(N1, ResourceType.IronOre, 2), buy(N2, ResourceType.IronOre, 4)));
    expect(ofType(all, 'bid-unfilled')).toEqual([
      { type: 'bid-unfilled', nationId: N1, commodity: ResourceType.IronOre, amount: 2, cause: { kind: 'served-first', rivalIds: [N2] } },
    ]);
    // Valdoria bids for Arvelia's 2 only: Sundmark's and Lorran's units went to nobody, so they are named
    s = ordered(s, buy(N1, ResourceType.IronOre, 2), buy(N2, ResourceType.IronOre, 2));
    const barred = [SUNDMARK, LORRAN].map(countryId => ({ countryId, barrier: 'no-consulate' }));
    expect(ofType(trade(s), 'bid-unfilled')).toEqual([
      { type: 'bid-unfilled', nationId: N1, commodity: ResourceType.IronOre, amount: 2, cause: { kind: 'served-first', rivalIds: [N2], barred } },
    ]);
  });

  it('FR-259 a barred Great Power that still bids is named too, after the minors: Testland at war with Valdoria, which bids for clothing', () => {
    let s = setWarehouse(consulates(continent(), N1, ARVELIA), N1, { clothing: 3 });
    s = placed(ordered(s, sell(N1, GoodsType.Clothing, 3)), buy(N2, GoodsType.Clothing, 2));
    s = setPair(s, N1, N2, { war: { aggressors: [N2], since: 1 } });
    // Arvelia takes 2 of the 3; the other minors (no consulate) and Valdoria (at war) still wanted clothing
    const barred = [...[SUNDMARK, LORRAN, PELLIS].map(countryId => ({ countryId, barrier: 'no-consulate' })), { countryId: N2, barrier: 'at-war' }];
    expect(ofType(trade(s), 'offer-unsold')).toEqual([
      { type: 'offer-unsold', nationId: N1, commodity: GoodsType.Clothing, amount: 1, cause: { kind: 'used-up', barred } },
    ]);
  });

  it('FR-255 unknown when an open Great Power still bids: it could not take the units (its own offer-missed says why)', () => {
    let s = placed(continent(), sell(N2, MaterialType.Steel, 2), buy(N1, MaterialType.Steel, 2));
    s = { ...s, nations: s.nations.map(n => (n.id === N1 ? { ...n, merchantMarine: { ...n.merchantMarine, holds: 1 } } : n)) };
    const events = trade(s);
    expect(ofType(events, 'offer-unsold')).toEqual([{ type: 'offer-unsold', nationId: N2, commodity: MaterialType.Steel, amount: 1 }]);
    expect(ofType(events, 'offer-missed').map(e => [e.nationId, e.reason])).toEqual([[N1, 'no-hold']]);
  });
});

describe('FR-256 the diplomacy costs and the treasury change in the Deal Book data', () => {
  const EVENTS: GameEvent[] = [
    { type: 'overture-done', nationId: N1, overture: 'consulate', targetId: ARVELIA },
    { type: 'overture-done', nationId: N1, overture: 'pact', targetId: SUNDMARK },
    { type: 'overture-done', nationId: N2, overture: 'embassy', targetId: ARVELIA },
    { type: 'overture-done', nationId: N1, overture: 'embassy', targetId: N2 },
    { type: 'grant-paid', nationId: N1, targetId: SUNDMARK, amount: 1000 },
    { type: 'goods-bought', nationId: N1, commodity: ResourceType.Coal, amount: 3, price: 100, cost: 300, counterpartyId: ARVELIA },
  ];

  it('FR-256 consulates and embassies opened (at $500 and $5,000) and grants paid are the diplomacy costs; a pact costs nothing; another nation\'s are not ours', () => {
    expect(dealBook(EVENTS, N1).diplomacy).toEqual([
      { kind: 'consulate', targetId: ARVELIA, amount: 500 },
      { kind: 'embassy', targetId: N2, amount: 5000 },
      { kind: 'grant', targetId: SUNDMARK, amount: 1000 },
    ]);
    expect(dealBook(EVENTS, N2).diplomacy).toEqual([{ kind: 'embassy', targetId: ARVELIA, amount: 5000 }]);
  });

  it('FR-256 with the treasury at the start and the end: the change, and what the trade and the diplomacy leave unexplained', () => {
    // Trade net -300, diplomacy 6,500, a change of -7,000: $200 of other spending (a development, say)
    expect(dealBook(EVENTS, N1, { start: 10000, end: 3000 }).treasury).toEqual({ start: 10000, end: 3000, change: -7000, other: -200 });
    expect(dealBook(EVENTS, N1, { start: 10000, end: 3200 }).treasury).toEqual({ start: 10000, end: 3200, change: -6800, other: 0 });
    expect(dealBook(EVENTS, N1).treasury).toBeUndefined();
  });

  it('FR-256 a resolved turn: a consulate with Arvelia and 2 coal bought explain the whole change, other is 0', () => {
    const s = ordered(continent(), consulate(N1, ARVELIA), buy(N1, ResourceType.Coal, 2));
    const { state, events } = resolveTurn(s, {}, s.seed);
    const end = state.nations.find(n => n.id === N1)!.treasury;
    const book = dealBook(events, N1, { start: 10000, end });
    expect(book.diplomacy).toEqual([{ kind: 'consulate', targetId: ARVELIA, amount: 500 }]);
    expect(book.bottomLine).toMatchObject({ bought: 200, militaryUpkeep: 100, net: -300 }); // FR-202: the start army's upkeep
    expect(book.treasury).toEqual({ start: 10000, end: 9200, change: -800, other: 0 });
  });
});
