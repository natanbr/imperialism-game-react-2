import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { tradeCapacityOf } from '@/engine/market/market';
import { readSave } from '@/store/persistence';
import { deepFreeze, N1, nationOf, setWarehouse } from './fixtures';

const start = () => setWarehouse(newGame({ seed: 1 }), N1, { lumber: 14, fabric: 6 });
const ship = (type: 'trader' | 'indiaman', count: number) =>
  ({ kind: 'setShipyard', nationId: N1, ship: type, count }) as const;

describe('FR-514 the Shipyard', () => {
  it('starts with one Indiaman and four holds', () => {
    for (const n of start().nations) expect(n.merchantMarine).toMatchObject({ ships: { indiaman: 1 }, holds: 4 });
  });

  it('charges the change in count, refunds decreases, and adds both hulls at End Turn only once', () => {
    const base = deepFreeze(start());
    const two = tryApplyOrder(base, ship('trader', 2));
    expect(two.result).toEqual({ ok: true });
    expect(nationOf(two.state, N1).warehouse).toMatchObject({ lumber: 6, fabric: 2 });
    const one = tryApplyOrder(two.state, ship('trader', 1)).state;
    const queued = nationOf(tryApplyOrder(one, ship('indiaman', 1)).state, N1);
    expect(queued.warehouse).toMatchObject({ lumber: 3, fabric: 1 });
    expect(queued.industry.workers).toEqual(nationOf(base, N1).industry.workers);
    expect(queued.treasury).toBe(nationOf(base, N1).treasury);
    expect(queued.merchantMarine).toMatchObject({ holds: 4, pendingShips: { trader: 1, indiaman: 1 } });
    const { state } = resolveTurn(one, { [N1]: [ship('indiaman', 1)] }, 1);
    expect(nationOf(state, N1).merchantMarine).toMatchObject({ ships: { trader: 1, indiaman: 2 }, holds: 10 });
    expect(nationOf(resolveTurn(state, {}, 1).state, N1).merchantMarine.holds).toBe(10);
    expect(nationOf(base, N1).warehouse).toMatchObject({ lumber: 14, fabric: 6 });
  });

  it('rejects invalid amounts, hulls and missing materials without modifying its queue', () => {
    const before = tryApplyOrder(start(), ship('indiaman', 2)).state;
    for (const order of [ship('trader', 1), ship('indiaman', -1), ship('trader', 0.5),
      ship('trader', NaN), ship('__proto__' as 'trader', 0)]) {
      const next = tryApplyOrder(before, order);
      expect(next.result.ok).toBe(false);
      expect(next.state).toBe(before);
    }
    expect(nationOf(tryApplyOrder(before, ship('indiaman', 0)).state, N1).warehouse).toMatchObject({ lumber: 14, fabric: 6 });
  });

  it('reads a v1 save with only holds as the equivalent number of Indiamen', () => {
    const game = start();
    game.nations = game.nations.map(n => ({ ...n, merchantMarine: { holds: 8, avgSpeed: 10 } }));
    const raw = JSON.stringify({ version: 1, game, activeNationId: N1, orderLog: [], ordersThisTurn: [], eventLog: [] });
    const slot = readSave({ getItem: () => raw });
    expect(slot.kind).toBe('usable');
    if (slot.kind === 'usable') {
      expect(slot.save.version).toBe(1);
      expect(nationOf(slot.save.game, N1).merchantMarine).toMatchObject({ ships: { indiaman: 2 }, holds: 8 });
    }
  });

  it('uses the hulls in a typed fleet when a save contains a stale hold count', () => {
    const game = start();
    game.nations = game.nations.map(n => ({ ...n, merchantMarine: { ...n.merchantMarine, holds: 4, ships: { trader: 1, indiaman: 2 } } }));
    expect(tradeCapacityOf(game, N1).holds).toBe(10);
    const raw = JSON.stringify({ version: 1, game, activeNationId: N1, orderLog: [], ordersThisTurn: [], eventLog: [] });
    const slot = readSave({ getItem: () => raw });
    expect(slot.kind === 'usable' && nationOf(slot.save.game, N1).merchantMarine.holds).toBe(10);
  });
});
