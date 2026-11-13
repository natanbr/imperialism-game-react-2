// FR-193: the scripted player trades with partners on the continent ("partners" market): (a) a consulate a
// turn with the first minor in id order it has none with, while $2,500 stays; (b) the FR-128 bids, each capped
// at what the minors it may trade with offer (they offer resources only, so the lumber and steel bids find
// none); (c) the FR-128 offers of clothing, furniture and hardware only, each capped at those minors' demand.
// In "world" its orders are unchanged.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { pairKey } from '@/engine/diplomacy/relations';
import type { GameState } from '@/types/GameState';
import { GoodsType } from '@/types/Resource';
import { N1, N2, setPair, setTreasury, setWarehouse } from './fixtures';

const MINORS = ['minor-1', 'minor-2', 'minor-3', 'minor-4'];
const GOODS: string[] = [GoodsType.Clothing, GoodsType.Furniture, GoodsType.Hardware];
const continent = (): GameState => newGame({ seed: 1, world: 'continent' });

const consulateTargets = (orders: Order[]) =>
  orders.flatMap(o => (o.kind === 'proposeOverture' && o.overture === 'consulate' ? [o.targetId] : []));
const sales = (orders: Order[]) => orders.flatMap(o => (o.kind === 'sellCommodity' ? [[o.commodity, o.amount] as [string, number]] : []));
const bids = (orders: Order[]) => orders.filter(o => o.kind === 'buyCommodity');
const holds = (s: GameState, nationId: string, minorId: string) => s.diplomacy[pairKey(nationId, minorId)].consulates.includes(nationId);

/** Turns of the scripted player for the nations given (the others idle), with each turn's orders and start state. */
function play(start: GameState, turns: number, nations: string[] = [N2]) {
  const log: { state: GameState; orders: Record<string, Order[]>; refused: number }[] = [];
  let s = start;
  for (let i = 0; i < turns; i++) {
    const orders = Object.fromEntries(nations.map(id => [id, scriptedPlayer(s, id)]));
    const result = resolveTurn(s, orders, s.seed);
    log.push({ state: s, orders, refused: result.events.filter(e => e.type === 'order-rejected').length });
    s = result.state;
  }
  return log;
}

describe('FR-193 (a) a consulate a turn', () => {
  it('FR-193 on turn 1 each scripted nation orders one consulate, with Arvelia (the first minor in id order)', () => {
    for (const nationId of [N1, N2]) expect(consulateTargets(scriptedPlayer(continent(), nationId))).toEqual(['minor-1']);
  });

  it('FR-193 turn by turn: at most one, with the first minor it has none with, while $2,500 stays after it', () => {
    const turns = play(continent(), 8);
    const targets = turns.map(t => consulateTargets(t.orders[N2]));
    for (const [i, t] of turns.entries()) {
      expect(targets[i].length).toBeLessThanOrEqual(1);
      if (targets[i].length === 1) expect(targets[i][0]).toBe(MINORS.find(m => !holds(t.state, N2, m)));
    }
    // The first two turns open Arvelia and Sundmark; by the end Valdoria holds a consulate in each minor it ordered
    expect(targets.slice(0, 2)).toEqual([['minor-1'], ['minor-2']]);
    const last = play(continent(), 9).at(-1)!.state;
    expect(targets.flat().every(m => holds(last, N2, m))).toBe(true);
  });

  it('FR-193 a minor where it holds a consulate, or is at war, is skipped', () => {
    const held = setPair(continent(), N2, 'minor-1', { consulates: [N2] });
    expect(consulateTargets(scriptedPlayer(held, N2))).toEqual(['minor-2']);
    const war = setPair(continent(), N2, 'minor-1', { war: { aggressors: [N2], since: 1 } });
    expect(consulateTargets(scriptedPlayer(war, N2))).toEqual(['minor-2']);
  });

  it('FR-193 none when the treasury after it would be below $2,500, and none once every minor has one', () => {
    expect(consulateTargets(scriptedPlayer(setTreasury(continent(), N2, 2999), N2))).toEqual([]);
    const all = MINORS.reduce((s, m) => setPair(s, N2, m, { consulates: [N2] }), continent());
    expect(consulateTargets(scriptedPlayer(all, N2))).toEqual([]);
  });
});

describe('FR-193 (b) bids capped at what the minors offer', () => {
  it('FR-193 no minor offers lumber or steel, so on the partners continent the FR-128 bids find nothing to buy; on two-islands it bids', () => {
    const partners = play(continent(), 10);
    expect(partners.flatMap(t => bids(t.orders[N2]))).toEqual([]);
    const v1 = play(newGame({ seed: 1, world: 'two-islands' }), 10);
    expect(v1.flatMap(t => bids(t.orders[N2])).length).toBeGreaterThan(0);
  });
});

describe('FR-193 (c) offers: goods only, capped at the minors\' demand', () => {
  it('FR-193 with one consulate (Arvelia) and 9 clothing and 9 furniture it offers 2 of each', () => {
    let s = setPair(continent(), N2, 'minor-1', { consulates: [N2] });
    s = setWarehouse(setTreasury(s, N2, 2999), N2, { clothing: 9, furniture: 9 });

    const orders = scriptedPlayer(s, N2);

    expect(consulateTargets(orders)).toEqual([]);
    expect(sales(orders)).toEqual([[GoodsType.Clothing, 2], [GoodsType.Furniture, 2]]);
  });

  it('FR-193 a consulate ordered this turn counts: on turn 1 with 9 clothing it offers 2 (Arvelia\'s demand)', () => {
    const orders = scriptedPlayer(setWarehouse(continent(), N2, { clothing: 9 }), N2);
    expect(consulateTargets(orders)).toEqual(['minor-1']);
    expect(sales(orders)).toEqual([[GoodsType.Clothing, 2]]);
  });

  it('FR-193 with no minor to trade with it offers nothing', () => {
    const orders = scriptedPlayer(setWarehouse(setTreasury(continent(), N2, 2999), N2, { clothing: 9, lumber: 40 }), N2);
    expect(sales(orders)).toEqual([]);
  });

  it('FR-193 over 12 turns every offer is clothing, furniture or hardware, at most 2 per minor it may trade with', () => {
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

describe('FR-193 valid, deterministic, and unchanged in "world"', () => {
  it('FR-193 FR-016 ten turns of both scripted nations on the partners continent: no order refused, the same orders for the same seed', () => {
    const a = play(continent(), 10, [N1, N2]);
    const b = play(continent(), 10, [N1, N2]);
    expect(a.map(t => t.refused)).toEqual(a.map(() => 0));
    expect(b.map(t => t.orders)).toEqual(a.map(t => t.orders));
  });

  it('FR-193 in "world" its orders are unchanged: the continent with the world market plays as two-islands, turn by turn', () => {
    const world = play(newGame({ seed: 1, world: 'continent', market: 'world' }), 6);
    const v1 = play(newGame({ seed: 1, world: 'two-islands' }), 6);
    expect(world.map(t => t.orders)).toEqual(v1.map(t => t.orders));
  });
});
