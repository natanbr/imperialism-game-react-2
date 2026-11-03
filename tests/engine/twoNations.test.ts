import { describe, it, expect } from 'vitest';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { applyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import { TWO_NATION_IDS } from '@/testing/mockNation';
import { deepFreeze, invariantViolations } from './fixtures';
import { newGame, play } from './headless';

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
