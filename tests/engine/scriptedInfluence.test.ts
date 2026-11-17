// M13 lane B (T-07): FR-490 grants before a Council (card Q117 (a)). On a world with provinces, on the 4 turns before each
// meeting (6-9, 16-19, 26-29, 36-39), the scripted Great Power gives at most one $1,000 grant (2 points) a turn, to the
// free minor it is not at war with whose points with it are 40 to 49 and at least the rival nominee's, lowest id first,
// while its treasury after the grant stays at or above both `cashReserve` and `upkeepReserve`.
// A grant needs an embassy (FR-162), which no Great Power holds in a minor at the start (FR-151). So the rule also orders
// one: before the last grant turn of a meeting, with the first such minor (from 35 points, `SCRIPTED_INFLUENCE`) it holds
// a consulate in, while it holds no embassy in any of them and its treasury after the $5,000 stays at the reserve.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer, upkeepReserve } from '@/engine/ai/scriptedPlayer';
import { planInfluence } from '@/engine/ai/scriptedInfluence';
import { cashReserve } from '@/engine/ai/economy';
import { campaignTarget } from '@/engine/ai/scriptedWar';
import { SCRIPTED_INFLUENCE, OVERTURE_COST } from '@/definisions/diplomacyRules';
import { COUNCIL } from '@/definisions/council';
import { validateOrder } from '@/engine/orders/validate';
import { applyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { N1, N2, setPair, setTreasury } from './fixtures';
import { addRegiments, NE2, SUNDMARK } from './armyFixtures';

const ARVELIA = 'minor-1';
const LORRAN = 'minor-3';
const PELLIS = 'minor-4';
const MINORS = [ARVELIA, SUNDMARK, LORRAN, PELLIS];

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });

/**
 * Test setup on turn `turn`: Valdoria with $10,000 and a consulate in every minor (so the economy orders none and every
 * dollar before the grant is accounted for), an embassy in Sundmark, Sundmark at `points` with Valdoria and `rival`
 * with Testland; the other minors stay at the start's 30 with both.
 */
function before(turn: number, points: number, rival: number, embassy = true): GameState {
  let s: GameState = { ...continent(), turn };
  s = setTreasury(s, N2, 10_000);
  for (const m of MINORS) s = setPair(s, N2, m, { consulates: [N2] });
  s = setPair(s, N2, SUNDMARK, { points, consulates: [N2], embassies: embassy ? [N2] : [] });
  return setPair(s, N1, SUNDMARK, { points: rival });
}

/** planInfluence alone, with a propose that keeps the orders that validate in sequence (as the scripted player's). */
function influence(s: GameState, reserve = cashReserve(s, N2)): Order[] {
  const orders: Order[] = [];
  let view = s;
  planInfluence(() => view, N2, reserve, order => {
    if (!validateOrder(view, order).ok) return false;
    view = applyOrder(view, order);
    orders.push(order);
    return true;
  });
  return orders;
}

const grants = (orders: Order[]) => orders.filter(o => o.kind === 'giveGrant');
const embassies = (orders: Order[]) => orders.filter(o => o.kind === 'proposeOverture' && o.overture === 'embassy');
const grantTo = (targetId: string): Order => ({ kind: 'giveGrant', nationId: N2, targetId, amount: 1000, locked: false });
const embassyIn = (targetId: string): Order => ({ kind: 'proposeOverture', nationId: N2, overture: 'embassy', targetId });

describe('FR-490 the numbers', () => {
  it('FR-490 one $1,000 grant, on the 4 turns before each meeting, to a minor at 40 to 49 points; the embassy from 35', () => {
    expect(SCRIPTED_INFLUENCE).toMatchObject({ grant: 1000, grantTurns: 4, fromPoints: 40, toPoints: 49, embassyFromPoints: 35 });
    expect(COUNCIL).toMatchObject({ firstTurn: 10, interval: 10, minRelationPoints: 50 });
  });
});

describe('FR-490 grants before a Council', () => {
  it('FR-490 Sundmark at 44 with Valdoria and 30 with Testland on turn 26: the scripted player gives it a $1,000 grant', () => {
    expect(grants(scriptedPlayer(before(26, 44, 30), N2))).toEqual([grantTo(SUNDMARK)]);
  });

  it('FR-490 none at 39 points (below 40), nor at 44 against Testland\'s 46', () => {
    expect(grants(scriptedPlayer(before(26, 39, 30), N2))).toEqual([]);
    expect(grants(scriptedPlayer(before(26, 44, 46), N2))).toEqual([]);
  });

  it('FR-490 at 49 a grant; at 50 none (it already votes for Valdoria); a tie with the rival still gets one', () => {
    expect(grants(influence(before(26, 49, 30)))).toEqual([grantTo(SUNDMARK)]);
    expect(grants(influence(before(26, 50, 30)))).toEqual([]);
    expect(grants(influence(before(26, 44, 44)))).toEqual([grantTo(SUNDMARK)]);
  });

  it('FR-490 only on the 4 turns before a meeting: 6-9, 16-19, 26-29 and 36-39, read from COUNCIL', () => {
    const given = (turn: number) => grants(influence(before(turn, 44, 30))).length;
    const turns = Array.from({ length: 40 }, (_, i) => i + 1).filter(t => given(t) > 0);
    expect(turns).toEqual([6, 7, 8, 9, 16, 17, 18, 19, 26, 27, 28, 29, 36, 37, 38, 39]);
  });

  it('FR-490 at most one grant a turn, lowest id first: Sundmark and Lorran both at 44 with an embassy, Sundmark gets it', () => {
    const s = setPair(before(26, 44, 30), N2, LORRAN, { points: 44, consulates: [N2], embassies: [N2] });
    expect(grants(influence(s))).toEqual([grantTo(SUNDMARK)]);
  });

  it('FR-490 not to a minor it is at war with: Sundmark at war, Lorran at 44 with an embassy gets it', () => {
    let s = setPair(before(26, 44, 30), N2, LORRAN, { points: 44, consulates: [N2], embassies: [N2] });
    s = setPair(s, N2, SUNDMARK, { war: { aggressors: [N2], since: 20 } });
    expect(grants(influence(s))).toEqual([grantTo(LORRAN)]);
  });

  it('FR-490 not to a colony (a minor that is not free)', () => {
    const s = before(26, 44, 30);
    const colonised = { ...s, minorNations: s.minorNations.map(m => (m.id === SUNDMARK ? { ...m, colonyOf: N2 } : m)) };
    expect(grants(influence(colonised))).toEqual([]);
  });

  it('FR-490 not to the minor its own campaign targets (it would be at war with it soon)', () => {
    const s = setPair(setPair(before(26, 30, 30), N2, ARVELIA, { points: 44, embassies: [N2] }), N1, ARVELIA, { points: 30 });
    expect(campaignTarget(s, N2)).toBe(ARVELIA);
    expect(grants(influence(s))).toEqual([]);
  });

  it('FR-490 only while the treasury after the grant stays at the cash reserve or more', () => {
    const s = before(26, 44, 30);
    const reserve = cashReserve(s, N2);
    expect(grants(influence(setTreasury(s, N2, reserve + 1000)))).toEqual([grantTo(SUNDMARK)]);
    expect(grants(influence(setTreasury(s, N2, reserve + 999)))).toEqual([]);
  });

  it('FR-490 nor below the upkeep reserve: with a large army on turn 36, $1,000 above it is not enough when the grant would cut into it', () => {
    let s = addRegiments(before(36, 44, 30), N2, NE2, Array(30).fill('regulars'));
    const keep = upkeepReserve(s, N2);
    expect(keep).toBeGreaterThan(cashReserve(s, N2) + 1000);
    s = setTreasury(s, N2, keep + 999);
    expect(grants(scriptedPlayer(s, N2))).toEqual([]);
  });

  it('FR-498 on two-islands (no provinces, no Council) it gives no grant and orders no embassy on any turn', () => {
    for (const turn of [6, 26, 36]) {
      const orders = scriptedPlayer(setTreasury({ ...newGame({ seed: 1 }), turn }, N2, 20_000), N2);
      expect(grants(orders)).toEqual([]);
      expect(embassies(orders)).toEqual([]);
    }
  });
});

describe('FR-490 the embassy a grant needs (FR-162)', () => {
  it('FR-490 on a grant turn with no embassy in Sundmark (44 against 30) it orders the embassy, and no grant', () => {
    const orders = influence(before(26, 44, 30, false));
    expect(embassies(orders)).toEqual([embassyIn(SUNDMARK)]);
    expect(grants(orders)).toEqual([]);
  });

  it('FR-490 before the grant turns, from 35 points: Sundmark at 36 on turn 22 gets the embassy, at 34 none', () => {
    expect(embassies(influence(before(22, 36, 30, false)))).toEqual([embassyIn(SUNDMARK)]);
    expect(embassies(influence(before(22, 34, 30, false)))).toEqual([]);
  });

  it('FR-490 none without a consulate there (an embassy needs one), and none when the rival has more points', () => {
    expect(embassies(influence(setPair(before(22, 36, 30, false), N2, SUNDMARK, { consulates: [] })))).toEqual([]);
    expect(embassies(influence(before(22, 36, 40, false)))).toEqual([]);
  });

  it('FR-490 only one embassy for the grants: with one in Sundmark, Lorran at 36 gets none', () => {
    const s = setPair(before(22, 36, 30), N2, LORRAN, { points: 36 });
    expect(embassies(influence(s))).toEqual([]);
  });

  it('FR-490 only while the treasury after the $5,000 stays at the cash reserve or more', () => {
    const s = before(22, 36, 30, false);
    const reserve = cashReserve(s, N2);
    expect(embassies(influence(setTreasury(s, N2, reserve + OVERTURE_COST.embassy)))).toEqual([embassyIn(SUNDMARK)]);
    expect(embassies(influence(setTreasury(s, N2, reserve + OVERTURE_COST.embassy - 1)))).toEqual([]);
  });

  it('FR-490 none once the last meeting\'s grant turns are over (turn 40), nor on a meeting turn', () => {
    expect(influence(before(40, 44, 30, false))).toEqual([]);
    expect(influence(before(30, 44, 30, false))).toEqual([]);
  });

  it('FR-490 the embassy order reaches the scripted player\'s turn (economy, after the consulate step)', () => {
    expect(embassies(scriptedPlayer(before(22, 36, 30, false), N2))).toEqual([embassyIn(SUNDMARK)]);
  });

  it('FR-490 it never spends on Pellis or Lorran at the start\'s 30 points (below 35)', () => {
    const orders = influence(before(22, 30, 30, false));
    expect(orders.filter(o => o.kind === 'giveGrant' || o.kind === 'proposeOverture')).toEqual([]);
    expect(MINORS).toContain(PELLIS);
  });
});
