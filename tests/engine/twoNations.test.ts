import { describe, it, expect } from 'vitest';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { applyOrder } from '@/engine/orders/apply';
import { Order } from '@/engine/orders/Order';
import { validateOrder } from '@/engine/orders/validate';
import { scoreTable } from '@/engine/score/score';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { TWO_NATION_IDS } from '@/testing/mockNation';
import { deepFreeze, invariantViolations, N1, setWarehouse } from './fixtures';
import { newGame, play, PlayedTurn, replay } from './headless';

const tradeOrders = (orders: Order[]) => orders.filter(o => o.kind === 'sellCommodity' || o.kind === 'buyCommodity');

describe('FR-070 the scripted player trades', () => {
  it('FR-070 FR-105 on turn 1 each nation bids for the coal, iron ore and timber it lacks, within its holds (5 and 3)', () => {
    const state = newGame(11);

    expect(tradeOrders(scriptedPlayer(state, 'nation-1'))).toEqual([
      { kind: 'buyCommodity', nationId: 'nation-1', commodity: 'coal', amount: 2 },
      { kind: 'buyCommodity', nationId: 'nation-1', commodity: 'ironOre', amount: 2 },
    ]);
    // nation-2 has 30 coal: it needs iron ore and timber, and has holds for 3 units.
    expect(tradeOrders(scriptedPlayer(state, 'nation-2'))).toEqual([
      { kind: 'buyCommodity', nationId: 'nation-2', commodity: 'ironOre', amount: 2 },
      { kind: 'buyCommodity', nationId: 'nation-2', commodity: 'timber', amount: 1 },
    ]);
  });

  it('FR-070 surplus goes on sale with up to half the holds first, then the bids; canned food is never offered', () => {
    const state = setWarehouse(newGame(11), N1, { furniture: 3, cannedFood: 10 });

    expect(tradeOrders(scriptedPlayer(state, N1))).toEqual([
      { kind: 'sellCommodity', nationId: N1, commodity: 'furniture', amount: 2 },
      { kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 2 },
      { kind: 'buyCommodity', nationId: N1, commodity: 'ironOre', amount: 1 },
    ]);
  });
});

// The 40-turn game is played once and shared by the FR-071 rows.
let forty: PlayedTurn[] | undefined;
const fortyTurns = (): PlayedTurn[] => (forty ??= play(newGame(11), 40));

describe('FR-071 a 40-turn two-nation game on the world market', () => {
  it('FR-071 both nations sell and buy; no order is refused and every invariant holds after every turn', () => {
    const played = fortyTurns();

    played.forEach((turn, i) => {
      expect({ turn: i + 1, violations: invariantViolations(turn.state) }).toEqual({ turn: i + 1, violations: [] });
      expect({ turn: i + 1, refused: turn.events.filter(e => e.type === 'order-rejected') }).toEqual({ turn: i + 1, refused: [] });
    });
    const events = played.flatMap(t => t.events);
    for (const nationId of TWO_NATION_IDS) {
      const sold = events.filter(e => e.type === 'goods-sold' && e.nationId === nationId).length;
      const bought = events.filter(e => e.type === 'goods-bought' && e.nationId === nationId).length;
      expect({ nationId, sold: sold > 0, bought: bought > 0 }).toEqual({ nationId, sold: true, bought: true });
    }
    expect(events.some(e => e.type === 'goods-sold' && e.commodity === 'cannedFood')).toBe(false);
  });

  it('FR-068 FR-071 the game is over after turn 40, Winter 1824, with a score for each nation', () => {
    const played = fortyTurns();
    const final = played.at(-1)!.state;

    played.slice(0, 39).forEach((turn, i) => expect({ turn: i + 1, over: turn.state.gameOver }).toEqual({ turn: i + 1, over: undefined }));
    expect([final.turn, final.year]).toEqual([41, 1825]);
    expect(final.gameOver).toEqual({ turn: 40, year: 1824, scores: scoreTable(final) });
    expect(final.gameOver!.scores.map(s => s.nationId).sort()).toEqual([...TWO_NATION_IDS]);
    for (const score of final.gameOver!.scores) expect(score.total).toBeGreaterThan(0);
    expect(played.at(-1)!.events.at(-1)).toEqual({ type: 'game-over', turn: 40, year: 1824, scores: final.gameOver!.scores });
  });

  it('FR-069 FR-071 a 41st resolve changes nothing', () => {
    const final = fortyTurns().at(-1)!.state;
    const orders = Object.fromEntries(TWO_NATION_IDS.map(id => [id, scriptedPlayer(final, id)]));

    expect(orders).toEqual({ 'nation-1': [], 'nation-2': [] });
    expect(resolveTurn(final, orders, final.seed).state).toBe(final);
  });

  it('FR-014 FR-071 replaying the recorded orders from the same initial state gives a deep-equal final state and the same scores', () => {
    const played = fortyTurns();
    const log = JSON.parse(JSON.stringify(played.map(t => t.orders)));

    const replayed = replay(newGame(11), log);

    expect(replayed).toEqual(played.at(-1)!.state);
    expect(replayed.gameOver!.scores).toEqual(played.at(-1)!.state.gameOver!.scores);
  });
});

describe('two nations, 20 turns, headless', () => {
  it('FR-015 two scripted nations play 20 turns through the order API, treasuries change and no invariant breaks', () => {
    const initial = newGame(11);
    const startTreasury = initial.nations.map(n => n.treasury);

    const played = play(initial, 20);

    played.forEach((turn, i) => {
      expect({ turn: i + 1, violations: invariantViolations(turn.state) }).toEqual({ turn: i + 1, violations: [] });
      for (const nationId of TWO_NATION_IDS) {
        expect({ turn: i + 1, nationId, issued: turn.orders[nationId].length > 0 }).toEqual({ turn: i + 1, nationId, issued: true });
      }
      expect(turn.events.filter(e => e.type === 'order-rejected')).toEqual([]);
    });
    const final = played.at(-1)!.state;
    expect(final.turn).toBe(initial.turn + 20);
    final.nations.forEach((n, i) => expect(n.treasury).not.toBe(startTreasury[i]));
    expect(invariantViolations(initial)).toEqual([]);
  });

  it('FR-045 both nations produce goods and feed their workers; no stock or worker count goes negative', () => {
    const played = play(newGame(11), 20);

    played.forEach((turn, i) => {
      // invariantViolations includes the FR-045 economy checks (economyViolations).
      expect({ turn: i + 1, violations: invariantViolations(turn.state) }).toEqual({ turn: i + 1, violations: [] });
      for (const nationId of TWO_NATION_IDS) {
        const meal = turn.events.find(e => e.type === 'workers-fed' && e.nationId === nationId);
        const ate = meal?.type === 'workers-fed' ? meal.fed + meal.sick : 0;
        expect({ turn: i + 1, nationId, ate: ate > 0 }).toEqual({ turn: i + 1, nationId, ate: true });
      }
    });
    const events = played.flatMap(t => t.events);
    for (const nationId of TWO_NATION_IDS) {
      const goods = events.filter(e => e.type === 'goods-produced' && e.nationId === nationId);
      expect({ nationId, produced: goods.length > 0 }).toEqual({ nationId, produced: true });
    }
  });

  it('FR-054 both nations make canned food: the scripted player ships the fruit and meat its canned-food order needs', () => {
    const events = play(newGame(11), 20).flatMap(t => t.events);

    for (const nationId of TWO_NATION_IDS) {
      const cans = events.reduce((sum, e) => (e.type === 'goods-produced' && e.nationId === nationId && e.output === 'cannedFood' ? sum + e.amount : sum), 0);
      expect({ nationId, cannedFood: cans > 0 }).toEqual({ nationId, cannedFood: true });
    }
  });

  it('FR-054 food is balanced: from turn 1 on no worker is sick or starving, and no meal is skipped', () => {
    const played = play(newGame(11), 20);

    played.forEach((turn, i) => {
      expect({ turn: i + 1, violations: invariantViolations(turn.state) }).toEqual({ turn: i + 1, violations: [] });
      for (const nationId of TWO_NATION_IDS) {
        const meal = turn.events.find(e => e.type === 'workers-fed' && e.nationId === nationId);
        const outcome = meal?.type === 'workers-fed' ? { sick: meal.sick, starved: meal.starved } : 'no meal';
        expect({ turn: i + 1, nationId, outcome }).toEqual({ turn: i + 1, nationId, outcome: { sick: 0, starved: 0 } });
        const sick = turn.state.nations.find(n => n.id === nationId)!.industry.sick;
        expect({ turn: i + 1, nationId, sick }).toEqual({ turn: i + 1, nationId, sick: { untrained: 0, trained: 0, expert: 0 } });
      }
    });
  });

  it('FR-015 the game also makes progress: jobs complete and resources are found for both nations', () => {
    const played = play(newGame(11), 20);
    const events = played.flatMap(t => t.events);

    for (const nationId of TWO_NATION_IDS) {
      expect(events.some(e => e.type === 'resource-discovered' && e.nationId === nationId)).toBe(true);
      expect(events.some(e => e.type === 'development-completed' && e.nationId === nationId)).toBe(true);
      expect(events.some(e => e.type === 'construction-completed' && e.nationId === nationId)).toBe(true);
    }
  });
});

describe('scripted player', () => {
  it('FR-016 is a pure (state, nationId) => Order[] whose orders all validate in sequence', () => {
    const state = deepFreeze(newGame(3));
    const snapshot = structuredClone(state);

    for (const nationId of TWO_NATION_IDS) {
      const orders = scriptedPlayer(state, nationId);
      expect(orders.length).toBeGreaterThan(0);
      orders.reduce((s, order) => {
        expect(order.nationId).toBe(nationId);
        expect(validateOrder(s, order)).toEqual({ ok: true });
        return applyOrder(s, order);
      }, state);
    }

    expect(state).toEqual(snapshot);
  });
});
