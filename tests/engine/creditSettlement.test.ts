import { describe, expect, it } from 'vitest';
import { marketOf } from '@/engine/market/market';
import { newGame } from '@/engine/newGame';
import type { Order } from '@/engine/orders/Order';
import { upkeepSystem } from '@/engine/systems/armySystem';
import { productionSystem } from '@/engine/systems/productionSystem';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { runTurnPhases, TURN_PHASES } from '@/engine/turn/phases';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import { GoodsType, ResourceType } from '@/types/Resource';
import { ARVELIA, continent, idOf, SW1 } from './armyFixtures';
import { runGame } from './sim/harness';
import { deepFreeze, emptyWarehouse, game, invariantViolations, N1, N2, nationOf, setPair, setTile, setTreasury, setWarehouse, stockOf, T, treasury } from './fixtures';

// A mid-game fixture with an already authorized line, independent of the opening Order under test elsewhere.
function account(state: GameState, cash: number, limit = 200, saleReceipts: number[] = []): GameState {
  return { ...state, nations: state.nations.map(n => n.id === N1 ? { ...n, treasury: cash, creditAccount: { limit, saleReceipts } } : n) };
}
const islands = () => emptyWarehouse(newGame({ seed: 1, world: 'two-islands' }), N1);
const settle = (state: GameState, ...orders: Order[]) => resolveTurn(state, { [N1]: orders });
const eventsOf = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

describe('FR-601 posted limit', () => {
  it.each([['world', 3612], ['partners', 2706]] as const)('%s counts actual receipts and four settled turns including zero sales', (mode, receipts) => {
    const base = setPair(setWarehouse(continent(mode), N1, { clothing: 2, furniture: 2 }), N1, ARVELIA,
      { consulates: [N1], subsidies: { [N1]: 25 } });
    const market = marketOf(base);
    let result = settle(account({ ...base, market: { ...market, prices: { ...market.prices, clothing: 905, furniture: 901 } } }, 10000),
      { kind: 'sellCommodity', nationId: N1, commodity: GoodsType.Clothing, amount: 2 },
      { kind: 'sellCommodity', nationId: N1, commodity: GoodsType.Furniture, amount: 2 });
    expect(eventsOf(result.events, 'order-rejected')).toEqual([]);
    expect(eventsOf(result.events, 'goods-sold').reduce((sum, e) => sum + e.income, 0)).toBe(receipts);
    for (let age = 0; age < 4; age++) {
      expect(nationOf(result.state, N1).creditAccount).toEqual({ limit: Math.floor(receipts / 10), saleReceipts: [receipts, ...Array(age).fill(0)] });
      result = settle(result.state);
    }
    expect(nationOf(result.state, N1).creditAccount).toEqual({ limit: 200, saleReceipts: [0, 0, 0, 0] });
    expect(nationOf(result.state, N2).creditAccount).toBeUndefined();
  });
});

describe('FR-602 upkeep and interest', () => {
  it.each([
    [1, 3, 0], [50, 3, 2], [100, 3, 3], [101, 6, 6],
  ])('charges whole debt %i at %i percent, nearest dollar half up', (debt, ratePercent, amount) => {
    const { state, events } = settle(account(islands(), -debt));
    expect(eventsOf(events, 'credit-interest')).toEqual([{ type: 'credit-interest', nationId: N1, debt, limit: 200, ratePercent, amount }]);
    expect(treasury(state, N1)).toBe(-debt - amount);
  });

  it('uses the refreshed limit on the worked $625 debt at $922, even if the old posted limit would use the low band', () => {
    const { state, events } = settle(account(islands(), -625, 1600, [6780, 9220, 0, 0]));
    expect(eventsOf(events, 'credit-interest')).toEqual([{ type: 'credit-interest', nationId: N1, debt: 625, limit: 922, ratePercent: 6, amount: 38 }]);
    expect(treasury(state, N1)).toBe(-663);
    expect(eventsOf(events, 'credit-settled')).toEqual([{ type: 'credit-settled', nationId: N1, limit: 922, closingDebt: 663 }]);
  });

  it('takes full upkeep after voluntary disbands and preserves the cash-only partner’s no-pay disband', () => {
    const base = account(setTreasury(continent(), N2, 0), 0);
    const order: Order = { kind: 'disbandRegiments', nationId: N1, provinceId: SW1, regimentIds: [idOf(base, N1, '1st Artillery')] };
    const { state, events } = settle(base, order);
    expect(eventsOf(events, 'regiments-disbanded')).toEqual([
      { type: 'regiments-disbanded', nationId: N1, reason: 'order', count: 1 },
      { type: 'regiments-disbanded', nationId: N2, reason: 'no-pay', count: 3 },
    ]);
    expect(eventsOf(events, 'army-upkeep')).toEqual([{ type: 'army-upkeep', nationId: N1, amount: 50 }]);
    expect(eventsOf(events, 'credit-interest').map(e => e.amount)).toEqual([2]);
    expect([treasury(state, N1), treasury(state, N2)]).toEqual([-52, 0]);
  });

  it.each([[-190, 90, 3, -93], [-100, 0, 0, 0], [-40, 0, 0, 60]])('an ordinary sale on cash %i reduces the interest basis before assessment', (cash, debt, amount, closing) => {
    const s = account(setWarehouse(islands(), N1, { coal: 1 }), cash);
    const { state, events } = settle(s, { kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 });
    expect(eventsOf(events, 'goods-sold').map(e => e.income)).toEqual([100]);
    expect(eventsOf(events, 'credit-interest')).toEqual(debt ? [{ type: 'credit-interest', nationId: N1, debt, limit: 200, ratePercent: 3, amount }] : []);
    expect(treasury(state, N1)).toBe(closing);
  });

  it('collecting gold after assessment clears excess and counts only toward the next interest assessment', () => {
    const base = account(setTile(emptyWarehouse(game(), N1), T.mountains1, { resource: { type: ResourceType.Gold, level: 2, discovered: true } }), -250);
    const input = { ...base, transportAllocationsByNation: { [N1]: { gold: 1 } } };
    const first = settle(input);
    expect(eventsOf(first.events, 'credit-interest').map(e => [e.debt, e.amount])).toEqual([[250, 15]]);
    expect(treasury(first.state, N1)).toBe(-65);
    expect(eventsOf(first.events, 'credit-settled').map(e => e.closingDebt)).toEqual([65]);
    const observed: GameEvent[] = [];
    runTurnPhases(input, createTurnContext({ turn: input.turn, seed: input.seed, emit: e => observed.push(e) }));
    expect(eventsOf(observed, 'credit-settled').map(e => e.closingDebt)).toEqual([65]);
    expect(nationOf(first.state, N1).creditAccount?.saleReceipts).toEqual([0]);
    expect(eventsOf(settle(first.state).events, 'credit-interest').map(e => [e.debt, e.amount])).toEqual([[65, 2]]);
  });
});

describe('FR-603 forced sale', () => {
  it('NR-039 accepts legitimate unpaid excess in the simulation turn record', () => {
    const { turns } = runGame({
      seed: 1, world: 'continent', turns: 1,
      human: {
        name: 'borrower',
        setup: state => setTreasury(emptyWarehouse(state, N1), N1, 300),
        orders: () => [
          { kind: 'openCredit', nationId: N1 },
          { kind: 'proposeOverture', nationId: N1, targetId: ARVELIA, overture: 'consulate' },
        ],
      },
    });
    // $300 minus $500 consulate, $100 upkeep and $18 interest. No stock is available to sell.
    expect(turns[0].humanOrders).toBe(2);
    expect(turns[0].treasury[N1]).toBe(-318);
    expect(turns[0].invariantViolations).toEqual([]);
  });

  it('retains stock exactly at the limit after interest, then sells a whole unit at its posted post-trade price and credits the surplus', () => {
    const base = setWarehouse(islands(), N1, { timber: 2 });
    const equal = settle(account(base, -189));
    expect(treasury(equal.state, N1)).toBe(-200);
    expect(eventsOf(equal.events, 'forced-sale')).toEqual([]);
    const input = deepFreeze(account(base, -190));
    const over = settle(input);
    expect(settle(input)).toEqual(over);
    const price = Math.floor(marketOf(over.state).prices.timber / 2);
    expect(eventsOf(over.events, 'forced-sale')).toEqual([{ type: 'forced-sale', nationId: N1, commodity: 'timber', amount: 1, price, proceeds: price }]);
    expect(treasury(over.state, N1)).toBe(-201 + price);
    expect(nationOf(over.state, N1).creditAccount?.saleReceipts).toEqual([0]);
    expect(eventsOf(over.events, 'goods-sold')).toEqual([]);
  });

  it('sells in Board order at floor-half with a $1 minimum, stopping within the last commodity', () => {
    // Supply post-trade prices directly to exercise the $1 floor below the ordinary world price generator’s range.
    const base = account(setWarehouse(islands(), N1, { clothing: 2, furniture: 4, hardware: 5 }), -205);
    const market = marketOf(base);
    const start = { ...base, market: { ...market, prices: { ...market.prices, clothing: 1, furniture: 13 } } };
    const events: GameEvent[] = [];
    const ctx = createTurnContext({ turn: start.turn, emit: event => events.push(event) });
    const beforeProduction = TURN_PHASES.slice(TURN_PHASES.indexOf(upkeepSystem) + 1, TURN_PHASES.indexOf(productionSystem));
    const after = beforeProduction.reduce((state, phase) => phase(state, ctx), deepFreeze<GameState>(start));
    expect(eventsOf(events, 'forced-sale')).toEqual([
      { type: 'forced-sale', nationId: N1, commodity: 'clothing', amount: 2, price: 1, proceeds: 2 },
      { type: 'forced-sale', nationId: N1, commodity: 'furniture', amount: 3, price: 6, proceeds: 18 },
    ]);
    expect([treasury(after, N1), stockOf(after, N1, 'furniture'), stockOf(after, N1, 'hardware')]).toEqual([-197, 1, 5]);
  });

  it('exhausts available tradables before production, preserves raw food and precious metals, and carries the uncovered debt', () => {
    const input = account(emptyWarehouse(game(), N1, { timber: 2, fish: 4, gold: 2 }), -500);
    const build: Order = { kind: 'setProduction', nationId: N1, building: 'lumberMill', amount: 1 };
    const control = settle(setTreasury(input, N1, 0), build);
    expect(eventsOf(control.events, 'goods-produced')).toContainEqual({ type: 'goods-produced', nationId: N1, output: 'lumber', amount: 1 });
    const { state, events } = settle(input, build);
    expect(eventsOf(events, 'order-rejected')).toEqual([]);
    const price = Math.floor(marketOf(state).prices.timber / 2);
    expect(eventsOf(events, 'forced-sale')).toEqual([{ type: 'forced-sale', nationId: N1, commodity: 'timber', amount: 2, price, proceeds: 2 * price }]);
    expect(eventsOf(events, 'goods-produced').filter(e => e.nationId === N1)).toEqual([]);
    expect(treasury(state, N1)).toBe(-530 + 2 * price);
    expect(invariantViolations(state, events)).toEqual([]);
    const overspent = treasury(state, N1) - 1;
    expect(invariantViolations(setTreasury(state, N1, overspent), events)).toContain(`nation ${N1} treasury ${overspent}`);
    expect(state.gameOver).toBeUndefined();
    expect(eventsOf(events, 'regiments-disbanded')).toEqual([]);
    expect(eventsOf(settle(account(islands(), -500)).events, 'forced-sale')).toEqual([]);
  });

  it('can liquidate an unsold returned offer while a purchased import arrives only after liquidation', () => {
    const base = account(setPair(emptyWarehouse(continent(), N1, { clothing: 3 }), N1, ARVELIA, { consulates: [N1] }), -2400);
    // The three offered units have already left stock; only two can meet this minor's demand. A paid import is in transit.
    const market = marketOf(base);
    const input = { ...base, market: { ...market, deliveries: { [N1]: { furniture: 1 } } } };
    const { state, events } = settle(input, { kind: 'sellCommodity', nationId: N1, commodity: GoodsType.Clothing, amount: 3 });
    expect(eventsOf(events, 'goods-sold').map(e => e.amount)).toEqual([2]);
    expect(eventsOf(events, 'offer-unsold').map(e => e.amount)).toEqual([1]);
    expect(eventsOf(events, 'forced-sale').map(e => [e.commodity, e.amount])).toEqual([['clothing', 1]]);
    expect(nationOf(state, N1).creditAccount?.saleReceipts).toEqual([1800]);
    expect(stockOf(state, N1, 'furniture')).toBe(1);
    expect(nationOf(state, N1).merchantMarine.tradeHistory?.at(-1)?.used).toBe(2);
  });
});
