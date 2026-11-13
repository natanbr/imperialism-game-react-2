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
import { turnLimitOf } from '@/engine/turn/gameOver';
import type { GameState } from '@/types/GameState';
import { GoodsType } from '@/types/Resource';
import { emptyWarehouse, N1, N2, setPair, setTreasury, setWarehouse } from './fixtures';

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
    const held = setPair(continent(), N2, 'minor-1', { consulates: [N2] });
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

  it('FR-245 no raw bid in the last 2 turns (bought raw would come too late to be made into steel and lumber)', () => {
    const s = lacking();
    for (const turn of [turnLimitOf(s) - 1, turnLimitOf(s)]) expect(bids(scriptedPlayer({ ...s, turn }, N2))).toEqual([]);
    expect(bids(scriptedPlayer({ ...s, turn: turnLimitOf(s) - 2 }, N2)).length).toBeGreaterThan(0);
  });

  it('FR-245 no bid where no partner sells: without a consulate (and no money for one) it bids for nothing', () => {
    expect(bids(scriptedPlayer(setTreasury(emptyWarehouse(continent(), N2, { grain: 20, fruit: 10, livestock: 10 }), N2, 2999), N2))).toEqual([]);
  });

  it('FR-245 over 10 turns on the partners continent it buys from minors and never bids for lumber or steel; on two-islands it bids for lumber and steel', () => {
    const partners = play(continent(), 10);
    const bought = partners.flatMap(t => t.events).filter(e => e.type === 'goods-bought' && e.nationId === N2 && MINORS.includes(e.counterpartyId ?? ''));
    expect(bought.length).toBeGreaterThan(0);
    for (const [commodity] of partners.flatMap(t => bids(t.orders[N2]))) expect(RAW).toContain(commodity);
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
    const world = play(newGame({ seed: 1, world: 'continent', market: 'world' }), 6);
    const v1 = play(newGame({ seed: 1, world: 'two-islands' }), 6);
    expect(world.map(t => t.orders)).toEqual(v1.map(t => t.orders));
  });
});
