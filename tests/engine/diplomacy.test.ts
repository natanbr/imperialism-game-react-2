// M6 Diplomacy: the diplomacy phase (FR-163 to FR-173) and every overture from its order to its effect
// after End Turn (FR-180). On the continent nation 1 (Testland) is human and nation 2 (Valdoria) scripted,
// so Valdoria answers alliance and peace by the FR-174 rule. resolveTurn applies only the orders given, as
// the store does with the computer's orders; nation 2's orders are passed by hand where a test needs them.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn, type OrdersByNation } from '@/engine/turn/resolveTurn';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { addIntent } from '@/engine/turn/intents';
import { TURN_PHASES } from '@/engine/turn/phases';
import { diplomacySystem } from '@/engine/systems/diplomacySystem';
import { tradeSystem } from '@/engine/systems/tradeSystem';
import { pairKey } from '@/engine/diplomacy/relations';
import { warActive } from '@/engine/diplomacy/queries';
import type { PairDiplomacy } from '@/types/Diplomacy';
import type { GameState } from '@/types/GameState';
import { deepFreeze, N1, N2, setPair, setTreasury, treasury } from './fixtures';

const ARVELIA = 'minor-1';
const SUNDMARK = 'minor-2';
const LORRAN = 'minor-3';
const PELLIS = 'minor-4';
const DIPLOMACY_EVENTS = [
  'overture-done', 'overture-refused', 'overture-failed', 'war-declared', 'attacks-cancelled', 'relation-changed', 'grant-paid',
  'grant-stopped', 'proposal-received',
];

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const pair = (s: GameState, a: string, b: string): PairDiplomacy => s.diplomacy[pairKey(a, b)];
const points = (s: GameState, a: string, b: string): number => pair(s, a, b).points;

type OvertureName = 'consulate' | 'embassy' | 'pact' | 'alliance' | 'war' | 'peace';
const propose = (nationId: string, overture: OvertureName, targetId: string): Order => ({ kind: 'proposeOverture', nationId, overture, targetId });
const grant = (amount: 1000 | 3000 | 5000 | 10000, locked = false, targetId = ARVELIA, nationId = N1): Order => ({ kind: 'giveGrant', nationId, targetId, amount, locked });
const policy = (subsidyPercent: 0 | 10 | 25, boycott = false, targetId = ARVELIA): Order => ({ kind: 'setTradePolicy', nationId: N1, targetId, subsidyPercent, boycott });
const answer = (proposalId: string, accept: boolean): Order => ({ kind: 'answerProposal', nationId: N1, proposalId, accept });
const withdraw = (overture: OvertureName | 'grant' | 'trade-policy', targetId = ARVELIA): Order => ({ kind: 'withdrawOverture', nationId: N1, overture, targetId });

/** Applies an order the human gives during the turn; it must be accepted. */
function order(s: GameState, o: Order): GameState {
  const { state, result } = tryApplyOrder(s, o);
  expect(result).toEqual({ ok: true });
  return state;
}

/** End Turn; `orders` are the other nations' orders, applied by resolveTurn. Only the diplomacy events are kept. */
function endTurn(s: GameState, orders: OrdersByNation = {}): { state: GameState; events: GameEvent[] } {
  const { state, events } = resolveTurn(s, orders, s.seed);
  return { state, events: events.filter(e => DIPLOMACY_EVENTS.includes(e.type)) };
}

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) => events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const embassy = (s: GameState, nationId = N1, other = ARVELIA): GameState => setPair(s, nationId, other, { consulates: [nationId], embassies: [nationId] });
const warWith = (s: GameState, other: string, since = 1): GameState =>
  setPair(s, N1, other, { war: { aggressors: [N1], since }, consulates: [], embassies: [], points: 0 });

describe('FR-163 consulate', () => {
  it('FR-163 FR-180 turn 1 Testland orders a consulate with Arvelia: 10,000 -> 9,500 at once; after End Turn the pair holds Testland\'s consulate', () => {
    const s = order(continent(), propose(N1, 'consulate', ARVELIA));
    expect(treasury(s, N1)).toBe(9500);

    const { state, events } = endTurn(s);

    expect(pair(state, N1, ARVELIA).consulates).toEqual([N1]);
    expect(events).toContainEqual({ type: 'overture-done', nationId: N1, overture: 'consulate', targetId: ARVELIA });
    expect(treasury(state, N1)).toBe(9500);
    expect(state.intents).toEqual([]);
  });

  it('FR-163 a consulate with a Great Power whose consulate a war ended is established again', () => {
    const s = order(setPair(continent(), N1, N2, { consulates: [N2], embassies: [N2] }), propose(N1, 'consulate', N2));

    const { state } = endTurn(s);

    expect(pair(state, N1, N2).consulates).toEqual([N1, N2]);
  });

  it('FR-163 the diplomacy phase runs before the trade phase, so a consulate counts in that turn\'s trades', () => {
    expect(TURN_PHASES.indexOf(diplomacySystem)).toBeGreaterThanOrEqual(0);
    expect(TURN_PHASES.indexOf(diplomacySystem)).toBeLessThan(TURN_PHASES.indexOf(tradeSystem));
  });

  it('FR-163 it allows a subsidy from the next turn', () => {
    const s = order(continent(), propose(N1, 'consulate', ARVELIA));
    expect(validateOrder(s, policy(10))).toEqual({ ok: false, reason: 'needs-consulate' });

    expect(validateOrder(endTurn(s).state, policy(10))).toEqual({ ok: true });
  });
});

describe('FR-164 embassy', () => {
  it('FR-164 FR-180 consulate ordered turn 1, embassy ordered turn 2 ($5,000), a pact may be ordered from turn 3', () => {
    let s = endTurn(order(continent(), propose(N1, 'consulate', ARVELIA))).state;
    expect(s.turn).toBe(2);
    const before = treasury(s, N1);

    s = order(s, propose(N1, 'embassy', ARVELIA));
    expect(treasury(s, N1)).toBe(before - 5000);
    expect(validateOrder(s, propose(N1, 'pact', ARVELIA))).toEqual({ ok: false, reason: 'needs-embassy' });

    const { state, events } = endTurn(s);

    expect(pair(state, N1, ARVELIA).embassies).toEqual([N1]);
    expect(events).toContainEqual({ type: 'overture-done', nationId: N1, overture: 'embassy', targetId: ARVELIA });
    expect(state.turn).toBe(3);
    expect(validateOrder(state, propose(N1, 'pact', ARVELIA))).toEqual({ ok: true });
  });
});

describe('FR-165 non-aggression pact', () => {
  it('FR-165 FR-180 with an embassy: free, accepted at End Turn, +10 points (yellow to beige)', () => {
    const s = order(embassy(continent()), propose(N1, 'pact', ARVELIA));
    expect(treasury(s, N1)).toBe(10000);

    const { state, events } = endTurn(s);

    expect(pair(state, N1, ARVELIA)).toMatchObject({ pact: true, points: 40 });
    expect(events).toContainEqual({ type: 'overture-done', nationId: N1, overture: 'pact', targetId: ARVELIA });
    expect(ofType(events, 'relation-changed')).toEqual([{ type: 'relation-changed', nationId: N1, otherId: ARVELIA, from: 3, to: 4 }]);
  });
});

describe('FR-166 alliance', () => {
  it('FR-166 FR-174 FR-180 accepted: Valdoria (scripted) at level 6 accepts in the same End Turn; both Great Powers get the news', () => {
    const s = order(setPair(continent(), N1, N2, { points: 60 }), propose(N1, 'alliance', N2));

    const { state, events } = endTurn(s);

    expect(pair(state, N1, N2).alliance).toBe(true);
    expect(ofType(events, 'overture-done')).toEqual([
      { type: 'overture-done', nationId: N1, overture: 'alliance', targetId: N2 },
      { type: 'overture-done', nationId: N2, overture: 'alliance', targetId: N1 },
    ]);
  });

  it('FR-166 FR-174 FR-180 refused: at level 5 Valdoria refuses; only the news changes', () => {
    const s = order(setPair(continent(), N1, N2, { points: 59 }), propose(N1, 'alliance', N2));

    const { state, events } = endTurn(s);

    expect(pair(state, N1, N2)).toEqual(pair(s, N1, N2));
    expect(events).toEqual([{ type: 'overture-refused', nationId: N1, overture: 'alliance', targetId: N2 }]);
  });

  it('FR-166 to the human it becomes a proposal; accepted on the next turn, the alliance is set from that End Turn', () => {
    const first = endTurn(continent(), { [N2]: [propose(N2, 'alliance', N1)] });

    expect(first.state.proposals).toEqual([{ id: 'proposal-1-1', fromId: N2, toId: N1, kind: 'alliance', turn: 1 }]);
    expect(first.events).toEqual([{ type: 'proposal-received', nationId: N1, fromId: N2, proposalId: 'proposal-1-1', kind: 'alliance' }]);
    expect(pair(first.state, N1, N2).alliance).toBe(false);

    const { state, events } = endTurn(order(first.state, answer('proposal-1-1', true)));

    expect(pair(state, N1, N2).alliance).toBe(true);
    expect(state.proposals).toEqual([]);
    expect(ofType(events, 'overture-done')).toHaveLength(2);
  });

  it.each([
    ['rejected', (s: GameState) => order(s, answer('proposal-1-1', false))],
    ['left unanswered', (s: GameState) => s],
  ])('FR-166 %s, the proposal is refused at that End Turn and removed', (_name, answerIt) => {
    const first = endTurn(continent(), { [N2]: [propose(N2, 'alliance', N1)] });

    const { state, events } = endTurn(answerIt(first.state));

    expect(pair(state, N1, N2).alliance).toBe(false);
    expect(state.proposals).toEqual([]);
    expect(events).toEqual([{ type: 'overture-refused', nationId: N2, overture: 'alliance', targetId: N1 }]);
  });
});

describe('FR-167 declaration of war', () => {
  it('FR-167 FR-180 a war ordered on turn 1 is recorded at that End Turn as { aggressors: [Testland], since: 2 }, with the news', () => {
    const { state, events } = endTurn(order(continent(), propose(N1, 'war', ARVELIA)));

    expect(pair(state, N1, ARVELIA).war).toEqual({ aggressors: [N1], since: 2 });
    expect(events).toContainEqual({ type: 'war-declared', nationId: N1, targetId: ARVELIA, startsTurn: 2 });
  });

  it('FR-167 FR-170 the war ends the pair\'s consulates, embassies, alliance, subsidies and locked grants (grant-stopped, nothing paid)', () => {
    const s = setPair(continent(), N1, N2, { alliance: true, subsidies: { [N1]: 10, [N2]: 25 }, lockedGrants: { [N1]: 1000, [N2]: 3000 } });

    const { state, events } = endTurn(order(s, propose(N1, 'war', N2)));

    expect(pair(state, N1, N2)).toMatchObject({ consulates: [], embassies: [], alliance: false, subsidies: {}, lockedGrants: {} });
    expect(ofType(events, 'grant-stopped')).toEqual([
      { type: 'grant-stopped', nationId: N1, targetId: N2, amount: 1000, reason: 'war' },
      { type: 'grant-stopped', nationId: N2, targetId: N1, amount: 3000, reason: 'war' },
    ]);
    expect(ofType(events, 'grant-paid')).toEqual([]);
    expect(treasury(state, N1)).toBe(10000);
  });

  it('FR-167 the war ends a pact and the embassy with a minor', () => {
    const s = setPair(embassy(continent()), N1, ARVELIA, { pact: true });

    const { state } = endTurn(order(s, propose(N1, 'war', ARVELIA)));

    expect(pair(state, N1, ARVELIA)).toMatchObject({ pact: false, consulates: [], embassies: [] });
  });

  it('FR-167 two declarations between the same pair in one turn make one war with both as aggressors (and lose the 40 points once)', () => {
    const s = order(setPair(continent(), N1, N2, { points: 85 }), propose(N1, 'war', N2));

    const { state, events } = endTurn(s, { [N2]: [propose(N2, 'war', N1)] });

    expect(pair(state, N1, N2).war).toEqual({ aggressors: [N1, N2], since: 2 });
    expect(pair(state, N1, N2).points).toBe(45);
    expect(ofType(events, 'war-declared').map(e => e.nationId)).toEqual([N1, N2]);
  });

  it('FR-167 hostilities are open only from the war\'s first turn (warActive, for the M9 attack rule)', () => {
    const s = setPair(continent(), N1, ARVELIA, { war: { aggressors: [N1], since: 2 } });

    expect(warActive(s, N1, ARVELIA)).toBe(false);
    expect(warActive({ ...s, turn: 2 }, N1, ARVELIA)).toBe(true);
    expect(warActive({ ...s, turn: 2 }, ARVELIA, N1)).toBe(true);
    expect(warActive({ ...continent(), turn: 2 }, N1, ARVELIA)).toBe(false);
  });
});

describe('FR-168 war and broken treaties move relations', () => {
  it('FR-168 the example: Testland declares war on Arvelia: Arvelia 30 -> 0; Sundmark, Lorran and Pellis 30 -> 25; Valdoria stays 40', () => {
    const { state, events } = endTurn(order(continent(), propose(N1, 'war', ARVELIA)));

    expect(points(state, N1, ARVELIA)).toBe(0);
    expect([SUNDMARK, LORRAN, PELLIS].map(m => points(state, N1, m))).toEqual([25, 25, 25]);
    expect(points(state, N1, N2)).toBe(40);
    expect([ARVELIA, SUNDMARK, LORRAN, PELLIS].map(m => points(state, N2, m))).toEqual([30, 30, 30, 30]);
    const changes = ofType(events, 'relation-changed');
    expect(changes).toHaveLength(4);
    expect(changes).toEqual(expect.arrayContaining([
      { type: 'relation-changed', nationId: N1, otherId: ARVELIA, from: 3, to: 0 },
      { type: 'relation-changed', nationId: N1, otherId: SUNDMARK, from: 3, to: 2 },
      { type: 'relation-changed', nationId: N1, otherId: LORRAN, from: 3, to: 2 },
      { type: 'relation-changed', nationId: N1, otherId: PELLIS, from: 3, to: 2 },
    ]));
  });

  it('FR-168 breaking a pact costs the aggressor 20 more with every other country', () => {
    const s = setPair(embassy(continent()), N1, ARVELIA, { pact: true, points: 40 });

    const { state } = endTurn(order(s, propose(N1, 'war', ARVELIA)));

    expect(points(state, N1, ARVELIA)).toBe(0);
    expect(points(state, N1, N2)).toBe(20);
    expect([SUNDMARK, LORRAN, PELLIS].map(m => points(state, N1, m))).toEqual([5, 5, 5]);
  });

  it('FR-168 breaking an alliance costs the aggressor 20 more with every other country (no minor penalty: the target is a Great Power)', () => {
    const s = setPair(continent(), N1, N2, { alliance: true, points: 70 });

    const { state } = endTurn(order(s, propose(N1, 'war', N2)));

    expect(points(state, N1, N2)).toBe(30);
    expect([ARVELIA, SUNDMARK, LORRAN, PELLIS].map(m => points(state, N1, m))).toEqual([10, 10, 10, 10]);
    expect([ARVELIA, SUNDMARK].map(m => points(state, N2, m))).toEqual([30, 30]);
  });

  it.each([
    [85, 30, 'level 8: a friend of the victim, -10'],
    [75, 30, 'level 7: a friend of the victim, -10'],
    [65, 40, 'level 6: no change'],
    [30, 40, 'level 3: no change'],
    [15, 45, 'level 1: an enemy of the victim, +5'],
    [5, 45, 'level 0: an enemy of the victim, +5'],
  ])('FR-168 Valdoria at %i points with Arvelia: Testland and Valdoria end at %i (%s)', (valdoriaArvelia, expected) => {
    const s = setPair(continent(), N2, ARVELIA, { points: valdoriaArvelia });

    const { state } = endTurn(order(s, propose(N1, 'war', ARVELIA)));

    expect(points(state, N1, N2)).toBe(expected);
  });

  it('FR-168 FR-172 the points stay within 0 to 89: 87 + 5 -> 89', () => {
    const s = setPair(setPair(continent(), N2, ARVELIA, { points: 5 }), N1, N2, { points: 87 });

    const { state } = endTurn(order(s, propose(N1, 'war', ARVELIA)));

    expect(points(state, N1, N2)).toBe(89);
    expect(points(state, N1, ARVELIA)).toBe(0);
  });
});

describe('FR-169 peace', () => {
  it('FR-169 FR-180 a minor always accepts peace in the same End Turn; relations stay, consulates and embassies are not restored', () => {
    const s = order(warWith({ ...continent(), turn: 3 }, ARVELIA), propose(N1, 'peace', ARVELIA));

    const { state, events } = endTurn(s);

    expect(pair(state, N1, ARVELIA).war).toBeUndefined();
    expect(pair(state, N1, ARVELIA)).toMatchObject({ points: 0, consulates: [], embassies: [] });
    expect(events).toEqual([{ type: 'overture-done', nationId: N1, overture: 'peace', targetId: ARVELIA }]);
  });

  it('FR-169 every attack intent between the two that turn is dropped, with attacks-cancelled; others stay', () => {
    let s = order(warWith(warWith(continent(), ARVELIA), SUNDMARK), propose(N1, 'peace', ARVELIA));
    s = addIntent(s, { kind: 'attack', nationId: N1, targetId: ARVELIA });
    s = addIntent(s, { kind: 'attack', nationId: N1, targetId: SUNDMARK });
    const events: GameEvent[] = [];

    const next = diplomacySystem(deepFreeze(s), createTurnContext({ turn: s.turn, seed: s.seed, emit: e => events.push(e) }));

    expect(next.intents.filter(i => i.kind === 'attack').map(i => i.targetId)).toEqual([SUNDMARK]);
    expect(events).toContainEqual({ type: 'attacks-cancelled', nationId: N1, targetId: ARVELIA, count: 1 });
  });

  it('FR-169 FR-174 FR-180 peace proposed to Valdoria (scripted) in a war since turn 5: refused on turn 10, accepted on turn 11', () => {
    const atWar = setPair({ ...continent(), turn: 10 }, N1, N2, { war: { aggressors: [N1], since: 5 }, consulates: [], embassies: [] });

    const refused = endTurn(order(atWar, propose(N1, 'peace', N2)));

    expect(pair(refused.state, N1, N2).war).toMatchObject({ aggressors: [N1], since: 5 });
    expect(refused.events).toEqual([{ type: 'overture-refused', nationId: N1, overture: 'peace', targetId: N2 }]);

    const accepted = endTurn(order(refused.state, propose(N1, 'peace', N2)));

    expect(pair(accepted.state, N1, N2).war).toBeUndefined();
    expect(pair(accepted.state, N1, N2)).toMatchObject({ consulates: [], embassies: [] });
    expect(ofType(accepted.events, 'overture-done')).toEqual([
      { type: 'overture-done', nationId: N1, overture: 'peace', targetId: N2 },
      { type: 'overture-done', nationId: N2, overture: 'peace', targetId: N1 },
    ]);
  });

  it('FR-169 to the human it becomes a proposal; accepted on the next turn, the war ends', () => {
    const first = endTurn(warWith(continent(), N2), { [N2]: [propose(N2, 'peace', N1)] });

    expect(first.state.proposals).toEqual([{ id: 'proposal-1-1', fromId: N2, toId: N1, kind: 'peace', turn: 1 }]);
    expect(first.events).toEqual([{ type: 'proposal-received', nationId: N1, fromId: N2, proposalId: 'proposal-1-1', kind: 'peace' }]);

    const { state } = endTurn(order(first.state, answer('proposal-1-1', true)));

    expect(pair(state, N1, N2).war).toBeUndefined();
    expect(state.proposals).toEqual([]);
  });
});

describe('FR-170 grants', () => {
  it.each([
    [1000, 2],
    [3000, 4],
    [5000, 6],
    [10000, 8],
  ] as const)('FR-170 FR-180 a $%i grant once: paid when ordered, +%i points at End Turn, no lock', (amount, gain) => {
    const s = order(embassy(continent()), grant(amount));
    expect(treasury(s, N1)).toBe(10000 - amount);

    const { state, events } = endTurn(s);

    expect(points(state, N1, ARVELIA)).toBe(30 + gain);
    expect(pair(state, N1, ARVELIA).lockedGrants).toEqual({});
    expect(ofType(events, 'grant-paid')).toEqual([{ type: 'grant-paid', nationId: N1, targetId: ARVELIA, amount }]);
    expect(treasury(state, N1)).toBe(10000 - amount);
  });

  const lockedAfterOneTurn = () => endTurn(order(embassy(continent()), grant(3000, true)));

  it('FR-170 FR-180 a locked grant repeats in every later diplomacy phase while the treasury holds the amount', () => {
    const first = lockedAfterOneTurn();
    expect(points(first.state, N1, ARVELIA)).toBe(34);
    expect(pair(first.state, N1, ARVELIA).lockedGrants).toEqual({ [N1]: 3000 });
    expect(treasury(first.state, N1)).toBe(7000);

    const { state, events } = endTurn(first.state);

    expect(points(state, N1, ARVELIA)).toBe(38);
    expect(treasury(state, N1)).toBe(4000);
    expect(ofType(events, 'grant-paid')).toEqual([{ type: 'grant-paid', nationId: N1, targetId: ARVELIA, amount: 3000 }]);
    expect(pair(state, N1, ARVELIA).lockedGrants).toEqual({ [N1]: 3000 });
  });

  it('FR-170 the first turn it cannot be paid, the locked grant ends with grant-stopped', () => {
    const { state, events } = endTurn(setTreasury(lockedAfterOneTurn().state, N1, 2999));

    expect(pair(state, N1, ARVELIA).lockedGrants).toEqual({});
    expect(treasury(state, N1)).toBe(2999);
    expect(points(state, N1, ARVELIA)).toBe(34);
    expect(events).toEqual([{ type: 'grant-stopped', nationId: N1, targetId: ARVELIA, amount: 3000, reason: 'insufficient-funds' }]);
  });

  it('FR-170 FR-161 FR-180 withdrawn, the locked grant ends at that End Turn with no payment and no refund', () => {
    const { state, events } = endTurn(order(lockedAfterOneTurn().state, withdraw('grant')));

    expect(pair(state, N1, ARVELIA).lockedGrants).toEqual({});
    expect(treasury(state, N1)).toBe(7000);
    expect(points(state, N1, ARVELIA)).toBe(34);
    expect(events).toEqual([{ type: 'grant-stopped', nationId: N1, targetId: ARVELIA, amount: 3000, reason: 'withdrawn' }]);
  });

  it('FR-170 a new locked grant replaces the standing one and is paid once that turn', () => {
    const { state, events } = endTurn(order(lockedAfterOneTurn().state, grant(1000, true)));

    expect(pair(state, N1, ARVELIA).lockedGrants).toEqual({ [N1]: 1000 });
    expect(treasury(state, N1)).toBe(6000);
    expect(ofType(events, 'grant-paid')).toEqual([{ type: 'grant-paid', nationId: N1, targetId: ARVELIA, amount: 1000 }]);
  });
});

describe('FR-171 trade policy', () => {
  it('FR-171 FR-180 a subsidy is set in that End Turn\'s diplomacy phase, and 0 removes it', () => {
    const first = endTurn(order(setPair(continent(), N1, ARVELIA, { consulates: [N1] }), policy(10)));
    expect(pair(first.state, N1, ARVELIA).subsidies).toEqual({ [N1]: 10 });

    const { state } = endTurn(order(first.state, policy(0)));

    expect(pair(state, N1, ARVELIA).subsidies).toEqual({});
  });

  it('FR-171 FR-180 a boycott needs no consulate; lifted, it is removed', () => {
    const first = endTurn(order(continent(), policy(0, true)));
    expect(pair(first.state, N1, ARVELIA).boycotts).toEqual([N1]);

    const { state } = endTurn(order(first.state, policy(0, false)));

    expect(pair(state, N1, ARVELIA).boycotts).toEqual([]);
  });

  it('FR-171 the policy is already set when the trade phase of that turn runs', () => {
    const s = order(setPair(continent(), N1, ARVELIA, { consulates: [N1] }), policy(25, true));

    const next = diplomacySystem(s, createTurnContext({ turn: s.turn, seed: s.seed }));

    expect(pair(next, N1, ARVELIA)).toMatchObject({ subsidies: { [N1]: 25 }, boycotts: [N1] });
  });

  it('FR-161 FR-180 a withdrawn trade policy changes nothing at End Turn', () => {
    const s = order(order(continent(), policy(0, true)), withdraw('trade-policy'));

    const { state } = endTurn(s);

    expect(pair(state, N1, ARVELIA).boycotts).toEqual([]);
  });

  it('FR-161 FR-180 a withdrawn consulate is refunded and not established', () => {
    const s = order(order(continent(), propose(N1, 'consulate', ARVELIA)), withdraw('consulate'));
    expect(treasury(s, N1)).toBe(10000);

    const { state, events } = endTurn(s);

    expect(pair(state, N1, ARVELIA).consulates).toEqual([]);
    expect(events).toEqual([]);
  });
});

describe('FR-172 relation points', () => {
  it('FR-172 38 points and a $1,000 grant -> 40: one relation-changed, from 3 (yellow) to 4 (beige)', () => {
    const s = order(setPair(embassy(continent()), N1, ARVELIA, { points: 38 }), grant(1000));

    const { state, events } = endTurn(s);

    expect(points(state, N1, ARVELIA)).toBe(40);
    expect(ofType(events, 'relation-changed')).toEqual([{ type: 'relation-changed', nationId: N1, otherId: ARVELIA, from: 3, to: 4 }]);
  });

  it('FR-172 a pair of two Great Powers: the event for each of them', () => {
    const s = order(setPair(continent(), N1, N2, { points: 38 }), grant(1000, false, N2));

    const { events } = endTurn(s);

    expect(ofType(events, 'relation-changed')).toEqual([
      { type: 'relation-changed', nationId: N1, otherId: N2, from: 3, to: 4 },
      { type: 'relation-changed', nationId: N2, otherId: N1, from: 3, to: 4 },
    ]);
  });

  it('FR-172 no event when the level stays (30 + 2 = 32)', () => {
    const { events } = endTurn(order(embassy(continent()), grant(1000)));

    expect(ofType(events, 'relation-changed')).toEqual([]);
  });

  it('FR-172 the points never go above 89: 85 and a $10,000 grant -> 89', () => {
    const { state } = endTurn(order(setPair(embassy(continent()), N1, ARVELIA, { points: 85 }), grant(10000)));

    expect(points(state, N1, ARVELIA)).toBe(89);
  });

  it('FR-172 nothing decays: five turns with no orders leave the diplomacy as it was', () => {
    const start = setPair(setPair(continent(), N1, ARVELIA, { points: 55 }), N1, N2, { points: 12 });
    let s = start;
    for (let i = 0; i < 5; i++) s = endTurn(s).state;

    expect(s.diplomacy).toEqual(start.diplomacy);
  });
});

describe('FR-173 simultaneous and fair', () => {
  it('FR-173 the kinds resolve in order: a war declared this turn makes this turn\'s consulate with the same country fail, refunded', () => {
    const s = order(order(continent(), propose(N1, 'consulate', ARVELIA)), propose(N1, 'war', ARVELIA));
    expect(treasury(s, N1)).toBe(9500);

    const { state, events } = endTurn(s);

    expect(pair(state, N1, ARVELIA).consulates).toEqual([]);
    expect(treasury(state, N1)).toBe(10000);
    expect(events).toContainEqual({ type: 'overture-failed', nationId: N1, overture: 'consulate', targetId: ARVELIA, reason: 'at-war', refund: 500 });
  });

  it('FR-173 an alliance with a country that declared war on the proposer this turn fails (at-war), not refused', () => {
    const s = order(setPair(continent(), N1, N2, { points: 80 }), propose(N1, 'alliance', N2));

    const { state, events } = endTurn(s, { [N2]: [propose(N2, 'war', N1)] });

    expect(pair(state, N1, N2).alliance).toBe(false);
    expect(events).toContainEqual({ type: 'overture-failed', nationId: N1, overture: 'alliance', targetId: N2, reason: 'at-war', refund: 0 });
    expect(ofType(events, 'overture-refused')).toEqual([]);
  });

  it('FR-173 a grant to a country the granter declared war on this turn fails and is refunded', () => {
    const s = order(order(embassy(continent()), grant(5000)), propose(N1, 'war', ARVELIA));

    const { state, events } = endTurn(s);

    expect(treasury(state, N1)).toBe(10000);
    expect(points(state, N1, ARVELIA)).toBe(0);
    expect(events).toContainEqual({ type: 'overture-failed', nationId: N1, overture: 'grant', targetId: ARVELIA, reason: 'at-war', refund: 5000 });
  });

  it.each([
    [1, [N1, N2]],
    [2, [N2, N1]],
  ])('FR-173 FR-152 within a kind the intents go in intentOrder: on turn %i the consulates open in the order %j', (turn, expected) => {
    let s: GameState = { ...continent(), turn };
    s = order(s, propose(N1, 'consulate', SUNDMARK));
    s = order(s, propose(N2, 'consulate', SUNDMARK));

    const { events } = endTurn(s);

    expect(ofType(events, 'overture-done').map(e => e.nationId)).toEqual(expected);
  });

  it('FR-173 swapping the order of state.nations gives the same diplomacy, treasuries and set of events', () => {
    const start = embassy(embassy(continent(), N1, ARVELIA), N2, ARVELIA);
    const orders: OrdersByNation = {
      [N1]: [propose(N1, 'consulate', SUNDMARK), grant(1000, true, ARVELIA, N1), propose(N1, 'war', N2)],
      [N2]: [propose(N2, 'consulate', SUNDMARK), grant(3000, false, ARVELIA, N2), propose(N2, 'war', N1)],
    };
    const swappedStart = { ...start, nations: [...start.nations].reverse() };

    const normal = resolveTurn(start, orders, start.seed);
    const swapped = resolveTurn(swappedStart, orders, start.seed);

    const byId = (s: GameState) => Object.fromEntries(s.nations.map(n => [n.id, n.treasury]));
    const eventSet = (events: GameEvent[]) => events.map(e => JSON.stringify(e)).sort();
    expect(swapped.state.diplomacy).toEqual(normal.state.diplomacy);
    expect(byId(swapped.state)).toEqual(byId(normal.state));
    expect(eventSet(swapped.events)).toEqual(eventSet(normal.events));
    // The scenario did what it says: both consulates, both grants, one war with both as aggressors, nothing refused.
    expect(pair(normal.state, N1, SUNDMARK).consulates).toEqual([N1]);
    expect(pair(normal.state, N2, SUNDMARK).consulates).toEqual([N2]);
    expect([points(normal.state, N1, ARVELIA), points(normal.state, N2, ARVELIA)]).toEqual([32, 34]);
    expect(pair(normal.state, N1, N2).war).toEqual({ aggressors: [N1, N2], since: 2 });
    expect(normal.events.filter(e => e.type === 'order-rejected' || e.type === 'overture-failed')).toEqual([]);
  });

  it('FR-173 FR-176 every diplomacy event names the acting Great Power as nationId', () => {
    const start = embassy(continent());
    const { events } = endTurn(order(order(start, grant(1000, true)), propose(N1, 'war', N2)), { [N2]: [propose(N2, 'consulate', ARVELIA)] });

    expect(events.length).toBeGreaterThan(3);
    for (const e of events) expect([N1, N2]).toContain((e as { nationId?: string }).nationId);
  });

  it('FR-013 FR-173 the diplomacy phase leaves a deep-frozen input unchanged', () => {
    let s = setPair(embassy(continent()), N1, N2, { lockedGrants: { [N1]: 1000 } });
    for (const o of [propose(N1, 'consulate', SUNDMARK), propose(N1, 'pact', ARVELIA), grant(3000, true), propose(N1, 'war', LORRAN), policy(0, true, PELLIS)]) s = order(s, o);
    const frozen = deepFreeze(s);
    const snapshot = structuredClone(frozen);

    const next = diplomacySystem(frozen, createTurnContext({ turn: frozen.turn, seed: frozen.seed }));

    expect(frozen).toEqual(snapshot);
    expect(next).not.toBe(frozen);
  });
});
