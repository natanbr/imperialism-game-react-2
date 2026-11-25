import { describe, expect, it } from 'vitest';
import { newGame, resolveTurn, tryApplyOrder, type Order } from '@/engine';
import { upkeepForecast } from '@/engine/army/upkeepForecast';
import { MaterialType, ResourceType } from '@/types/Resource';
import { deepFreeze, invariantViolations, N1, N2, nationOf, setTreasury } from './fixtures';

const open: Order = { kind: 'openCredit', nationId: N1 };

describe('FR-599 authorization', () => {
  it.each(['normal', 'demo'] as const)('opens at $200 in %s, with no fee, advance or reset on reopening', difficulty => {
    const start = deepFreeze(newGame({ seed: 1, difficulty }));
    const opened = tryApplyOrder(start, open);
    expect(opened.result).toEqual({ ok: true });
    expect(nationOf(opened.state, N1)).toEqual({
      ...nationOf(start, N1), creditAccount: { limit: 200, saleReceipts: [] },
    });
    const later = resolveTurn(opened.state, { [N1]: [
      { kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 },
    ] }).state;
    expect(nationOf(later, N1).creditAccount?.saleReceipts).toEqual([100]);
    expect(tryApplyOrder(deepFreeze(later), open)).toEqual({ state: later, result: { ok: true } });
  });

  it('replays a reservation, a partial refund and an ordinary sale across zero', () => {
    const start = deepFreeze(setTreasury(newGame(1), N1, 0));
    const bid = (amount: number): Order => ({ kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Coal, amount });
    const orders: Order[] = [open, bid(2), bid(1), { kind: 'sellCommodity', nationId: N1, commodity: MaterialType.Lumber, amount: 1 }];
    let state = start;
    for (const [index, order] of orders.entries()) {
      const applied = tryApplyOrder(state, order);
      expect(applied.result).toEqual({ ok: true });
      state = applied.state;
      expect(nationOf(state, N1).treasury).toBe([0, -200, -100, -100][index]);
    }
    const settled = resolveTurn(state, {});
    expect(nationOf(settled.state, N1).treasury).toBe(200);
    expect(nationOf(settled.state, N1).creditAccount?.saleReceipts).toEqual([300]);
    expect(resolveTurn(start, { [N1]: orders })).toEqual(settled);
  });

  it('NR-039 permits only a finite signed balance on a human with an open facility', () => {
    const start = newGame(1);
    const cashOnly = setTreasury(start, N1, -1);
    expect(nationOf(cashOnly, N1)).toMatchObject({ debt: 0, creditLimit: 5000 });
    expect(invariantViolations(cashOnly)).toContain('nation nation-1 treasury -1');
    const authorized = tryApplyOrder(start, open);
    expect(authorized.result).toEqual({ ok: true });
    const inDebt = setTreasury(authorized.state, N1, -1000);
    expect(invariantViolations(inDebt)).toEqual([]);
    expect(invariantViolations(setTreasury(inDebt, N1, -Infinity))).toContain('nation nation-1 treasury -Infinity');
    const forged = { ...inDebt, nations: inDebt.nations.map(n => n.id === N2
      ? { ...n, treasury: -5, creditAccount: { limit: 500, saleReceipts: [] } } : n) };
    expect(invariantViolations(forged)).toContain('nation nation-2 treasury -5');
    expect(tryApplyOrder(forged, { kind: 'openCredit', nationId: N2 }).result.ok).toBe(false);
  });

  it('FR-602 forecasts full upkeep on credit and the excess over the posted limit', () => {
    const start = setTreasury(newGame({ seed: 2, world: 'continent' }), N1, -105);
    const authorized = tryApplyOrder(start, open).state;
    expect(upkeepForecast(authorized, N1)).toMatchObject({
      due: 100, cash: -105, short: false, shortBy: 0, regimentsLost: [], projectedDebt: 205, overLimitBy: 5,
    });
  });
});
