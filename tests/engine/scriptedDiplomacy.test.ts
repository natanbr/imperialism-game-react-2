// FR-174: how a scripted Great Power answers alliance and peace, and when it proposes peace itself; FR-181:
// at peace it orders nothing new, so the v1 and M5 baselines hold. The strength test (FR-204) sums regiments;
// armies come in M8, so on every M6 game both strengths are 0 and condition (b) never fires.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { pairKey } from '@/engine/diplomacy/relations';
import { militaryStrength } from '@/engine/diplomacy/queries';
import { acceptsAlliance, acceptsPeace, losingWar } from '@/engine/diplomacy/scriptedAnswers';
import type { Army } from '@/types/Army';
import type { ProvinceCapture, War } from '@/types/Diplomacy';
import type { GameState } from '@/types/GameState';
import { RegimentCategory, type Unit } from '@/types/Unit';
import { N1, N2, setPair } from './fixtures';

const ARVELIA = 'minor-1';
const DIPLOMACY_KINDS = ['proposeOverture', 'giveGrant', 'setTradePolicy', 'withdrawOverture', 'answerProposal'];
/** The continent with the world market: in "partners" the scripted player also orders consulates (FR-245, scriptedTrade.test.ts). */
const continent = (turn = 1): GameState => ({ ...newGame({ seed: 1, world: 'continent', market: 'world' }), turn });

const regiment = (category: RegimentCategory, fpNormal: number, health: number): Unit => ({
  id: `${category}-${fpNormal}-${health}`,
  category,
  era: 1,
  health,
  experience: 0,
  stats: { fpNormal, fpMelee: 1, range: 1, defense: 1, defenseEntrenched: 1, move: 1, armamentsCost: 1 },
});
const army = (ownerNationId: string, units: Unit[]): Army => ({
  id: `army-${ownerNationId}-${units.length}`,
  name: 'Army',
  ownerNationId,
  locationProvinceId: 'province-nation-1-sw',
  units,
  morale: 100,
  supply: 100,
});
const withArmies = (s: GameState, ...armies: Army[]): GameState => ({ ...s, armies: [...s.armies, ...armies] });
/** Valdoria and Testland at war since `since` (Testland the aggressor), with the captures given. */
const war = (s: GameState, since: number, captures: ProvinceCapture[] = [], extra: Partial<War> = {}): GameState =>
  setPair(s, N1, N2, { war: { aggressors: [N1], since, captures, ...extra }, consulates: [], embassies: [], points: 0 });
/** A province of `fromId` taken by `toId` on `turn` (written by M9's conquest). */
const capture = (fromId: string, toId: string, turn: number): ProvinceCapture => ({ provinceId: `province-${fromId}-nw`, fromId, toId, turn });
const diplomacyOrders = (orders: Order[]) => orders.filter(o => DIPLOMACY_KINDS.includes(o.kind));

describe('FR-174 FR-204 militaryStrength', () => {
  it('FR-174 is 0 for every country on a new game of either world (no armies before M8)', () => {
    for (const s of [continent(), newGame({ seed: 1, world: 'two-islands' })]) {
      for (const id of [...s.nations.map(n => n.id), ...s.minorNations.map(m => m.id)]) expect(militaryStrength(s, id)).toBe(0);
    }
  });

  it('FR-174 sums FPN x health / 100 over the country\'s regiments, militia left out', () => {
    const s = withArmies(
      continent(),
      army(N1, [regiment(RegimentCategory.RegularInfantry, 4, 100), regiment(RegimentCategory.LightArtillery, 6, 50), regiment(RegimentCategory.Militia, 2, 100)]),
      army(N2, [regiment(RegimentCategory.RegularInfantry, 4, 100)])
    );

    expect(militaryStrength(s, N1)).toBe(7);
    expect(militaryStrength(s, N2)).toBe(4);
  });
});

describe('FR-174 a scripted Great Power answers an alliance', () => {
  it.each([
    [59, false],
    [60, true],
    [75, true],
    [89, true],
  ])('FR-174 at %i points with the proposer it accepts: %s', (points, expected) => {
    expect(acceptsAlliance(setPair(continent(), N1, N2, { points }), N2, N1)).toBe(expected);
  });

  it('FR-174 never while at war, whatever the level', () => {
    expect(acceptsAlliance(setPair(continent(), N1, N2, { points: 89, war: { aggressors: [N1], since: 1 } }), N2, N1)).toBe(false);
  });
});

describe('FR-174 a scripted Great Power answers peace', () => {
  it('FR-174 (c) the example: war since turn 5, proposed on turn 10 -> refused; on turn 11 -> accepted', () => {
    expect(acceptsPeace(war(continent(10), 5), N2, N1, 10)).toBe(false);
    expect(acceptsPeace(war(continent(11), 5), N2, N1, 11)).toBe(true);
  });

  it('FR-174 (c) a province that changed hands between the two in the last 3 turns holds it back', () => {
    // Valdoria took a province of Testland's: not (a) for Testland's proposal, but it blocks (c).
    expect(acceptsPeace(war(continent(11), 1, [capture(N1, N2, 8)]), N2, N1, 11)).toBe(false);
    expect(acceptsPeace(war(continent(11), 1, [capture(N1, N2, 7)]), N2, N1, 11)).toBe(true);
  });

  it('FR-174 (a) the proposer took one of its provinces in this war: accepted at once', () => {
    expect(acceptsPeace(war(continent(4), 2, [capture(N2, N1, 3)]), N2, N1, 4)).toBe(true);
  });

  it('FR-174 (b) its strength is below the proposer\'s: accepted; above: refused', () => {
    const weaker = withArmies(war(continent(2), 1), army(N1, [regiment(RegimentCategory.RegularInfantry, 4, 100)]));
    const stronger = withArmies(war(continent(2), 1), army(N2, [regiment(RegimentCategory.RegularInfantry, 4, 100)]));

    expect(acceptsPeace(weaker, N2, N1, 2)).toBe(true);
    expect(acceptsPeace(stronger, N2, N1, 2)).toBe(false);
  });

  it('FR-174 in M6 (no armies, no conquest) only (c) can fire: equal strengths of 0 are not "below"', () => {
    expect(acceptsPeace(war(continent(2), 1), N2, N1, 2)).toBe(false);
    expect(acceptsPeace(war(continent(6), 1), N2, N1, 6)).toBe(false);
    expect(acceptsPeace(war(continent(7), 1), N2, N1, 7)).toBe(true);
  });

  it('FR-174 FR-169 (a) through End Turn: Testland, which took a Valdoria province, proposes peace and Valdoria accepts at once', () => {
    const s = war(continent(4), 2, [capture(N2, N1, 3)]);
    const { state, result } = tryApplyOrder(s, { kind: 'proposeOverture', nationId: N1, overture: 'peace', targetId: N2 });
    expect(result).toEqual({ ok: true });

    const next = resolveTurn(state, {}, state.seed).state;

    expect(next.diplomacy[pairKey(N1, N2)].war).toBeUndefined();
  });
});

describe('FR-174 a scripted Great Power proposes peace itself', () => {
  const peace: Order = { kind: 'proposeOverture', nationId: N2, overture: 'peace', targetId: N1 };

  it('FR-174 when (a) the enemy took one of its provinces in this war', () => {
    const s = war(continent(5), 2, [capture(N2, N1, 4)]);

    expect(losingWar(s, N2, N1)).toBe(true);
    expect(diplomacyOrders(scriptedPlayer(s, N2))).toEqual([peace]);
  });

  it('FR-174 when (b) it is the weaker', () => {
    const s = withArmies(war(continent(5), 2), army(N1, [regiment(RegimentCategory.RegularInfantry, 4, 100)]));

    expect(diplomacyOrders(scriptedPlayer(s, N2))).toEqual([peace]);
  });

  it('FR-174 not in a war it is not losing (M6: strengths 0, no conquest), however long it lasts', () => {
    expect(losingWar(war(continent(30), 2), N2, N1)).toBe(false);
    expect(diplomacyOrders(scriptedPlayer(war(continent(30), 2), N2))).toEqual([]);
  });

  it.each([
    [2, []],
    [3, [{ kind: 'proposeOverture', nationId: N2, overture: 'peace', targetId: N1 }]],
  ])('FR-174 at most once every 3 turns: last offer %i turns ago -> %j', (ago, expected) => {
    const s = war(continent(10), 2, [capture(N2, N1, 4)], { lastPeaceOffer: { [N2]: 10 - ago } });

    expect(diplomacyOrders(scriptedPlayer(s, N2))).toEqual(expected);
  });

  it('FR-174 the war records the turn of each peace offer, so the next one waits', () => {
    const s = war(continent(5), 2, [capture(N2, N1, 4)]);

    const next = resolveTurn(s, { [N2]: scriptedPlayer(s, N2) }, s.seed).state;

    expect(next.diplomacy[pairKey(N1, N2)].war?.lastPeaceOffer).toEqual({ [N2]: 5 });
    expect(next.proposals).toEqual([{ id: 'proposal-5-1', fromId: N2, toId: N1, kind: 'peace', turn: 5 }]);
    expect(diplomacyOrders(scriptedPlayer({ ...next, proposals: [] }, N2))).toEqual([]);
  });

  it('FR-174 only to a Great Power: never to a minor it is at war with', () => {
    const s = setPair(continent(5), N2, ARVELIA, { war: { aggressors: [N2], since: 2, captures: [capture(N2, ARVELIA, 4)] } });

    expect(diplomacyOrders(scriptedPlayer(s, N2))).toEqual([]);
  });
});

describe('FR-174 FR-181 at peace the scripted player orders exactly what it did before M6', () => {
  // FR-245: on the continent with its partners market the scripted player orders consulates (tests/engine/scriptedTrade.test.ts);
  // with the world market it orders exactly as before M6.
  it.each(['two-islands', 'continent'] as const)('FR-181 on %s (world market), ten turns of nation 2: no diplomacy order', world => {
    let s = newGame({ seed: 1, world, market: 'world' });
    const ordered: Order[] = [];
    for (let i = 0; i < 10; i++) {
      const orders = scriptedPlayer(s, N2);
      ordered.push(...orders);
      s = resolveTurn(s, { [N2]: orders }, s.seed).state;
    }

    expect(ordered.length).toBeGreaterThan(0);
    expect(diplomacyOrders(ordered)).toEqual([]);
  });
});
