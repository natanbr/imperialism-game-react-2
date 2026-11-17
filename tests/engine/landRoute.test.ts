// FR-406 (M12, card Q83): war needs a land route. `hasLandRoute` is true when a chain of land-adjacent provinces, of any
// owners, joins one of the nation's provinces to one of the country's; a war on a country without one is refused with
// `no-land-route`. On the continent only Arvelia is the land bridge: Testland and Valdoria reach Arvelia and each other
// through it, never the island minors Sundmark, Lorran and Pellis (audit ARMY-WAR-05, FR-TRUTH-01).
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { hasLandRoute } from '@/engine/diplomacy/queries';
import { validateOrder } from '@/engine/orders/validate';
import { tryApplyOrder } from '@/engine/orders/apply';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { REFUSAL_TEXT } from '@/components/gameText';
import { N1, N2 } from './fixtures';

const ARVELIA = 'minor-1';
const SUNDMARK = 'minor-2';
const LORRAN = 'minor-3';
const PELLIS = 'minor-4';
const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const war = (nationId: string, targetId: string): Order => ({ kind: 'proposeOverture', nationId, overture: 'war', targetId });

describe('FR-406 hasLandRoute', () => {
  it.each([
    [N1, ARVELIA, true],
    [N1, N2, true],
    [N1, SUNDMARK, false],
    [N1, LORRAN, false],
    [N1, PELLIS, false],
    [N2, ARVELIA, true],
    [N2, N1, true],
    [N2, SUNDMARK, false],
    [N2, LORRAN, false],
    [N2, PELLIS, false],
  ])('on the continent from %s to %s: %s', (from, to, expected) => {
    expect(hasLandRoute(continent(), from, to)).toBe(expected);
  });

  it('runs through a province of any owner: with Arvelia gone to the sea there is no route from Testland to Valdoria', () => {
    const s = continent();
    // The land bridge's tiles leave every province: Testland and Valdoria no longer touch through it
    const bridge = new Set(s.provinces.find(p => p.ownerId === ARVELIA)!.tileIds);
    const cut: GameState = {
      ...s,
      provinces: s.provinces.filter(p => p.ownerId !== ARVELIA),
      map: { ...s.map, tiles: s.map.tiles.map(row => row.map(t => (bridge.has(t.id) ? { ...t, provinceId: undefined } : t))) },
    };
    expect(hasLandRoute(cut, N1, N2)).toBe(false);
  });

  it('is false on a world without provinces (two-islands) and for an unknown country', () => {
    expect(hasLandRoute(newGame({ seed: 1, world: 'two-islands' }), N1, N2)).toBe(false);
    expect(hasLandRoute(continent(), N1, 'minor-9')).toBe(false);
  });
});

describe('FR-406 a war without a land route is refused', () => {
  it.each([SUNDMARK, LORRAN, PELLIS])('war on %s: no-land-route', target => {
    expect(validateOrder(continent(), war(N1, target))).toEqual({ ok: false, reason: 'no-land-route' });
  });

  it.each([ARVELIA, N2])('war on %s is accepted (a land route)', target => {
    expect(validateOrder(continent(), war(N1, target))).toEqual({ ok: true });
  });

  it('the reason reads as the spec words it', () => {
    expect(REFUSAL_TEXT['no-land-route']).toBe('no army can reach them over land (that needs ships, a later milestone)');
  });

  it('a war intent stored without a route (a hand-built state) fails in the diplomacy phase with no-land-route', () => {
    // The phase checks every intent again (FR-163): the declaration is skipped, the pair stays at peace
    const s = continent();
    const stored: GameState = { ...s, intents: [{ id: 'intent-1', turn: s.turn, kind: 'war', nationId: N1, targetId: LORRAN, cost: 0 } as never] };
    const { state, events } = resolveTurn(stored, {}, s.seed);
    expect(events).toContainEqual(expect.objectContaining({ type: 'overture-failed', nationId: N1, overture: 'war', targetId: LORRAN, reason: 'no-land-route' }));
    expect(Object.values(state.diplomacy).some(p => p.war)).toBe(false);
  });

  it('the war still follows its other rules first: a war already ordered this turn is already-in-place', () => {
    const { state } = tryApplyOrder(continent(), war(N1, ARVELIA));
    expect(validateOrder(state, war(N1, ARVELIA))).toEqual({ ok: false, reason: 'already-in-place' });
  });
});
