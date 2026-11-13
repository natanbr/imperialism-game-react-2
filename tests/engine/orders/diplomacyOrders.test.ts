// FR-161: the five diplomacy orders. Applying one stores an intent (FR-152) and changes nothing of the
// target; a consulate, an embassy and a grant are paid from the treasury when ordered; a withdrawal takes
// this turn's intent back with its cost in full; a second grant or trade policy for a target replaces the
// first. The view helpers the Diplomacy screen reads (FR-175, FR-177) are checked here too.
import { describe, it, expect } from 'vitest';
import { tryApplyOrder } from '@/engine/orders/apply';
import { ORDER_KINDS, type Order } from '@/engine/orders/Order';
import { newGame } from '@/engine/newGame';
import { pairKey } from '@/engine/diplomacy/relations';
import { diplomacyIntentsOf, pendingProposalsFor, proposalAnswer, proposalsOf } from '@/engine/diplomacy/queries';
import type { GameState } from '@/types/GameState';
import { deepFreeze, N1, N2, setPair, setTreasury, treasury } from '../fixtures';

const ARVELIA = 'minor-1';
const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const withEmbassy = (s: GameState, minor = ARVELIA): GameState => setPair(s, N1, minor, { consulates: [N1], embassies: [N1] });
const atWar = (s: GameState, other: string): GameState => setPair(s, N1, other, { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [] });
/** A proposal of Valdoria's to Testland, made on turn 1 and answered on turn 2. */
const withProposal = (s: GameState): GameState => ({
  ...s,
  turn: 2,
  proposals: [{ id: 'proposal-1-1', fromId: N2, toId: N1, kind: 'alliance', turn: 1 }],
});

/** Applies an order that must be accepted; the deep-frozen input stays unchanged (FR-013). */
function run(state: GameState, order: Order): GameState {
  const frozen = deepFreeze(state);
  const snapshot = structuredClone(frozen);
  const { state: next, result } = tryApplyOrder(frozen, order);
  expect(result).toEqual({ ok: true });
  expect(frozen).toEqual(snapshot);
  return next;
}

describe('FR-161 the diplomacy orders', () => {
  it('FR-161 the five kinds are order kinds', () => {
    expect(ORDER_KINDS).toEqual(expect.arrayContaining(['proposeOverture', 'giveGrant', 'setTradePolicy', 'withdrawOverture', 'answerProposal']));
  });

  it('FR-161 a consulate stores an intent, takes $500 at once and changes nothing of the target', () => {
    const before = continent();

    const s = run(before, { kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: ARVELIA });

    expect(s.intents).toEqual([{ id: 'intent-1-1', kind: 'consulate', nationId: N1, turn: 1, targetId: ARVELIA, cost: 500 }]);
    expect(treasury(s, N1)).toBe(9500);
    expect(s.diplomacy).toEqual(before.diplomacy);
    expect(s.minorNations).toEqual(before.minorNations);
    expect({ ...s, intents: [], nations: before.nations }).toEqual(before);
  });

  it('FR-161 an embassy is paid $5,000 when ordered (cash, not credit)', () => {
    const s = run(setPair(continent(), N1, ARVELIA, { consulates: [N1] }), { kind: 'proposeOverture', nationId: N1, overture: 'embassy', targetId: ARVELIA });

    expect(s.intents).toEqual([{ id: 'intent-1-1', kind: 'embassy', nationId: N1, turn: 1, targetId: ARVELIA, cost: 5000 }]);
    expect(treasury(s, N1)).toBe(5000);
  });

  it.each<[string, (s: GameState) => GameState, Order]>([
    ['a pact', withEmbassy, { kind: 'proposeOverture', nationId: N1, overture: 'pact', targetId: ARVELIA }],
    ['an alliance', s => s, { kind: 'proposeOverture', nationId: N1, overture: 'alliance', targetId: N2 }],
    ['a declaration of war', s => s, { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA }],
    ['peace', s => atWar(s, ARVELIA), { kind: 'proposeOverture', nationId: N1, overture: 'peace', targetId: ARVELIA }],
  ])('FR-161 %s is free: an intent with cost 0, the treasury and the diplomacy unchanged', (_name, setup, order) => {
    const before = setup(continent());

    const s = run(before, order);

    const { overture, targetId } = order as Extract<Order, { kind: 'proposeOverture' }>;
    expect(s.intents).toEqual([{ id: 'intent-1-1', kind: overture, nationId: N1, turn: 1, targetId, cost: 0 }]);
    expect(treasury(s, N1)).toBe(10000);
    expect(s.diplomacy).toEqual(before.diplomacy);
  });

  it('FR-161 a grant is paid when ordered and stored as an intent; the standing locked grants do not change', () => {
    const before = withEmbassy(continent());

    const s = run(before, { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 3000, locked: true });

    expect(s.intents).toEqual([{ id: 'intent-1-1', kind: 'grant', nationId: N1, turn: 1, targetId: ARVELIA, amount: 3000, locked: true, cost: 3000 }]);
    expect(treasury(s, N1)).toBe(7000);
    expect(s.diplomacy).toEqual(before.diplomacy);
  });

  it('FR-161 a trade policy is free and stored as an intent', () => {
    const before = setPair(continent(), N1, ARVELIA, { consulates: [N1] });

    const s = run(before, { kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 10, boycott: true });

    expect(s.intents).toEqual([{ id: 'intent-1-1', kind: 'trade-policy', nationId: N1, turn: 1, targetId: ARVELIA, subsidyPercent: 10, boycott: true }]);
    expect(treasury(s, N1)).toBe(10000);
    expect(s.diplomacy).toEqual(before.diplomacy);
  });

  it('FR-161 a second grant for the same target in a turn replaces the first: refund, then charge', () => {
    let s = run(withEmbassy(continent()), { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 1000, locked: false });
    s = run(s, { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 5000, locked: true });

    expect(s.intents).toEqual([expect.objectContaining({ kind: 'grant', targetId: ARVELIA, amount: 5000, locked: true, cost: 5000 })]);
    expect(treasury(s, N1)).toBe(5000);
  });

  it('FR-161 a replacing grant may use the money the first one gives back', () => {
    let s = run(setTreasury(withEmbassy(continent()), N1, 5000), { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 3000, locked: false });
    s = run(s, { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 5000, locked: false });

    expect(treasury(s, N1)).toBe(0);
    expect(s.intents).toHaveLength(1);
  });

  it('FR-161 a second trade policy for the same target in a turn replaces the first', () => {
    let s = run(setPair(continent(), N1, ARVELIA, { consulates: [N1] }), { kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 10, boycott: false });
    s = run(s, { kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 25, boycott: true });

    expect(s.intents).toEqual([expect.objectContaining({ kind: 'trade-policy', subsidyPercent: 25, boycott: true })]);
  });

  it('FR-161 withdrawing an overture removes this turn\'s intent and refunds its cost in full', () => {
    const ordered = run(setPair(continent(), N1, ARVELIA, { consulates: [N1] }), { kind: 'proposeOverture', nationId: N1, overture: 'embassy', targetId: ARVELIA });
    expect(treasury(ordered, N1)).toBe(5000);

    const s = run(ordered, { kind: 'withdrawOverture', nationId: N1, overture: 'embassy', targetId: ARVELIA });

    expect(s.intents).toEqual([]);
    expect(treasury(s, N1)).toBe(10000);
  });

  it('FR-161 withdrawing a grant ordered this turn refunds it; withdrawing a trade policy removes it', () => {
    let s = run(withEmbassy(continent()), { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 10000, locked: false });
    s = run(s, { kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 5, boycott: false });
    s = run(s, { kind: 'withdrawOverture', nationId: N1, overture: 'grant', targetId: ARVELIA });

    expect(treasury(s, N1)).toBe(10000);
    expect(s.intents.map(i => i.kind)).toEqual(['trade-policy']);

    s = run(s, { kind: 'withdrawOverture', nationId: N1, overture: 'trade-policy', targetId: ARVELIA });
    expect(s.intents).toEqual([]);
  });

  it('FR-161 withdrawing "grant" with no grant ordered this turn ends a standing locked grant from End Turn: a stop intent, no refund', () => {
    const before = setPair(withEmbassy(continent()), N1, ARVELIA, { lockedGrants: { [N1]: 1000 } });

    const s = run(before, { kind: 'withdrawOverture', nationId: N1, overture: 'grant', targetId: ARVELIA });

    expect(s.intents).toEqual([{ id: 'intent-1-1', kind: 'grant-stop', nationId: N1, turn: 1, targetId: ARVELIA }]);
    expect(treasury(s, N1)).toBe(10000);
    expect(s.diplomacy[pairKey(N1, ARVELIA)].lockedGrants).toEqual({ [N1]: 1000 });
  });

  it('FR-161 an answer stores an intent; a second answer to the same proposal replaces the first', () => {
    let s = run(withProposal(continent()), { kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: true });
    expect(s.intents).toEqual([{ id: 'intent-2-1', kind: 'answer', nationId: N1, turn: 2, proposalId: 'proposal-1-1', accept: true }]);
    expect(s.diplomacy).toEqual(continent().diplomacy);

    s = run(s, { kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: false });
    expect(s.intents).toEqual([expect.objectContaining({ kind: 'answer', proposalId: 'proposal-1-1', accept: false })]);
    expect(proposalsOf(s)).toHaveLength(1);
  });
});

describe('FR-161 FR-175 FR-177 view helpers for the Diplomacy screen', () => {
  it('FR-177 diplomacyIntentsOf lists the nation\'s diplomacy intents of this turn with their cost, optionally for one target', () => {
    let s = run(withEmbassy(continent()), { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 1000, locked: true });
    s = run(s, { kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: 'minor-2' });
    s = run(s, { kind: 'proposeOverture', nationId: N2, overture: 'consulate', targetId: 'minor-2' });

    expect(diplomacyIntentsOf(s, N1).map(i => [i.kind, i.targetId, i.cost])).toEqual([
      ['grant', ARVELIA, 1000],
      ['consulate', 'minor-2', 500],
    ]);
    expect(diplomacyIntentsOf(s, N1, 'minor-2').map(i => i.kind)).toEqual(['consulate']);
  });

  it('FR-175 pendingProposalsFor lists the proposals to the nation not yet answered this turn; proposalAnswer reads the answer', () => {
    const s = withProposal(continent());
    expect(pendingProposalsFor(s, N1).map(p => p.id)).toEqual(['proposal-1-1']);
    expect(pendingProposalsFor(s, N2)).toEqual([]);
    expect(proposalAnswer(s, 'proposal-1-1')).toBeUndefined();

    const answered = run(s, { kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: false });

    expect(pendingProposalsFor(answered, N1)).toEqual([]);
    expect(proposalAnswer(answered, 'proposal-1-1')).toBe(false);
  });

  it('FR-166 a new game has no proposal, on both worlds', () => {
    expect(proposalsOf(continent())).toEqual([]);
    expect(proposalsOf(newGame({ seed: 1, world: 'two-islands' }))).toEqual([]);
  });
});
