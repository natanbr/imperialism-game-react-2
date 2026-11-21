import { describe, expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import { N1, N2, nationOf, setTreasury } from './fixtures';

const buy = (techId: string, nationId = N1) => ({ kind: 'buyTechnology' as const, nationId, techId });
const cancel = (techId: string) => ({ kind: 'withdrawTechnology' as const, nationId: N1, techId });
const given = (state: GameState, technologies: string[]) => ({
  ...state, nations: state.nations.map(n => n.id === N1 ? { ...n, technologies } : n),
});

describe('FR-521 technology clock', () => {
  it.each([
    ['cottonGin', 1], ['streamlinedHulls', 3], ['squareSetTimbering', 3], ['ironRailroadBridge', 3],
    ['feedGrasses', 3], ['spinningJenny', 5], ['paddlewheels', 5], ['steelAndIronPlows', 7],
    ['bessemerConverter', 9], ['compoundSteamEngine', 9], ['improvedRangeFinding', 27], ['internalCombustion', 27],
  ] as const)('%s first appears on turn %i', (id, turn) => {
    const s = given(setTreasury(newGame(1), N1, 200000), [
      'cottonGin', 'feedGrasses', 'seedDrill', 'ironRailroadBridge', 'highPressureSteamEngine', 'chemistry', 'marineEngineering',
    ].filter(t => t !== id));
    if (turn > 1) expect(validateOrder({ ...s, turn: turn - 1 }, buy(id))).toMatchObject({ ok: false, reason: 'not-available' });
    expect(validateOrder({ ...s, turn }, buy(id))).toEqual({ ok: true });
  });

  it('uses the selected game length and keeps a released invention available', () => {
    const s = newGame({ seed: 1, turnLimit: 100 });
    expect(validateOrder({ ...s, turn: 6 }, buy('feedGrasses'))).toMatchObject({ reason: 'not-available' });
    expect(validateOrder({ ...s, turn: 7 }, buy('feedGrasses'))).toEqual({ ok: true });
    expect(validateOrder({ ...s, turn: 80 }, buy('feedGrasses'))).toEqual({ ok: true });
  });

  it('publishes the turn-three inventions once as the next turn opens, including a gifted invention', () => {
    const s = { ...newGame(1), turn: 2 };
    const { state, events } = resolveTurn(s, {});
    expect(events.filter(e => e.type === 'new-invention').map(e => e.techId)).toEqual([
      'streamlinedHulls', 'squareSetTimbering', 'ironRailroadBridge', 'feedGrasses',
    ]);
    expect(resolveTurn(state, {}).events.filter(e => e.type === 'new-invention')).toEqual([]);
  });
});

describe('FR-522 technology orders', () => {
  it('takes cash once, cancels and refunds only this nation, and makes its remaining purchase usable next turn', () => {
    const s = newGame(1);
    const before = nationOf(s, N1);
    const purchase = tryApplyOrder(s, buy('cottonGin'));
    expect(purchase.result).toEqual({ ok: true });
    const queued = nationOf(purchase.state, N1);
    expect(queued.treasury).toBe(before.treasury - 1000);
    expect(queued.technologies).not.toContain('cottonGin');
    expect(queued.pendingTechnologies).toEqual(['cottonGin']);
    expect(validateOrder(purchase.state, buy('cottonGin'))).toMatchObject({ ok: false, reason: 'already-owned' });
    const refunded = tryApplyOrder(purchase.state, cancel('cottonGin'));
    expect(refunded.result).toEqual({ ok: true });
    expect(nationOf(refunded.state, N1).treasury).toBe(before.treasury);
    expect(validateOrder(refunded.state, cancel('cottonGin')).ok).toBe(false);
    const next = resolveTurn(refunded.state, { [N2]: [buy('cottonGin', N2)] }).state;
    expect(nationOf(next, N2).technologies).toContain('cottonGin');
    expect(nationOf(next, N2).pendingTechnologies ?? []).toHaveLength(0);
    expect(nationOf(next, N1).technologies).not.toContain('cottonGin');
    expect(validateOrder(next, buy('cottonGin', N2))).toMatchObject({ reason: 'already-owned' });
    expect(validateOrder(next, { ...cancel('cottonGin'), nationId: N2 }).ok).toBe(false);
  });

  it('refuses early, unknown, unaffordable, owned and missing-prerequisite purchases and does not spend on refusals', () => {
    const s = { ...newGame(1), turn: 5 };
    for (const [state, id, reason] of [
      [s, 'bessemerConverter', 'not-available'], [s, 'unknown', 'not-available'],
      [s, 'highPressureSteamEngine', 'already-owned'], [s, 'spinningJenny', 'missing-prerequisite'],
      [setTreasury(s, N1, 999), 'cottonGin', 'insufficient-funds'],
    ] as const) {
      const result = tryApplyOrder(state, buy(id));
      expect(result.result).toMatchObject({ ok: false, reason });
      expect(result.state).toBe(state);
    }
    const pending = resolveTurn(s, { [N1]: [buy('cottonGin'), buy('feedGrasses'), buy('spinningJenny')] });
    expect(pending.events).toContainEqual(expect.objectContaining({ type: 'order-rejected', reason: 'missing-prerequisite' }));
    expect(validateOrder(pending.state, buy('spinningJenny'))).toEqual({ ok: true });
  });
});
