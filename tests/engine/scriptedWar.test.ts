// M9 scripted war (FR-228, FR-274): at war the scripted Great Power keeps its capital's 4 arms, marches its other
// regiments toward the province that borders the strongest enemy force and attacks when the estimate (FR-226) is 1.5 or
// more; at peace, from turn 10, it picks the weakest bordering minor, recruits until its field army is twice that minor's
// defence, declares war and takes it. M13: from turn 20, with no minor left, the other Great Power (FR-488); in that war
// one province, then peace offers (FR-489). Valdoria (nation-2) is the scripted player throughout.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { campaignTarget, capitalKeep, workersKeptForCampaign } from '@/engine/ai/scriptedWar';
import { cashReserve } from '@/engine/ai/economy';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { councilCell, type CouncilMetEvent } from '@/engine/council/council';
import { transferProvince } from '@/engine/world/provinces';
import { SCRIPTED_WAR } from '@/definisions/combatRules';
import { defenceOf } from '@/engine/army/combat';
import { upkeepOf } from '@/engine/army/armies';
import { fallCapital, takeProvince } from '@/engine/army/conquest';
import { borderThreat } from '@/components/HUD/hudView';
import type { GameState } from '@/types/GameState';
import type { ProvinceCapture } from '@/types/Diplomacy';
import type { RegimentType } from '@/types/Unit';
import { N1, N2, nationOf, setIndustry, setPair, setTreasury, setWarehouse } from './fixtures';
import { addRegiments, ARVELIA, ARVELIA_P, armyIn, clearArmy, continent, NE1, NE2, NW1, NW2, patchRegiment, relocate, SE1, SE2, SW1, SW2 } from './armyFixtures';

const atWar = (s: GameState, a: string, b: string, since = 1): GameState =>
  setPair(s, a, b, { war: { aggressors: [a], since }, consulates: [], embassies: [], pact: false, alliance: false });

/** The orders of FR-228 and FR-274: recruits, marches and attacks, declarations of war and peace. */
const warOrders = (orders: Order[]): Order[] =>
  orders.filter(o => o.kind === 'setRecruitment' || o.kind === 'moveArmy' || (o.kind === 'proposeOverture' && (o.overture === 'war' || o.overture === 'peace')));

const march = (fromProvinceId: string, regimentIds: string[], toProvinceId: string): Order => ({ kind: 'moveArmy', nationId: N2, fromProvinceId, regimentIds, toProvinceId });
// FR-274 tuned (M9 decision card): the campaign raises Cuirassiers (a trained worker and a horse), not Regulars; since
// M13 the first of FR-482's campaign list (SCRIPTED_WAR.regiment was replaced by the lists)
const recruitOne: Order = { kind: 'setRecruitment', nationId: N2, regiment: 'cuirassiers', count: 1 };
const warOn = (targetId: string): Order => ({ kind: 'proposeOverture', nationId: N2, overture: 'war', targetId });

// Valdoria's start army in its capital province (FR-203): 1st and 2nd Regulars and 1st Artillery, 4 arms.
const KEEP = ['regiment-20', 'regiment-21', 'regiment-22'];

/** Testland holds Arvelia's province (hand-built) with these regiments there, Arvelia's militia gone, at war with Valdoria. */
function testlandInArvelia(s: GameState, ids: string[]): GameState {
  return atWar(relocate(clearArmy(transferProvince(s, ARVELIA_P, N1), ARVELIA, ARVELIA_P), ids, ARVELIA_P), N1, N2);
}

describe('FR-228 scripted defence and counter-attack', () => {
  it('FR-228 (a) the capital keeps its oldest regiments up to 4 arms: the start army', () => {
    expect([...capitalKeep(continent('world'), N2)]).toEqual(KEEP);
    const more = addRegiments(continent('world'), N2, SW2, ['regulars']);
    expect([...capitalKeep(more, N2)]).toEqual(KEEP);
  });

  it('FR-228 (a) (b) its other regiments march one province a turn toward its province that borders the strongest enemy force; the keep stays', () => {
    let s = testlandInArvelia(continent('world'), ['regiment-1', 'regiment-2', 'regiment-3']);
    s = addRegiments(addRegiments(s, N2, SE2, ['regulars', 'regulars']), N2, SW2, ['regulars']);
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([
      march(SW2, ['regiment-903'], NW2),
      march(SE2, ['regiment-901', 'regiment-902'], NE2),
    ]);
  });

  /** Valdoria's field: two Regulars in Valdoria North-West at `health`; Testland's 1st Regulars at 80 in Arvelia (defence 10). */
  const facing = (health: number): GameState => {
    let s = testlandInArvelia(continent('world'), ['regiment-1']);
    s = patchRegiment(addRegiments(s, N2, NW2, ['regulars', 'regulars'], health), 'regiment-1', { health: 80 });
    return s;
  };

  it('FR-228 (c) it attacks with all its regiments in the bordering province when the estimate is 1.5 or more: 1.6 attacks, 1.4 waits', () => {
    expect(warOrders(scriptedPlayer(facing(80), N2)).filter(o => o.kind === 'moveArmy')).toEqual([march(NW2, ['regiment-901', 'regiment-902'], ARVELIA_P)]);
    expect(warOrders(scriptedPlayer(facing(70), N2)).filter(o => o.kind === 'moveArmy')).toEqual([]);
  });

  it('FR-228 (c) a province it lost in this war first, then the lowest id', () => {
    // Testland also holds Valdoria North-East (taken in this war) with its 2nd Regulars at 80: estimate 1.6 on both
    let s = clearArmy(transferProvince(facing(80), NE2, N1), N2, NE2);
    s = patchRegiment(relocate(s, ['regiment-2'], NE2), 'regiment-2', { health: 80 });
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([march(NW2, ['regiment-901', 'regiment-902'], ARVELIA_P)]);

    const lost = setPair(s, N1, N2, { war: { aggressors: [N1], since: 1, captures: [{ provinceId: NE2, fromId: N2, toId: N1, turn: 1 }] } });
    expect(warOrders(scriptedPlayer(lost, N2)).filter(o => o.kind === 'moveArmy')).toEqual([march(NW2, ['regiment-901', 'regiment-902'], NE2)]);
  });

  it('FR-228 (a) (c) the capital\'s 4 arms never attack; a regiment beyond them does', () => {
    // Testland holds Valdoria North-West with a weak 1st Regulars (30: defence 3.75); Valdoria's capital borders it.
    let s = atWar(relocate(clearArmy(transferProvince(continent('world'), NW2, N1), N2, NW2), ['regiment-1'], NW2), N1, N2);
    s = patchRegiment(s, 'regiment-1', { health: 30 });
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([]);
    s = addRegiments(s, N2, SW2, ['regulars']);
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([march(SW2, ['regiment-901'], NW2)]);
  });

  it('FR-484 under a threat the recruit of turn t is a field regiment: on turn t+1 it marches toward the province facing the strongest enemy', () => {
    // The audit's invasion (AISIM-02): Testland's start army in Arvelia, next to Valdoria North-West; Valdoria has no
    // untrained worker, 4 trained, 4 horses, $3,118 and an armament, so FR-482 raises Cuirassiers.
    let s = testlandInArvelia(continent('world'), ['regiment-1', 'regiment-2', 'regiment-3']);
    s = setTreasury(setWarehouse(setIndustry(s, N2, { workers: { untrained: 0, trained: 4, expert: 1 } }), N2, { horses: 4, armaments: 1 }), N2, 3118);
    const first = scriptedPlayer(s, N2);
    expect(warOrders(first).filter(o => o.kind === 'setRecruitment')).toEqual([{ kind: 'setRecruitment', nationId: N2, regiment: 'cuirassiers', count: 1 }]);

    const next = resolveTurn(s, { [N2]: first }, s.seed).state;
    const raised = next.armies.find(a => a.ownerId === N2 && a.provinceId === SW2)!.regiments.filter(r => !KEEP.includes(r.id) && r.type === 'cuirassiers');
    expect(raised).toHaveLength(1);
    expect(warOrders(scriptedPlayer(next, N2)).filter(o => o.kind === 'moveArmy')).toContainEqual(march(SW2, [raised[0].id], NW2));
  });

  it('FR-228 (d) FR-174 a province taken in this war makes it propose peace the next turn', () => {
    let s = transferProvince(continent('world'), ARVELIA_P, N1);
    s = atWar(relocate(clearArmy(clearArmy(s, ARVELIA, ARVELIA_P), N2, NW2), ['regiment-1'], ARVELIA_P), N1, N2);
    const { state: next, result } = tryApplyOrder(s, { kind: 'moveArmy', nationId: N1, fromProvinceId: ARVELIA_P, regimentIds: ['regiment-1'], toProvinceId: NW2 });
    expect(result).toEqual({ ok: true });
    const after = resolveTurn(next, {}, next.seed).state;
    expect(after.provinces.find(p => p.id === NW2)!.ownerId).toBe(N1);
    expect(warOrders(scriptedPlayer(after, N2))).toContainEqual({ kind: 'proposeOverture', nationId: N2, overture: 'peace', targetId: N1 });
  });
});

const noop = (): void => undefined;
/** Valdoria took Arvelia on turn 17 (FR-274): its province is Valdoria's, Arvelia its colony; an armament in stock. */
const colonised = (turn: number, s: GameState = continent('world')): GameState => {
  const taken = fallCapital(takeProvince(clearArmy(s, ARVELIA, ARVELIA_P), ARVELIA_P, N2, 17, noop), ARVELIA, N2, 17, noop);
  return setWarehouse({ ...taken, turn }, N2, { armaments: 1 });
};
const REGULARS_5: RegimentType[] = ['regulars', 'regulars', 'regulars', 'regulars', 'regulars'];

describe('FR-488 war on the other Great Power (card Q114 (b); from turn 20 it replaces Q35\'s "never with a Great Power")', () => {
  it('FR-488 turn 19: no target; turn 20 with Arvelia colonised: Testland; turn 20 with Arvelia free: Arvelia first', () => {
    expect(SCRIPTED_WAR.greatPowerFromTurn).toBe(20);
    expect(campaignTarget(colonised(19), N2)).toBeUndefined();
    expect(campaignTarget(colonised(20), N2)).toBe(N1);
    expect(campaignTarget({ ...continent('world'), turn: 20 }, N2)).toBe(ARVELIA);
  });

  // Re-recorded by FR-538 (M13 review ST-01): 5 Regulars (50) declared -> they recruit one more. 50 is not "more than
  // twice" 25, so the Defense Minister's warning (FR-495) never showed before the war; the war now needs what the warning shows.
  it('FR-488 FR-538 a field strength in Arvelia of more than 2 x the defence of Testland North-East (25) declares war: 6 Regulars (60) declare; 5 (50) and 4 (40) recruit one more as in a campaign', () => {
    expect(defenceOf(colonised(20), NE1)).toBe(25);
    expect(warOrders(scriptedPlayer(addRegiments(colonised(20), N2, ARVELIA_P, [...REGULARS_5, 'regulars']), N2))).toEqual([warOn(N1)]);
    expect(warOrders(scriptedPlayer(addRegiments(colonised(20), N2, ARVELIA_P, REGULARS_5), N2))).toEqual([recruitOne]);
    expect(warOrders(scriptedPlayer(addRegiments(colonised(20), N2, ARVELIA_P, REGULARS_5.slice(1)), N2))).toEqual([recruitOne]);
  });

  it('FR-488 not with an alliance, nor within 10 turns of a peace with it: peace on turn 11 -> no target on turn 20, Testland on turn 21', () => {
    expect(campaignTarget(setPair(colonised(20), N1, N2, { alliance: true }), N2)).toBeUndefined();
    expect(campaignTarget(setPair(colonised(20), N1, N2, { peaceTurn: 11 }), N2)).toBeUndefined();
    expect(campaignTarget(setPair(colonised(21), N1, N2, { peaceTurn: 11 }), N2)).toBe(N1);
  });

  // Re-recorded by FR-538 (M13 review ST-01): [40, 50] declared [false, true] -> [40, 50, 60] declare [false, false, true]
  // (the war needs more than twice the defence, what the warning of FR-495 shows).
  it('FR-488 FR-489 FR-538 never for the capital: Testland\'s capital province is left out of the measure, even with no defender in it (40 and 50 do not declare, 60 does)', () => {
    // Valdoria holds Testland North-East (hand-built, at peace), which borders Testland North-West and South-East (25 each) and the capital
    const s = clearArmy(clearArmy(transferProvince(colonised(20), NE1, N2), N1, NE1), N1, SW1);
    expect(defenceOf(s, SW1)).toBe(0);
    const declares = (regiments: RegimentType[]) => warOrders(scriptedPlayer(addRegiments(s, N2, NE1, regiments), N2)).some(o => o.kind === 'proposeOverture');
    expect([declares(REGULARS_5.slice(1)), declares(REGULARS_5), declares([...REGULARS_5, 'regulars'])]).toEqual([false, false, true]);
  });
});

describe('FR-538 (M13 review ST-01) before a war on a Great Power the army gathers in sight, so the warning (FR-495) comes first', () => {
  const REGULARS_6: RegimentType[] = [...REGULARS_5, 'regulars'];
  const SIX = ['regiment-901', 'regiment-902', 'regiment-903', 'regiment-904', 'regiment-905', 'regiment-906'];
  const moves = (s: GameState): Order[] => warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy');

  it('FR-538 at peace with Testland its target, 6 Regulars (60) in Valdoria North-West do not declare: Testland sees no warning yet, so they march to Arvelia, the province that borders Testland North-East', () => {
    const s = addRegiments(colonised(20), N2, NW2, REGULARS_6);
    expect(campaignTarget(s, N2)).toBe(N1);
    expect(borderThreat(s, N1)).toBeUndefined();
    expect(warOrders(scriptedPlayer(s, N2))).toEqual([march(NW2, SIX, ARVELIA_P)]);
  });

  it('FR-538 the same 6 Regulars in Arvelia: Testland sees "60 against our 25" at Testland North-East, so the war declared now comes after the warning; the army stays', () => {
    const s = addRegiments(colonised(20), N2, ARVELIA_P, REGULARS_6);
    expect(borderThreat(s, N1)).toMatchObject({ nationId: N2, provinceId: NE1, strength: 60, defence: 25 });
    expect(warOrders(scriptedPlayer(s, N2))).toEqual([warOn(N1)]);
  });

  it('FR-538 6 Regulars (60) beyond the keep in the capital province: ready, they march toward the front (Valdoria South-West to North-West) and do not declare yet', () => {
    const s = addRegiments(colonised(20), N2, SW2, REGULARS_6);
    expect(warOrders(scriptedPlayer(s, N2))).toEqual([march(SW2, SIX, NW2)]);
  });

  // A field army that marched while short stood at the border for many turns. With both nations scripted (FR-247's games)
  // each one's army at its front raised the defence the other had to beat, so neither declared, both kept recruiting and
  // making armaments, and on seed 2 Testland went to $24 and lost 7 regiments for want of pay (.gate/m13/fix/both-538only.txt).
  it('FR-538 while the campaign is short (1 Regulars beyond the keep: 10 against the more than 50 it needs) nothing marches before the war; with a minor the target nothing marches either, as FR-274 had it', () => {
    const greatPower = addRegiments(colonised(20), N2, SW2, ['regulars']);
    expect(warOrders(scriptedPlayer(greatPower, N2))).toEqual([recruitOne]);
    const minor = addRegiments({ ...continent('world'), turn: 20 }, N2, SW2, ['regulars']);
    expect(campaignTarget(minor, N2)).toBe(ARVELIA);
    expect(moves(minor)).toEqual([]);
  });
});

describe('FR-489 one province, then peace (card Q115 (a))', () => {
  /** Turn 23: Valdoria declared war on Testland (since turn 21) and took Testland North-East on turn 22; 5 Regulars hold it. */
  const tookOne = (aggressor = N2): GameState => {
    const s = addRegiments(clearArmy(transferProvince(colonised(23), NE1, N2), N1, NE1), N2, NE1, REGULARS_5);
    return atWarWith(s, aggressor, [{ provinceId: NE1, fromId: N1, toId: N2, turn: 22 }]);
  };
  const atWarWith = (s: GameState, aggressor: string, captures: ProvinceCapture[]): GameState =>
    setPair(s, N1, N2, { war: { aggressors: [aggressor], since: 21, captures }, consulates: [], embassies: [] });
  const attacks = (s: GameState): Order[] =>
    warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy' && s.provinces.find(p => p.id === o.toProvinceId)!.ownerId !== N2);
  const ids = (s: GameState, provinceId: string) => armyIn(s, N2, provinceId)!.regiments.map(r => r.id);

  // Before the war, Testland holds Arvelia and Valdoria holds Testland North-West.
  // Each side of the channel has a separate Valdorian force facing an undefended province.
  const twoFronts = (): GameState => {
    let s = clearArmy(continent('world'), ARVELIA, ARVELIA_P);
    s = fallCapital(takeProvince(s, ARVELIA_P, N1, 17, noop), ARVELIA, N1, 17, noop);
    s = clearArmy(clearArmy(transferProvince(s, NW1, N2), N1, NW1), N1, NE1);
    s = addRegiments(addRegiments(s, N2, NW1, ['regulars']), N2, NW2, ['regulars']);
    return atWarWith({ ...s, turn: 23 }, N2, []);
  };

  it('FR-489 separate field armies facing two undefended provinces take only one through End Turn', () => {
    const s = twoFronts();
    const first = resolveTurn(s, { [N2]: scriptedPlayer(s, N2) });
    const captures = first.events.filter(e => e.type === 'province-taken');
    expect(captures).toEqual([{ type: 'province-taken', nationId: N2, fromId: N1, provinceId: ARVELIA_P }]);
    expect(attacks(first.state)).toEqual([]);
  });

  it('FR-489 losing its conquered province does not open a different war aim on a later turn', () => {
    const s = clearArmy(twoFronts(), N2, NW1);
    expect(attacks(s)).toHaveLength(1);
    const lostAim = atWarWith({ ...s, turn: 25 }, N2, [
      { provinceId: NE1, fromId: N1, toId: N2, turn: 22 },
      { provinceId: NE1, fromId: N2, toId: N1, turn: 24 },
    ]);
    expect(attacks(lostAim)).toEqual([]);
    const reinforced = addRegiments(lostAim, N2, NW1, ['regulars']);
    expect(attacks(reinforced)).toEqual([march(NW1, ids(reinforced, NW1), NE1)]);
  });

  it('FR-489 reclaiming home territory leaves the one foreign province available', () => {
    const s = atWarWith(twoFronts(), N2, [
      { provinceId: NE2, fromId: N2, toId: N1, turn: 21 },
      { provinceId: NE2, fromId: N1, toId: N2, turn: 22 },
    ]);
    const result = resolveTurn(s, { [N2]: scriptedPlayer(s, N2) });
    expect(result.events.filter(e => e.type === 'province-taken')).toEqual([
      { type: 'province-taken', nationId: N2, fromId: N1, provinceId: ARVELIA_P },
    ]);
  });

  it('FR-489 holding a province it took from the Great Power it declared war on, it attacks no further province of it (FR-228 alone attacks Testland North-West at 2.0)', () => {
    expect(attacks(tookOne())).toEqual([]);
    expect(attacks(tookOne(N1))).toEqual([march(NE1, ids(tookOne(N1), NE1), NW1)]);
  });

  it('FR-489 it still retakes its own provinces lost in this war (FR-228 (c))', () => {
    let s = clearArmy(transferProvince(tookOne(), NW2, N1), N2, NW2);
    s = addRegiments(addRegiments(s, N1, NW2, ['regulars'], 30), N2, NE2, ['regulars', 'regulars']);
    s = atWarWith(s, N2, [{ provinceId: NE1, fromId: N1, toId: N2, turn: 22 }, { provinceId: NW2, fromId: N2, toId: N1, turn: 22 }]);
    // the two Regulars added in Valdoria North-East attack; its 4 start Minutemen there are militia, never in the field army
    expect(attacks(s)).toEqual([march(NE2, ['regiment-907', 'regiment-908'], NW2)]);
  });

  it('FR-489 in a war it declared on a Great Power it never attacks that country\'s capital province, however weak', () => {
    // Valdoria holds Testland North-East (hand-built, nothing taken in this war yet); North-West and South-East are strong, the capital empty
    let s = clearArmy(clearArmy(transferProvince(colonised(23), NE1, N2), N1, NE1), N1, SW1);
    s = addRegiments(addRegiments(addRegiments(s, N2, NE1, REGULARS_5), N1, NW1, ['regulars', 'regulars', 'regulars', 'regulars']), N1, SE1, ['regulars', 'regulars', 'regulars', 'regulars']);
    expect(attacks(atWarWith(s, N2, []))).toEqual([]);
    expect(attacks(atWarWith(s, N1, []))).toEqual([march(NE1, ids(s, NE1), SW1)]);
  });
});

describe('FR-274 scripted war on minors', () => {
  /** The continent on `turn` with an armament in Valdoria's warehouse, so a recruit is possible. */
  const onTurn = (turn: number, s: GameState = continent('world')): GameState => setWarehouse({ ...s, turn }, N2, { armaments: 1 });

  it('FR-274 before turn 10 nothing: no recruit, no war', () => {
    expect(SCRIPTED_WAR.fromTurn).toBe(10);
    expect(warOrders(scriptedPlayer(onTurn(9), N2))).toEqual([]);
    expect(campaignTarget(onTurn(9), N2)).toBeUndefined();
  });

  it('FR-274 from turn 10, at war with no one, it picks the bordering minor with the lowest defence and recruits 1 regiment a turn (Cuirassiers, tuned)', () => {
    expect(SCRIPTED_WAR.campaignRegiments[0]).toBe('cuirassiers');
    expect(campaignTarget(onTurn(10), N2)).toBe(ARVELIA);
    expect(warOrders(scriptedPlayer(onTurn(10), N2))).toEqual([recruitOne]);
  });

  // Re-recorded in M13 by FR-482 (card Q119 (a)): was "$2,999 -> nothing" and "no horse -> no recruit"; the campaign now
  // raises the next of its list it can pay for: below Cuirassiers' $500 above the floor the $100 Hussars, with no horse
  // the Grenadiers (a trained worker, no horse). The $2,500 floor at peace is unchanged.
  it('FR-274 FR-482 recruiting keeps the FR-213 floor: not below $2,500 after the order ($3,000 Cuirassiers, $2,999 and $2,600 Hussars, $2,599 nothing)', () => {
    const ordered = (cash: number) => warOrders(scriptedPlayer(setTreasury(onTurn(10), N2, cash), N2));
    expect(ordered(3000)).toEqual([recruitOne]);
    expect([ordered(2999), ordered(2600)]).toEqual([[{ ...recruitOne, regiment: 'hussars' }], [{ ...recruitOne, regiment: 'hussars' }]]);
    expect(ordered(2599)).toEqual([]);
    // a horse is part of the cost (FR-200): none in the warehouse, so the Grenadiers
    expect(warOrders(scriptedPlayer(setWarehouse(onTurn(10), N2, { horses: 0 }), N2))).toEqual([{ ...recruitOne, regiment: 'grenadiers' }]);
  });

  it('FR-274 with its field army at twice the minor\'s defence it declares war and marches the field army to the bordering province', () => {
    // 4 Regulars beyond the keep: 40 against twice Arvelia's 18.75
    const ready = addRegiments(onTurn(10), N2, SW2, ['regulars', 'regulars', 'regulars', 'regulars']);
    expect(warOrders(scriptedPlayer(ready, N2))).toEqual([warOn(ARVELIA), march(SW2, ['regiment-901', 'regiment-902', 'regiment-903', 'regiment-904'], NW2)]);
    // 3 Regulars (30) are not enough: one more recruit, no war
    const short = addRegiments(onTurn(10), N2, SW2, ['regulars', 'regulars', 'regulars']);
    expect(warOrders(scriptedPlayer(short, N2))).toEqual([recruitOne]);
    // 3 Cuirassiers (45) are: war
    const cavalry = addRegiments(onTurn(10), N2, SW2, ['cuirassiers', 'cuirassiers', 'cuirassiers']);
    expect(warOrders(scriptedPlayer(cavalry, N2))[0]).toEqual(warOn(ARVELIA));
  });

  it('FR-274 FR-497 (M13 T-15) a war on a minor waits for SCRIPTED_WAR.minorWarUpkeepTurns (4) turns of the army\'s upkeep in the treasury', () => {
    // Measured in the both-scripted games (FR-247, seed 3): Valdoria declared on Arvelia, its only trade partner, with $336
    // and lost 6 regiments for want of pay on the next two turns
    const ready = addRegiments(onTurn(10), N2, SW2, ['regulars', 'regulars', 'regulars', 'regulars']);
    const need = SCRIPTED_WAR.minorWarUpkeepTurns * upkeepOf(ready, N2);
    expect(need).toBeGreaterThan(0);
    const declares = (cash: number) => warOrders(scriptedPlayer(setTreasury(ready, N2, cash), N2)).some(o => o.kind === 'proposeOverture' && o.overture === 'war');
    expect(declares(need)).toBe(true);
    expect(declares(need - 1)).toBe(false);
  });

  it('FR-274 at war with the minor it attacks on a turn the estimate is 1.5 or more (FR-228)', () => {
    let s = atWar(onTurn(12), N2, ARVELIA);
    s = addRegiments(s, N2, NW2, ['regulars', 'regulars', 'regulars', 'regulars']);
    expect(warOrders(scriptedPlayer(s, N2)).filter(o => o.kind === 'moveArmy')).toEqual([
      march(NW2, ['regiment-901', 'regiment-902', 'regiment-903', 'regiment-904'], ARVELIA_P),
    ]);
  });

  it('FR-274 one war at a time, never on a Great Power before turn 20 (FR-488), never on a colony', () => {
    const ready = addRegiments(onTurn(10), N2, SW2, ['regulars', 'regulars', 'regulars', 'regulars']);
    const atWarWithTestland = atWar(ready, N1, N2);
    expect(warOrders(scriptedPlayer(atWarWithTestland, N2)).filter(o => o.kind === 'proposeOverture')).toEqual([]);
    expect(campaignTarget(atWarWithTestland, N2)).toBeUndefined();
    const colony = { ...ready, minorNations: ready.minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: N1 } : m)) };
    expect(campaignTarget(colony, N2)).toBeUndefined();
    expect(warOrders(scriptedPlayer(colony, N2))).toEqual([]);
  });

  it('FR-274 FR-234 two-islands: no target, no army order', () => {
    const v1 = { ...newGame({ seed: 1, world: 'two-islands' }), turn: 12 };
    expect(campaignTarget(v1, N2)).toBeUndefined();
    expect(warOrders(scriptedPlayer(v1, N2))).toEqual([]);
  });

  describe('FR-458 the campaign keeps its recruits\' grade', () => {
    /** The continent on `turn` (from turn 10 Arvelia is the target, no field army yet): 3 trained workers, 3 experts, paper to train them all. */
    const campaign = (horses: number, turn = 10): GameState =>
      setIndustry(setWarehouse({ ...continent('world'), turn }, N2, { paper: 20, horses, armaments: 1 }), N2, { workers: { untrained: 0, trained: 3, expert: 3 } });
    const training = (s: GameState) => scriptedPlayer(s, N2).filter(o => o.kind === 'trainWorkers');
    const trainTrained = (delta: number): Order => ({ kind: 'trainWorkers', nationId: N2, from: 'trained', delta });

    it('FR-458 while the campaign is short, training leaves a trained worker for each Cuirassiers the horses in stock can raise', () => {
      expect(workersKeptForCampaign(campaign(2), N2, 'trained')).toBe(2);
      expect(workersKeptForCampaign(campaign(2), N2, 'untrained')).toBe(0);
      // 2 horses: this turn's recruit takes a trained worker and a horse, the other horse keeps 1 more: 1 of the 3 trains
      expect(warOrders(scriptedPlayer(campaign(2), N2))).toEqual([recruitOne]);
      expect(training(campaign(2))).toEqual([trainTrained(1)]);
      // 5 horses keep all 3
      expect(training(campaign(5))).toEqual([]);
    });

    // Re-recorded in M13 by FR-482 (card Q119 (a)): was "with no horse every trained worker may train" -> trainTrained(3);
    // with no horse the campaign now raises Grenadiers, which takes 1 of the 3 trained workers, so the other 2 train.
    it('FR-458 FR-482 with no horse none is kept for Cuirassiers: the Grenadiers recruit takes 1 trained worker and the other 2 train; before the campaign (turn 9) all 3 train', () => {
      expect(workersKeptForCampaign(campaign(0), N2, 'trained')).toBe(0);
      expect(warOrders(scriptedPlayer(campaign(0), N2))).toEqual([{ ...recruitOne, regiment: 'grenadiers' }]);
      expect(training(campaign(0))).toEqual([trainTrained(2)]);
      expect(workersKeptForCampaign(campaign(2, 9), N2, 'trained')).toBe(0);
      expect(training(campaign(2, 9))).toEqual([trainTrained(3)]);
    });

    it('FR-460 a nation with an army trains below its reserve as before: with $1,500 and a reserve of $2,500 one worker trains', () => {
      const s = setTreasury(campaign(0), N2, 1500);
      expect(cashReserve(s, N2)).toBe(2500);
      expect(training(s)).toEqual([trainTrained(1)]);
    });
  });

  describe('FR-274 acceptance: the continent, seeds 1 to 4, 40 turns, Testland idle', () => {
    const SEEDS = [1, 2, 3, 4];
    interface Run {
      seed: number;
      declared?: number;
      colonised?: number;
      refused: number;
      lowestTreasury: number;
      warsOnGreatPowers: number;
      /** Valdoria's regiments disbanded for want of pay (FR-202; M9 review R1: 4 and 6 on seeds 1 and 3 at turn 33 before FR-275). */
      noPay: number;
      /** The Council meetings (FR-302, M10 review E1) and how the game ended. */
      councils: CouncilMetEvent[];
      endReason?: string;
    }
    const runs: Run[] = [];
    beforeAll(() => {
      for (const seed of SEEDS) {
        let s = newGame({ seed, world: 'continent' });
        const run: Run = { seed, refused: 0, lowestTreasury: Infinity, warsOnGreatPowers: 0, noPay: 0, councils: [] };
        for (let turn = 1; turn <= 40; turn++) {
          const { state, events } = resolveTurn(s, { [N2]: scriptedPlayer(s, N2) }, s.seed);
          for (const e of events) {
            if (e.type === 'council-met') run.councils.push(e);
            if (e.type === 'order-rejected') run.refused++;
            if (e.type === 'regiments-disbanded' && e.reason === 'no-pay' && e.nationId === N2) run.noPay += e.count;
            if (e.type === 'war-declared' && e.nationId === N2) {
              if (state.nations.some(n => n.id === e.targetId)) run.warsOnGreatPowers++;
              else run.declared ??= turn;
            }
            if (e.type === 'minor-colonised' && e.nationId === N2) run.colonised ??= turn;
          }
          s = state;
          run.lowestTreasury = Math.min(run.lowestTreasury, nationOf(s, N2).treasury);
        }
        run.endReason = s.gameOver?.reason;
        runs.push(run);
      }
      console.log(
        'FR-274 per seed (declared, colonised, lowest treasury, no-pay disbands):',
        JSON.stringify(runs.map(r => [r.seed, r.declared, r.colonised, r.lowestTreasury, r.noPay]))
      );
      console.log(
        'FR-302 Council per seed on the partners market (meeting turn, Valdoria and Testland: controlled+colonies+other minors):',
        JSON.stringify(runs.map(r => [r.seed, r.councils.map(c => `t${c.turn} ${c.nominees.map(n => `${n.nationId}:${n.controlled}+${n.colonies}+${n.otherMinorNations}`).join('/')}`)]))
      );
    }, 300_000);

    // Re-recorded in M13 by FR-488 (card Q114 (b), which replaced Q35's "never with a Great Power"): wars on a Great
    // Power per seed 0 -> 1; Valdoria declares war on Testland on turn 22 or 23 and takes Testland North-East (FR-489).
    it('FR-274 FR-488 no order is refused, the treasury never goes below 0, and from turn 20 one war on Testland per seed', () => {
      expect(runs.map(r => ({ seed: r.seed, refused: r.refused, broke: r.lowestTreasury < 0, warsOnGreatPowers: r.warsOnGreatPowers }))).toEqual(
        SEEDS.map(seed => ({ seed, refused: 0, broke: false, warsOnGreatPowers: 1 }))
      );
    });

    it('FR-274 FR-275 Valdoria loses no regiment for want of pay: the army that took Arvelia is paid to turn 40 (review R1)', () => {
      expect(runs.map(r => [r.seed, r.noPay])).toEqual(SEEDS.map(seed => [seed, 0]));
    });

    it('FR-274 Valdoria declares war on a minor by turn 25 and takes its capital by turn 40 in at least 3 of the 4 seeds', () => {
      const met = runs.filter(r => r.declared !== undefined && r.declared <= 25 && r.colonised !== undefined && r.colonised <= 40);
      expect(met.length, JSON.stringify(runs.map(r => [r.seed, r.declared, r.colonised]))).toBeGreaterThanOrEqual(3);
    });

    it('FR-302 FR-305 on the default (partners) market the Council meets 4 times with no winner; the colony Valdoria won by FR-274 votes for it as Colonies at the turn-30 and turn-40 meetings (M10 review E1)', () => {
      expect(runs.map(r => [r.seed, r.councils.map(c => [c.turn, c.winnerId ?? null]), r.endReason ?? null])).toEqual(
        SEEDS.map(seed => [seed, [[10, null], [20, null], [30, null], [40, null]], null])
      );
      const colonies = (r: Run) => r.councils.map(c => [c.turn, councilCell(c, N2, 'colonies')]);
      // Every seed colonises Arvelia on turn 18 (FR-274's acceptance), so Valdoria votes for it from the turn-20 meeting.
      // M12 strategy C re-record (FR-456, FR-457 depots gather more; FR-458 keeps the Cuirassiers' trained workers): seeds
      // 1 to 3 colonised it on turn 22 and voted from turn 30, seed 4 declared no war.
      // M13 re-record by FR-485 and FR-486 (lane B's migrants, card Q116 (b)): turn 17 -> 19 on every seed. The goods
      // and cash its migrants take delay the campaign 2 turns; with only the migrant planner cut out of economy.ts it is
      // turn 16, with economy.ts as before M13 turn 17 (lane A probes, .gate/m13/laneA/accept-*.txt).
      // M13 close round re-record by FR-539 (FR-499): turn 19 -> 18 on every seed (declared 18 -> 17; lowest treasury
      // 231/154/189/214 -> 778/495/746/832; no-pay disbands still 0). From turn 7 Valdoria's standing steel bid toward
      // Testland takes a hold its timber purchase from the minors used and is refunded unanswered (Testland is idle), so
      // Valdoria keeps that cash and its campaign is one turn sooner. The meeting cells do not move: turn 18 is still
      // before the turn-20 meeting.
      expect(runs.map(r => [r.seed, r.colonised ?? null, colonies(r)])).toEqual(
        [1, 2, 3, 4].map(seed => [seed, 18, [[10, []], [20, [ARVELIA_P]], [30, [ARVELIA_P]], [40, [ARVELIA_P]]]])
      );
    });
  });
});

