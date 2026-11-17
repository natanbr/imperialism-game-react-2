// FR-245 (replaces FR-193): the scripted player trades with partners on the continent ("partners" market): (a) a
// consulate, at most one a turn, only when the minors that favour it do not cover what it wants to trade, with the
// first minor in id order that offers or wants what it lacks, while $2,500 stays; (b) bids for the raw inputs its
// mills lack (timber, coal, iron ore, cotton), each capped at what the minors it may trade with offer; (c) the FR-128
// offers of clothing, furniture and hardware only, each capped at those minors' demand. In "world" its orders are
// unchanged.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { pairKey } from '@/engine/diplomacy/relations';
import { minorOffers } from '@/engine/market/partners';
import { marketOf, tradeOrdersOf } from '@/engine/market/market';
import { tryApplyOrder } from '@/engine/orders/apply';
import { greatPowerTradeCaps } from '@/engine/ai/scriptedGreatPowerTrade';
import { cashReserve } from '@/engine/ai/economy';
import { turnLimitOf } from '@/engine/turn/gameOver';
import type { GameState } from '@/types/GameState';
import { GoodsType } from '@/types/Resource';
import { emptyWarehouse, N1, N2, setPair, setTreasury, setWarehouse, treasury } from './fixtures';
import { withoutStartForces } from './armyFixtures';

const MINORS = ['minor-1', 'minor-2', 'minor-3', 'minor-4'];
const GOODS: string[] = [GoodsType.Clothing, GoodsType.Furniture, GoodsType.Hardware];
const RAW = ['timber', 'coal', 'ironOre', 'cotton'];
const continent = (): GameState => newGame({ seed: 1, world: 'continent' });

const consulateTargets = (orders: Order[]) =>
  orders.flatMap(o => (o.kind === 'proposeOverture' && o.overture === 'consulate' ? [o.targetId] : []));
const sales = (orders: Order[]) => orders.flatMap(o => (o.kind === 'sellCommodity' ? [[o.commodity, o.amount] as [string, number]] : []));
const bids = (orders: Order[]) => orders.flatMap(o => (o.kind === 'buyCommodity' ? [[o.commodity, o.amount] as [string, number]] : []));
/** The last bid of each commodity: each order sets this turn's amount. */
const finalBids = (orders: Order[]) => Object.fromEntries(bids(orders));
const holds = (s: GameState, nationId: string, minorId: string) => s.diplomacy[pairKey(nationId, minorId)].consulates.includes(nationId);
/** Test setup: Valdoria has goods to sell and raw stock its mills cannot use up, so it wants to sell 2 clothing and 2 furniture. */
const sellsGoodsOnly = (s: GameState) =>
  setWarehouse(s, N2, { clothing: 2, furniture: 2, timber: 99, coal: 99, ironOre: 99, cotton: 99, wool: 99 });

/** Turns of the scripted player for the nations given (the others idle), with each turn's orders, events and start state. */
function play(start: GameState, turns: number, nations: string[] = [N2]) {
  const log: { state: GameState; orders: Record<string, Order[]>; refused: number; events: ReturnType<typeof resolveTurn>['events'] }[] = [];
  let s = start;
  for (let i = 0; i < turns; i++) {
    const orders = Object.fromEntries(nations.map(id => [id, scriptedPlayer(s, id)]));
    const result = resolveTurn(s, orders, s.seed);
    log.push({ state: s, orders, refused: result.events.filter(e => e.type === 'order-rejected').length, events: result.events });
    s = result.state;
  }
  return log;
}

describe('FR-245 (a) a consulate only where it will trade', () => {
  it('FR-245 on turn 1 each scripted nation orders one consulate, with Arvelia (the first minor, and it offers and wants what they trade)', () => {
    for (const nationId of [N1, N2]) expect(consulateTargets(scriptedPlayer(continent(), nationId))).toEqual(['minor-1']);
  });

  it('FR-245 turn by turn: at most one a turn, each with a minor it held none with, and each then held', () => {
    const turns = play(continent(), 8);
    const last = play(continent(), 9).at(-1)!.state;
    for (const t of turns) {
      const targets = consulateTargets(t.orders[N2]);
      expect(targets.length).toBeLessThanOrEqual(1);
      for (const m of targets) {
        expect(holds(t.state, N2, m)).toBe(false);
        expect(holds(last, N2, m)).toBe(true);
      }
    }
  });

  it('FR-245 none when the minors that favour it cover its holds: Arvelia, favouring Valdoria, takes its 2 clothing and 2 furniture', () => {
    const s = setPair(sellsGoodsOnly(setPair(continent(), N2, 'minor-1', { consulates: [N2] })), N2, 'minor-1', { points: 40 });
    const orders = scriptedPlayer(s, N2);
    expect(consulateTargets(orders)).toEqual([]);
    expect(sales(orders)).toEqual([[GoodsType.Clothing, 2], [GoodsType.Furniture, 2]]);
  });

  it('FR-245 when its partner favours the rival, the next minor that wants what it sells: Sundmark', () => {
    const s = setPair(sellsGoodsOnly(setPair(continent(), N2, 'minor-1', { consulates: [N2] })), N1, 'minor-1', { points: 40 });
    expect(consulateTargets(scriptedPlayer(s, N2))).toEqual(['minor-2']);
  });

  it('FR-245 none when it has nothing to trade (no goods to sell, every mill\'s raw in stock)', () => {
    const s = setWarehouse(continent(), N2, { timber: 99, coal: 99, ironOre: 99, cotton: 99, wool: 99 });
    expect(consulateTargets(scriptedPlayer(s, N2))).toEqual([]);
  });

  it('FR-245 a minor where it holds a consulate, or is at war, is skipped', () => {
    // Arvelia favours Testland by 1 point, so it does not cover Valdoria's holds (M12 FR-401: at equal points seed 1's
    // Arvelia favours Valdoria and would cover them; until M12 turn 1's intentOrder put Testland first)
    const held = setPair(setPair(continent(), N2, 'minor-1', { consulates: [N2] }), N1, 'minor-1', { points: 31 });
    expect(consulateTargets(scriptedPlayer(held, N2))).toEqual(['minor-2']);
    const war = setPair(continent(), N2, 'minor-1', { war: { aggressors: [N2], since: 1 } });
    expect(consulateTargets(scriptedPlayer(war, N2))).toEqual(['minor-2']);
  });

  it('FR-245 while $2,500 stays after it: ordered at $3,000, none at $2,999; none once every minor has one', () => {
    expect(consulateTargets(scriptedPlayer(setTreasury(continent(), N2, 3000), N2))).toEqual(['minor-1']);
    expect(consulateTargets(scriptedPlayer(setTreasury(continent(), N2, 2999), N2))).toEqual([]);
    const all = MINORS.reduce((s, m) => setPair(s, N2, m, { consulates: [N2] }), continent());
    expect(consulateTargets(scriptedPlayer(all, N2))).toEqual([]);
  });

  it('FR-245 FR-497 (M13 T-15) stranded: with no minor left to trade with after it lost its partner (at war with it, or another\'s colony) it opens one below $3,000; before any loss, none', () => {
    // Measured before the rule: in the both-scripted games a Valdoria at war with Arvelia, its only partner, waited for
    // $3,000 that no sale could bring (FR-247)
    const atWar = setTreasury(setPair(sellsGoodsOnly(continent()), N2, 'minor-1', { consulates: [N2], war: { aggressors: [N2], since: 1 } }), N2, 2000);
    expect(consulateTargets(scriptedPlayer(atWar, N2))).toEqual(['minor-2']);
    const taken = (s: GameState): GameState => ({ ...s, minorNations: s.minorNations.map(m => (m.id === 'minor-1' ? { ...m, colonyOf: N1 } : m)) });
    expect(consulateTargets(scriptedPlayer(taken(setTreasury(sellsGoodsOnly(continent()), N2, 2000)), N2))).toEqual(['minor-2']);
    // no partner yet, none lost: FR-245's floor as before
    expect(consulateTargets(scriptedPlayer(setTreasury(sellsGoodsOnly(continent()), N2, 2000), N2))).toEqual([]);
  });
});

describe('FR-245 (b) bids for the raw its mills lack, capped at what the minors offer', () => {
  /** Valdoria with a consulate in Arvelia and an empty warehouse: its mills lack every raw input. */
  const lacking = () => emptyWarehouse(setPair(continent(), N2, 'minor-1', { consulates: [N2] }), N2, { grain: 20, fruit: 10, livestock: 10, cannedFood: 10 });

  it('FR-245 with an empty warehouse it bids for timber, coal, iron ore and cotton, each at most Arvelia\'s offer, 4 holds in all', () => {
    const orders = scriptedPlayer(lacking(), N2);
    const bid = finalBids(orders);
    const offer = minorOffers(lacking(), 'minor-1') as Record<string, number>;
    expect(Object.keys(bid).length).toBeGreaterThan(0);
    for (const [commodity, amount] of Object.entries(bid)) {
      expect(RAW).toContain(commodity);
      expect(amount).toBeLessThanOrEqual(offer[commodity] ?? 0);
    }
    expect(Object.values(bid).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(4);
  });

  // Re-recorded by M13 FR-493 (a): both pins read "no bid at all" ([]); the raw part holds unchanged, but the bids now also
  // hold the lumber and steel bid toward Valdoria (FR-128's pairs, a turn ahead, as in "world"), so the raw bids are
  // picked out and the lumber and steel ones pinned on their own.
  const rawBids = (orders: Order[]) => bids(orders).filter(([c]) => RAW.includes(c));
  const pairBids = (orders: Order[]) => bids(orders).filter(([c]) => c === 'lumber' || c === 'steel');

  it('FR-245 FR-493 no raw bid in the last 2 turns (bought raw would come too late to be made into steel and lumber); lumber and steel up to the turn before the last', () => {
    const s = lacking();
    for (const turn of [turnLimitOf(s) - 1, turnLimitOf(s)]) expect(rawBids(scriptedPlayer({ ...s, turn }, N2))).toEqual([]);
    expect(rawBids(scriptedPlayer({ ...s, turn: turnLimitOf(s) - 2 }, N2)).length).toBeGreaterThan(0);
    expect(pairBids(scriptedPlayer({ ...s, turn: turnLimitOf(s) }, N2))).toEqual([]);
  });

  it('FR-245 FR-493 no raw bid where no partner sells: without a consulate (and no money for one) it bids for no raw (was: for nothing); its $499 above the reserve buy 1 lumber toward Valdoria', () => {
    const orders = scriptedPlayer(setTreasury(emptyWarehouse(continent(), N2, { grain: 20, fruit: 10, livestock: 10 }), N2, 2999), N2);
    expect(rawBids(orders)).toEqual([]);
    expect(finalBids(orders)).toEqual({ lumber: 1 });
  });

  // Re-recorded by M13 FR-493 (a): was "never bids for lumber or steel" in partners (every bid in RAW); it now also bids
  // for at most 2 lumber and 2 steel a turn toward the other Great Power. The minors' raw is still bought; two-islands as before.
  it('FR-245 FR-493 over 10 turns on the partners continent it buys from minors; its other bids are lumber and steel, at most 2 each (was: never lumber or steel); on two-islands it bids for lumber and steel', () => {
    const partners = play(continent(), 10);
    const bought = partners.flatMap(t => t.events).filter(e => e.type === 'goods-bought' && e.nationId === N2 && MINORS.includes(e.counterpartyId ?? ''));
    expect(bought.length).toBeGreaterThan(0);
    const finals = partners.flatMap(t => Object.entries(finalBids(t.orders[N2])));
    for (const [commodity, amount] of finals) {
      expect([...RAW, 'lumber', 'steel']).toContain(commodity);
      if (commodity === 'lumber' || commodity === 'steel') expect(amount).toBeLessThanOrEqual(2);
    }
    // FR-493 (a) happens in a real game, not only in a crafted state (spec risk: the Board line must appear, QA check 4)
    expect(finals.filter(([c]) => c === 'lumber' || c === 'steel').length).toBeGreaterThan(0);
    const v1 = play(newGame({ seed: 1, world: 'two-islands' }), 10);
    expect([...new Set(v1.flatMap(t => bids(t.orders[N2])).map(([c]) => c))].sort()).toEqual(['lumber', 'steel']);
  });
});

describe('FR-245 (c) offers: goods only, capped at the minors\' demand', () => {
  it('FR-245 with one consulate (Arvelia) and 9 clothing and 9 furniture it offers 2 of each', () => {
    let s = setPair(continent(), N2, 'minor-1', { consulates: [N2] });
    s = setWarehouse(setTreasury(s, N2, 2999), N2, { clothing: 9, furniture: 9 });

    const orders = scriptedPlayer(s, N2);

    expect(consulateTargets(orders)).toEqual([]);
    expect(sales(orders)).toEqual([[GoodsType.Clothing, 2], [GoodsType.Furniture, 2]]);
  });

  it('FR-245 a consulate ordered this turn counts: on turn 1 with 9 clothing it offers 2 (Arvelia\'s demand)', () => {
    const orders = scriptedPlayer(setWarehouse(continent(), N2, { clothing: 9 }), N2);
    expect(consulateTargets(orders)).toEqual(['minor-1']);
    expect(sales(orders)).toEqual([[GoodsType.Clothing, 2]]);
  });

  it('FR-245 with no minor to trade with it offers nothing', () => {
    const orders = scriptedPlayer(setWarehouse(setTreasury(continent(), N2, 2999), N2, { clothing: 9, lumber: 40 }), N2);
    expect(sales(orders)).toEqual([]);
  });

  it('FR-245 over 12 turns every offer is clothing, furniture or hardware, at most 2 per minor it may trade with', () => {
    const turns = play(continent(), 12);
    let offered = 0;
    for (const t of turns) {
      const partners = MINORS.filter(m => holds(t.state, N2, m) || consulateTargets(t.orders[N2]).includes(m)).length;
      for (const [commodity, amount] of sales(t.orders[N2])) {
        expect(GOODS).toContain(commodity);
        expect(amount).toBeLessThanOrEqual(2 * partners);
        offered += amount;
      }
    }
    expect(offered).toBeGreaterThan(0);
  });
});

describe('FR-245 valid, deterministic, and unchanged in "world"', () => {
  it('FR-245 FR-016 ten turns of both scripted nations on the partners continent: no order refused, the same orders for the same seed', () => {
    const a = play(continent(), 10, [N1, N2]);
    const b = play(continent(), 10, [N1, N2]);
    expect(a.map(t => t.refused)).toEqual(a.map(() => 0));
    expect(b.map(t => t.orders)).toEqual(a.map(t => t.orders));
  });

  it('FR-245 in "world" its orders are unchanged: the continent with the world market plays as two-islands, turn by turn', () => {
    // FR-215: without the FR-203 start forces, whose 4 horses it sells and whose upkeep it pays (tests/engine/continentScore.test.ts)
    const world = play(withoutStartForces(newGame({ seed: 1, world: 'continent', market: 'world' })), 6);
    const v1 = play(newGame({ seed: 1, world: 'two-islands' }), 6);
    expect(world.map(t => t.orders)).toEqual(v1.map(t => t.orders));
  });
});

// M13 lane C, FR-493 (card Q118 (a); rules 10 section 2 "occasionally steel to the human"): in "partners" the scripted Great
// Power (a) bids for up to 2 lumber and 2 steel a turn toward the other Great Power, the pairs FR-128 would buy in "world",
// while the cash after the bid stays at or above `cashReserve`; (b) caps each offer of clothing, furniture and hardware at
// the minors' demand plus the other Great Power's bid of last turn (FR-491). FR-497: it reads its own state, the diplomacy
// record and last turn's public orders only, never another nation's orders of this turn.
const lastTurn = (s: GameState, lastOrders: Record<string, { sell: Record<string, number>; buy: Record<string, number> }>): GameState =>
  ({ ...s, market: { ...marketOf(s), lastOrders } }) as GameState;
/** Valdoria has nothing to sell and every raw input in stock: no consulate, no offer, no raw bid, so its holds are free. */
const holdsFree = (s: GameState = continent()) => setWarehouse(s, N2, { timber: 99, coal: 99, ironOre: 99, cotton: 99, wool: 99 });
const atWar = (s: GameState) => setPair(s, N1, N2, { war: { aggressors: [N1], since: 1 } });
const withPrices = (s: GameState, prices: Record<string, number>): GameState => ({ ...s, market: { ...marketOf(s), prices: { ...marketOf(s).prices, ...prices } } });

describe('FR-493 (a) the computer bids for lumber and steel toward the other Great Power', () => {
  it('FR-493 greatPowerTradeCaps: the FR-128 pairs, at most 2 of each, from next turn\'s stock: the short side first, then whole pairs', () => {
    const s = holdsFree();
    expect(greatPowerTradeCaps(s, N2, { lumber: 1, steel: 1 }).buy).toEqual({ lumber: 2, steel: 2 });
    expect(greatPowerTradeCaps(s, N2, { lumber: 3, steel: 1 }).buy).toEqual({ steel: 2 });
    expect(greatPowerTradeCaps(s, N2, { lumber: 0, steel: 1 }).buy).toEqual({ lumber: 2, steel: 1 });
    expect(greatPowerTradeCaps(s, N2, { lumber: 9, steel: 0 }).buy).toEqual({ steel: 2 });
    expect(greatPowerTradeCaps(s, N2, {}).buy).toEqual({ lumber: 2, steel: 2 });
  });

  it('FR-493 none at war with the other Great Power or under a boycott, on the last turn, while a pair costs PAIR_VALUE ($1,000) or more, or in "world"', () => {
    const next = { lumber: 1, steel: 1 };
    expect(greatPowerTradeCaps(atWar(holdsFree()), N2, next).buy).toEqual({});
    expect(greatPowerTradeCaps(setPair(holdsFree(), N1, N2, { boycotts: [N1] }), N2, next).buy).toEqual({});
    expect(greatPowerTradeCaps({ ...holdsFree(), turn: turnLimitOf(continent()) }, N2, next).buy).toEqual({});
    expect(greatPowerTradeCaps({ ...holdsFree(), turn: turnLimitOf(continent()) - 1 }, N2, next).buy).toEqual({ lumber: 2, steel: 2 });
    expect(greatPowerTradeCaps(withPrices(holdsFree(), { lumber: 500, steel: 500 }), N2, next).buy).toEqual({});
    expect(greatPowerTradeCaps(withPrices(holdsFree(), { lumber: 500, steel: 499 }), N2, next).buy).toEqual({ lumber: 2, steel: 2 });
    // Re-recorded by M13 T-15 (FR-493 (a)): was `{ buy: {}, sell: {} }`; the caps now also carry `offeredLastTurn`
    expect(greatPowerTradeCaps(newGame({ seed: 1, world: 'continent', market: 'world' }), N2, next)).toEqual({ buy: {}, sell: {}, offeredLastTurn: [] });
  });

  // M13 T-15: measured in the `trader` sims, the bids above came after the mills' inputs and found the 4 holds taken on most
  // turns, so Valdoria seldom bid two turns running and a person answering last turn's bid found none (0 of 24 games with 5
  // units traded, needed 18). A bid the rival answers, or may answer, now goes first.
  describe('FR-493 (a) the bid toward the other Great Power goes before the mills\' inputs when that Great Power answers it', () => {
    /** Valdoria with consulates in every minor, $9,000 and 2 clothing: the offer takes 2 holds and the raw bids the other 2. */
    const busy = (): GameState => {
      let s = continent();
      for (const m of MINORS) s = setPair(s, N2, m, { consulates: [N2] });
      return setWarehouse(setTreasury(s, N2, 9000), N2, { clothing: 2 });
    };
    const bidOrder = (s: GameState) => bids(scriptedPlayer(s, N2)).map(([c]) => c).filter((c, i, all) => all.indexOf(c) === i);

    it('FR-493 offeredLastTurn: what Testland offered last turn, and what Valdoria bid for last turn while Testland traded and did not bid for it', () => {
      const next = { lumber: 1, steel: 1 };
      expect(greatPowerTradeCaps(continent(), N2, next).offeredLastTurn).toEqual([]);
      expect(greatPowerTradeCaps(lastTurn(continent(), { [N1]: { sell: { steel: 1 }, buy: {} } }), N2, next).offeredLastTurn).toEqual(['steel']);
      const ownBid = { [N2]: { sell: {}, buy: { lumber: 2 } } };
      expect(greatPowerTradeCaps(lastTurn(continent(), { ...ownBid, [N1]: { sell: {}, buy: { clothing: 1 } } }), N2, next).offeredLastTurn).toEqual(['lumber']);
      // an idle Testland (no public order last turn), or one that bid for lumber itself, does not keep the bid first
      expect(greatPowerTradeCaps(lastTurn(continent(), ownBid), N2, next).offeredLastTurn).toEqual([]);
      expect(greatPowerTradeCaps(lastTurn(continent(), { ...ownBid, [N1]: { sell: {}, buy: { lumber: 1 } } }), N2, next).offeredLastTurn).toEqual([]);
      expect(greatPowerTradeCaps(atWar(lastTurn(continent(), { [N1]: { sell: { steel: 1 }, buy: {} } })), N2, next).offeredLastTurn).toEqual([]);
    });

    it('FR-493 with 2 holds left the raw input takes them (timber), unless Testland offered steel last turn or answers its lumber bid: then that bid comes first', () => {
      expect(bidOrder(busy())).toEqual(['timber']);
      expect(bidOrder(lastTurn(busy(), { [N1]: { sell: { steel: 1 }, buy: {} } }))[0]).toBe('steel');
      expect(bidOrder(lastTurn(busy(), { [N2]: { sell: {}, buy: { lumber: 2 } }, [N1]: { sell: {}, buy: { clothing: 1 } } }))).toEqual(['lumber']);
      expect(bidOrder(lastTurn(busy(), { [N2]: { sell: {}, buy: { lumber: 2 } } }))).toEqual(['timber']);
    });
  });

  it('FR-493 the scripted player bids for them once its holds are free of offers and raw bids, each bid at most 2, and the reserve kept', () => {
    const s = holdsFree();
    const orders = scriptedPlayer(s, N2);
    const bid = finalBids(orders);
    expect(Object.keys(bid).every(c => c === 'lumber' || c === 'steel')).toBe(true);
    expect((bid.lumber ?? 0) + (bid.steel ?? 0)).toBeGreaterThan(0);
    for (const n of Object.values(bid)) expect(n).toBeLessThanOrEqual(2);
    // The bids pass the order-time check (FR-492) and leave the cash reserve
    const after = orders.reduce((state, o) => tryApplyOrder(state, o).state, s);
    expect(treasury(after, N2)).toBeGreaterThanOrEqual(cashReserve(s, N2));
  });

  it('FR-493 none while the cash after it would fall below cashReserve; none at war with Testland', () => {
    const tight = setTreasury(holdsFree(), N2, cashReserve(holdsFree(), N2) + 299);
    expect(finalBids(scriptedPlayer(tight, N2))).toEqual({});
    expect(finalBids(scriptedPlayer(atWar(holdsFree()), N2))).toEqual({});
  });

  it('FR-493 FR-492 End Turn: Valdoria bid for steel last turn, Testland offers 1 steel, Valdoria bids again: the steel is sold to Valdoria', () => {
    let s = lastTurn(holdsFree(setWarehouse(continent(), N2, { lumber: 20, steel: 0 })), { [N2]: { sell: {}, buy: { steel: 2 } } });
    s = tryApplyOrder(s, { kind: 'sellCommodity', nationId: N1, commodity: 'steel', amount: 1 } as Order).state;
    expect(tradeOrdersOf(s, N1).sell.steel).toBe(1);
    const computer = scriptedPlayer(s, N2);
    expect(finalBids(computer).steel).toBe(2);
    const { events } = resolveTurn(s, { [N2]: computer }, s.seed);
    expect(events.filter(e => e.type === 'order-rejected')).toEqual([]);
    expect(events.filter(e => e.type === 'goods-sold' && e.nationId === N1).map(e => e.type === 'goods-sold' && [e.commodity, e.amount, e.counterpartyId])).toEqual([['steel', 1, N2]]);
  });
});

describe('FR-493 (b) its offers of goods count the other Great Power\'s bid of last turn', () => {
  /** Valdoria with a consulate in Arvelia (demand 2 of each good), 9 clothing, and no cash for another consulate. */
  const seller = () => setWarehouse(setTreasury(setPair(continent(), N2, 'minor-1', { consulates: [N2] }), N2, 2999), N2, { clothing: 9 });

  it('FR-493 greatPowerTradeCaps.sell: the other Great Power\'s bids of last turn for clothing, furniture and hardware only', () => {
    const s = lastTurn(continent(), { [N1]: { sell: {}, buy: { clothing: 2, hardware: 1, steel: 1, coal: 2 } } });
    expect(greatPowerTradeCaps(s, N2, {}).sell).toEqual({ clothing: 2, hardware: 1 });
    expect(greatPowerTradeCaps(atWar(s), N2, {}).sell).toEqual({});
    // Its own bids of last turn are no buyer
    expect(greatPowerTradeCaps(lastTurn(continent(), { [N2]: { sell: {}, buy: { clothing: 2 } } }), N2, {}).sell).toEqual({});
  });

  it('FR-493 Testland bid 2 clothing last turn: Valdoria offers 4 (Arvelia\'s 2 and Testland\'s 2, was 2); at war with Testland 2', () => {
    expect(sales(scriptedPlayer(seller(), N2))).toEqual([[GoodsType.Clothing, 2]]);
    const bidLastTurn = lastTurn(seller(), { [N1]: { sell: {}, buy: { clothing: 2 } } });
    expect(sales(scriptedPlayer(bidLastTurn, N2)).at(-1)).toEqual([GoodsType.Clothing, 4]);
    expect(sales(scriptedPlayer(atWar(bidLastTurn), N2)).at(-1)).toEqual([GoodsType.Clothing, 2]);
  });

  it('FR-493 FR-492 (M13 review EFD-1) a war or a boycott Valdoria orders on Testland this turn already counts: no extra offer toward Testland', () => {
    const bidLastTurn = lastTurn(seller(), { [N1]: { sell: {}, buy: { clothing: 2 } } });
    const declared = tryApplyOrder(bidLastTurn, { kind: 'proposeOverture', nationId: N2, overture: 'war', targetId: N1 } as Order);
    expect(declared.result).toEqual({ ok: true });
    expect(greatPowerTradeCaps(declared.state, N2, {}).sell).toEqual({});
    const boycott = tryApplyOrder(bidLastTurn, { kind: 'setTradePolicy', nationId: N2, targetId: N1, subsidyPercent: 0, boycott: true } as Order);
    expect(boycott.result).toEqual({ ok: true });
    expect(greatPowerTradeCaps(boycott.state, N2, {})).toEqual({ buy: {}, sell: {}, offeredLastTurn: [] });
    // Testland's own boycott of Valdoria ordered this turn is Testland's order: it is not read (FR-497)
    const theirs = tryApplyOrder(bidLastTurn, { kind: 'setTradePolicy', nationId: N1, targetId: N2, subsidyPercent: 0, boycott: true } as Order);
    expect(theirs.result).toEqual({ ok: true });
    expect(greatPowerTradeCaps(theirs.state, N2, {}).sell).toEqual({ clothing: 2 });
  });

  it('FR-493 FR-497 Testland\'s bid of this turn is not read: with no bid last turn Valdoria still offers 2', () => {
    const s = tryApplyOrder(seller(), { kind: 'buyCommodity', nationId: N1, commodity: 'clothing', amount: 2 } as Order).state;
    expect(tradeOrdersOf(s, N1).buy.clothing).toBe(2);
    expect(sales(scriptedPlayer(s, N2))).toEqual([[GoodsType.Clothing, 2]]);
  });
});
