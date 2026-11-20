// M13 lane B (T-07): FR-490 grants before a Council (card Q117 (a)). On a world with provinces, on the 4 turns before each
// meeting (6-9, 16-19, 26-29, 36-39), the scripted Great Power gives at most one $1,000 grant (2 points) a turn, to the
// free minor it is not at war with whose points with it are 40 to 49 and at least the rival nominee's, lowest id first,
// while its treasury after the grant stays at or above both `cashReserve` and `upkeepReserve`.
// A grant needs an embassy (FR-162), which no Great Power holds in a minor at the start (FR-151). So the rule also orders
// one, while it holds no embassy in a free minor.
// M13 close round (FR-542, card Q117 (b), default taken running alone): the embassy from 25 points (was 35), the most points
// first, never in a minor that borders the nation, with the upkeep reserve as its floor (was `cashReserve`); while it is
// wanted the campaign recruits and the training keep its price; the turn after, a pact (free, +10 points); the campaign
// takes no minor it holds a pact with; no embassy for the first meeting (turn 10). Each re-recorded case names its old number.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer, upkeepReserve } from '@/engine/ai/scriptedPlayer';
import { embassySaving, planInfluence } from '@/engine/ai/scriptedInfluence';
import { wantedRegiment } from '@/engine/ai/scriptedArmy';
import { computerOrders } from '@/engine/ai/players';
import { councilCell, councilVote } from '@/engine/council/council';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { cashReserve } from '@/engine/ai/economy';
import { campaignTarget } from '@/engine/ai/scriptedWar';
import { SCRIPTED_INFLUENCE, OVERTURE_COST, PACT_POINTS } from '@/definisions/diplomacyRules';
import { COUNCIL } from '@/definisions/council';
import { REGIMENTS, SCRIPTED_GARRISON } from '@/definisions/regiments';
import { validateOrder } from '@/engine/orders/validate';
import { applyOrder } from '@/engine/orders/apply';
import { pairKey } from '@/engine/diplomacy/relations';
import type { GameEvent } from '@/engine/turn/context';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { N1, N2, setIndustry, setPair, setTreasury, setWarehouse } from './fixtures';
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

/** FR-542: `before` with no embassy, the other three minors at 20 points with Valdoria (below the embassy's 25). */
function courting(turn: number, points: number, rival: number): GameState {
  let s = before(turn, points, rival, false);
  for (const m of [ARVELIA, LORRAN, PELLIS]) s = setPair(s, N2, m, { points: 20 });
  return s;
}

/** FR-542: Valdoria at war with Testland, which it declared on turn `turn - 1`: its campaign targets Testland, not Arvelia. */
const atWarWithTestland = (s: GameState): GameState => setPair(s, N2, N1, { war: { aggressors: [N2], since: s.turn - 1 } });

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
const pacts = (orders: Order[]) => orders.filter(o => o.kind === 'proposeOverture' && o.overture === 'pact');
const grantTo = (targetId: string): Order => ({ kind: 'giveGrant', nationId: N2, targetId, amount: 1000, locked: false });
const embassyIn = (targetId: string): Order => ({ kind: 'proposeOverture', nationId: N2, overture: 'embassy', targetId });
const pactWith = (targetId: string): Order => ({ kind: 'proposeOverture', nationId: N2, overture: 'pact', targetId });

describe('FR-490 the numbers', () => {
  // Re-recorded by FR-542 (M13 close round, card Q117 (b)): embassyFromPoints 35 -> 25. From 35 the embassy came only on
  // turns 26 to 30, when the war on the player keeps the treasury at its upkeep reserve: 0 of 24 idle games had one.
  it('FR-490 FR-542 one $1,000 grant, on the 4 turns before each meeting, to a minor at 40 to 49 points; the embassy from 25; a pact adds 10', () => {
    expect(SCRIPTED_INFLUENCE).toMatchObject({ grant: 1000, grantTurns: 4, fromPoints: 40, toPoints: 49, embassyFromPoints: 25 });
    expect(COUNCIL).toMatchObject({ firstTurn: 10, interval: 10, minRelationPoints: 50 });
    expect(PACT_POINTS).toBe(10);
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

  // Re-recorded by FR-542: was "from 35 points: Sundmark at 36 gets the embassy, at 34 none". The other minors now go to
  // 20 points, since from 25 the start's 30 would court them.
  it('FR-490 FR-542 before the grant turns, from 25 points: Sundmark at 26 on turn 22 gets the embassy, at 24 none', () => {
    expect(embassies(influence(courting(22, 26, 20)))).toEqual([embassyIn(SUNDMARK)]);
    expect(embassies(influence(courting(22, 24, 20)))).toEqual([]);
  });

  // Re-recorded by FR-542: the same two cases, with the other minors at 20 points (see above).
  it('FR-490 none without a consulate there (an embassy needs one), and none when the rival has more points', () => {
    expect(embassies(influence(setPair(courting(22, 36, 30), N2, SUNDMARK, { consulates: [] })))).toEqual([]);
    expect(embassies(influence(courting(22, 36, 40)))).toEqual([]);
  });

  it('FR-490 only one embassy for the grants: with one in Sundmark, Lorran at 36 gets none', () => {
    const s = setPair(before(22, 36, 30), N2, LORRAN, { points: 36 });
    expect(embassies(influence(s))).toEqual([]);
  });

  // Re-recorded by FR-542: was "only while the treasury after the $5,000 stays at the cash reserve ($2,500) or more".
  // The floor is now the upkeep reserve the scripted player keeps for every order (FR-213 (a)); with the start's army on
  // turn 22 it is below the cash reserve. Through `scriptedPlayer`, since its `propose` holds that floor; no paper, so no
  // training spends first.
  it('FR-490 FR-542 only while the treasury after the $5,000 stays at the upkeep reserve or more (no longer the cash reserve)', () => {
    const s = setWarehouse(courting(22, 36, 30), N2, { paper: 0 });
    const keep = upkeepReserve(s, N2);
    expect(keep).toBeGreaterThan(0);
    expect(keep).toBeLessThan(cashReserve(s, N2));
    expect(embassies(scriptedPlayer(setTreasury(s, N2, keep + OVERTURE_COST.embassy), N2))).toEqual([embassyIn(SUNDMARK)]);
    expect(embassies(scriptedPlayer(setTreasury(s, N2, keep + OVERTURE_COST.embassy - 1), N2))).toEqual([]);
  });

  it('FR-490 none once the last meeting\'s grant turns are over (turn 40), nor on a meeting turn', () => {
    expect(influence(before(40, 44, 30, false))).toEqual([]);
    expect(influence(before(30, 44, 30, false))).toEqual([]);
  });

  it('FR-490 the embassy order reaches the scripted player\'s turn (economy, after the consulate step)', () => {
    expect(embassies(scriptedPlayer(before(22, 36, 30, false), N2))).toEqual([embassyIn(SUNDMARK)]);
  });

  // Re-recorded by FR-542: was "it never spends on Pellis or Lorran at the start's 30 points (below 35)" -> no order. From
  // 25 the start's 30 is courted: the embassy goes to Sundmark, the lowest id of the tied minors that do not border
  // Valdoria (Arvelia does); with every minor at 24 nothing is spent.
  it('FR-490 FR-542 at the start\'s 30 points everywhere the embassy goes to Sundmark (Arvelia borders Valdoria); at 24 everywhere nothing is spent', () => {
    expect(influence(before(22, 30, 30, false))).toEqual([embassyIn(SUNDMARK)]);
    let low = courting(22, 24, 20);
    for (const m of MINORS) low = setPair(low, N2, m, { points: 24 });
    expect(influence(low)).toEqual([]);
    expect(MINORS).toContain(PELLIS);
  });
});

describe('FR-542 the embassy and the pact before a Council (card Q117 (b))', () => {
  it('FR-542 the most points first: Lorran at 40 gets the embassy before Sundmark at 36 (was the lowest id)', () => {
    const s = setPair(courting(22, 36, 30), N2, LORRAN, { points: 40 });
    expect(embassies(influence(s))).toEqual([embassyIn(LORRAN)]);
  });

  it('FR-542 no embassy for the first meeting (turn 10): a minor at the start\'s 30 cannot reach 50 by then (30 + a pact\'s 10 + 4 grants\' 8 = 48); from turn 11 it is ordered', () => {
    for (const turn of [1, 6, 9, 10]) {
      expect(embassies(influence(courting(turn, 36, 30)))).toEqual([]);
      expect(embassySaving(courting(turn, 36, 30), N2)).toBe(0);
    }
    expect(embassies(influence(courting(11, 36, 30)))).toEqual([embassyIn(SUNDMARK)]);
  });

  it('FR-542 never in a minor that borders Valdoria: at war with Testland (so Arvelia is not the campaign target), Arvelia at 45 gets none, Sundmark at 26 gets it', () => {
    const s = atWarWithTestland(setPair(courting(12, 26, 20), N2, ARVELIA, { points: 45 }));
    expect(campaignTarget(s, N2)).toBe(N1);
    expect(embassies(influence(s))).toEqual([embassyIn(SUNDMARK)]);
    // at peace Arvelia is the minor the campaign takes from turn 10 (FR-274): the bordering one
    expect(campaignTarget({ ...continent(), turn: 12 }, N2)).toBe(ARVELIA);
  });

  it('FR-542 one embassy at a time: with one in Pellis (at 55, above the grants\' 49), Sundmark at 36 gets none', () => {
    const s = setPair(courting(22, 36, 30), N2, PELLIS, { points: 55, embassies: [N2] });
    expect(embassies(influence(s))).toEqual([]);
  });

  it('FR-542 the pact the turn after the embassy (free, +10): with the embassy in Sundmark it proposes one; none without it, none twice', () => {
    expect(OVERTURE_COST.pact).toBe(0);
    expect(pacts(influence(before(22, 36, 30)))).toEqual([pactWith(SUNDMARK)]);
    expect(pacts(influence(before(22, 36, 30, false)))).toEqual([]);
    expect(pacts(influence(setPair(before(22, 36, 30), N2, SUNDMARK, { pact: true })))).toEqual([]);
  });

  it('FR-542 an existing embassy cannot trigger a pact for the first meeting; the FR-490 grant window still applies', () => {
    const orders = influence(before(6, 44, 30));
    expect(pacts(orders)).toEqual([]);
    expect(grants(orders)).toEqual([grantTo(SUNDMARK)]);
  });

  it('FR-542 a pact requires an eligible minor even when the embassy is already held', () => {
    for (const [points, rival] of [[24, 20], [50, 30], [35, 36]]) {
      expect(pacts(influence(before(22, points, rival)))).toEqual([]);
    }
    expect(pacts(influence(before(22, 25, 25)))).toEqual([pactWith(SUNDMARK)]);
  });

  it('FR-542 no pact with a minor that borders Valdoria (at war with Testland, so not for being the target), nor on a meeting turn', () => {
    const s = atWarWithTestland(setPair(before(22, 36, 30, false), N2, ARVELIA, { points: 45, embassies: [N2] }));
    expect(campaignTarget(s, N2)).toBe(N1);
    expect(pacts(influence(s))).toEqual([]);
    expect(pacts(influence(setPair(s, N2, SUNDMARK, { embassies: [N2] })))).toEqual([pactWith(SUNDMARK)]);
    expect(pacts(influence(before(30, 36, 30)))).toEqual([]);
  });

  it('FR-542 the campaign takes no minor Valdoria holds a pact with (war on it would cost 20 points with every country)', () => {
    const s = { ...continent(), turn: 12 };
    expect(campaignTarget(s, N2)).toBe(ARVELIA);
    expect(campaignTarget(setPair(s, N2, ARVELIA, { pact: true }), N2)).not.toBe(ARVELIA);
  });

  it('FR-542 the saving: $5,000 while an embassy is wanted; nothing once one is held, without a consulate, or on two-islands', () => {
    expect(embassySaving(courting(22, 36, 30), N2)).toBe(OVERTURE_COST.embassy);
    expect(embassySaving(before(22, 36, 30), N2)).toBe(0);
    expect(embassySaving(setPair(courting(22, 36, 30), N2, SUNDMARK, { consulates: [] }), N2)).toBe(0);
    expect(embassySaving(setTreasury({ ...newGame({ seed: 1 }), turn: 22 }, N2, 20_000), N2)).toBe(0);
  });

  describe('FR-542 while the embassy is wanted, the campaign keeps its price', () => {
    /** FR-458's fixture on turn 12 (Arvelia the target, no field army): 3 trained, 3 experts, paper, `horses`, 1 armament. */
    const campaign = (horses: number, consulate: boolean): GameState => {
      const s = setIndustry(setWarehouse({ ...continent(), turn: 12 }, N2, { paper: 20, horses, armaments: 1 }), N2, { workers: { untrained: 0, trained: 3, expert: 3 } });
      return setPair(s, N2, SUNDMARK, { consulates: consulate ? [N2] : [] });
    };
    const training = (s: GameState) => scriptedPlayer(s, N2).filter(o => o.kind === 'trainWorkers');

    it('FR-542 the recruit: Cuirassiers at its price + $2,500 without a consulate in Sundmark; with one it waits for $5,000 more', () => {
      const price = SCRIPTED_GARRISON.treasuryFloor + REGIMENTS.cuirassiers.cash;
      expect(embassySaving(campaign(2, true), N2)).toBe(OVERTURE_COST.embassy);
      expect(wantedRegiment(setTreasury(campaign(2, false), N2, price), N2)).toBe('cuirassiers');
      expect(wantedRegiment(setTreasury(campaign(2, true), N2, price + OVERTURE_COST.embassy - 1), N2)).toBeUndefined();
      expect(wantedRegiment(setTreasury(campaign(2, true), N2, price + OVERTURE_COST.embassy), N2)).toBe('cuirassiers');
    });

    it('FR-542 the training (FR-460\'s $1,500 trains 1 worker): with the embassy wanted it trains none', () => {
      expect(training(setTreasury(campaign(0, false), N2, 1500)).length).toBe(1);
      expect(training(setTreasury(campaign(0, true), N2, 1500))).toEqual([]);
    });
  });
});

/**
 * FR-542 real games: the continent from `newGame`, Testland idle (End Turn only), no embassy preset; the turns on which
 * Valdoria's embassy and pact were made and its grants paid, and its Other Minor Nations votes at each meeting.
 */
function idleGame(seed: number, turns: number) {
  let s: GameState = newGame({ seed, world: 'continent' });
  const done: string[] = [];
  const votes: Record<number, number> = {};
  const startEmbassies = s.minorNations.filter(m => s.diplomacy[pairKey(N2, m.id)]?.embassies.includes(N2)).length;
  for (let played = 0; played < turns && !s.gameOver; played++) {
    const turn = s.turn;
    const { state, events } = resolveTurn(s, computerOrders(s), s.seed);
    for (const e of events as GameEvent[]) {
      if (e.type === 'overture-done' && e.nationId === N2 && (e.overture === 'embassy' || e.overture === 'pact')) done.push(`${e.overture} ${e.targetId} ${turn}`);
      if (e.type === 'grant-paid' && e.nationId === N2) done.push(`grant ${e.targetId} $${e.amount} ${turn}`);
      if (e.type === 'council-met') votes[turn] = e.nominees.find(n => n.nationId === N2)?.otherMinorNations ?? 0;
    }
    s = state;
  }
  return { state: s, startEmbassies, done, votes, points: (minor: string) => s.diplomacy[pairKey(N2, minor)]?.points };
}

describe('FR-490 FR-542 real games from the start, no embassy preset (the row\'s example)', () => {
  it('FR-542 seed 11: embassy in Sundmark on turn 25, pact on 26, a $1,000 grant on 27, before the turn-30 meeting', () => {
    const g = idleGame(11, 30);
    expect(g.startEmbassies).toBe(0);
    expect(g.done).toEqual([`embassy ${SUNDMARK} 25`, `pact ${SUNDMARK} 26`, `grant ${SUNDMARK} $1000 27`]);
    expect(g.votes[30]).toBe(0);
    expect(g.points(SUNDMARK)).toBe(48);
  }, 60_000);

  it('FR-542 FR-510 seed 1: the embassy, pact and two grants earn Sundmark; the forced final ballot adds a second minor', () => {
    const g = idleGame(1, 40);
    expect(g.startEmbassies).toBe(0);
    expect(g.done).toEqual([`embassy ${SUNDMARK} 23`, `pact ${SUNDMARK} 24`, `grant ${SUNDMARK} $1000 36`, `grant ${SUNDMARK} $1000 37`]);
    // FR-501: 1 -> 2 final minor votes. Only Sundmark meets the ordinary 50-point rule after the grants.
    expect(g.votes).toEqual({ 10: 0, 20: 0, 30: 0, 40: 2 });
    expect(councilCell(councilVote(g.state, COUNCIL.firstTurn)!, N2, 'otherMinorNations')).toEqual(['province-minor-2']);
  }, 60_000);
});
