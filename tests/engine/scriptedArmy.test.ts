// FR-213: the scripted garrison (Imp1 Defense Minister: "Strengthen the Army" when a rival army is far stronger; rule
// remake). It never moves or disbands; under a threat it recruits 1 regiment a turn, the first of FR-482's threat list it
// can raise down to its upkeep reserve (FR-483), and makes armaments for it first.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { computerOrders } from '@/engine/ai/players';
import { upkeepReserve } from '@/engine/ai/scriptedPlayer';
import { REGIMENTS, SCRIPTED_GARRISON } from '@/definisions/regiments';
import { armyThreat, wantedRegiment } from '@/engine/ai/scriptedArmy';
import { forceSize, upkeepOf } from '@/engine/army/armies';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import type { RegimentType } from '@/types/Unit';
import { GoodsType } from '@/types/Resource';
import { applyOrder } from '@/engine/orders/apply';
import { N1, N2, setBuilding, setIndustry, setPair, setTreasury, setWarehouse, stockOf, treasury } from './fixtures';
import { SCRIPTED_WAR } from '@/definisions/combatRules';
import { addRegiments, ARVELIA, ARVELIA_P, armyIn, continent, NW2, SW2 } from './armyFixtures';

const ARMY_KINDS = ['setRecruitment', 'moveArmy', 'cancelArmyMove', 'disbandRegiments'];
const armyOrders = (orders: Order[]) => orders.filter(o => ARMY_KINDS.includes(o.kind));
const armamentOrders = (orders: Order[]) => orders.filter(o => o.kind === 'setProduction' && o.output === GoodsType.Armaments);
const REGULARS_1: Order = { kind: 'setRecruitment', nationId: N2, regiment: 'regulars', count: 1 };

/** Testland and Valdoria at war since turn 1 (Testland the aggressor). */
const war = (s: GameState, a = N1, b = N2): GameState => setPair(s, a, b, { war: { aggressors: [a], since: 1 }, consulates: [], embassies: [] });
/** At war, with Testland regiments in Arvelia, which borders Valdoria North-West (held by 4 Minutemen: strength 0). */
const threatened = (s: GameState = continent(), types: RegimentType[] = ['regulars', 'regulars', 'regulars', 'regulars']): GameState =>
  addRegiments(war(s), N1, ARVELIA_P, types);

describe('FR-213 the threat', () => {
  it('FR-213 a country at war with it has a strength in a province bordering one of its provinces above its own there', () => {
    expect(armyThreat(threatened(), N2)).toBe(true);
    expect(armyThreat(threatened(), N1)).toBe(false);
  });

  it('FR-213 above, not equal: 1 Regulars in Arvelia against 1 Regulars in Valdoria North-West is no threat; 2 against 1 is', () => {
    const one = addRegiments(threatened(continent(), ['regulars']), N2, NW2, ['regulars']);
    const two = addRegiments(threatened(continent(), ['regulars', 'regulars']), N2, NW2, ['regulars']);

    expect([armyThreat(one, N2), armyThreat(two, N2)]).toEqual([false, true]);
  });

  it('FR-213 no war, no threat; a minor at war has only militia (strength 0); the start armies sit in the capitals, far apart', () => {
    expect(armyThreat(addRegiments(continent(), N1, ARVELIA_P, ['regulars', 'regulars']), N2)).toBe(false);
    expect(armyThreat(war(continent(), N2, ARVELIA), N2)).toBe(false);
    expect(armyThreat(war(continent()), N2)).toBe(false);
    expect(armyThreat(newGame({ seed: 1, world: 'two-islands' }), N2)).toBe(false);
  });
});

describe('FR-213 recruiting under a threat', () => {
  const ready = (s: GameState = threatened()) => setWarehouse(s, N2, { armaments: 1 });

  it('FR-213 with an armament, a free untrained worker and $3,000 or more it orders 1 Regulars, and no other army order', () => {
    expect(armyOrders(scriptedPlayer(ready(), N2))).toEqual([REGULARS_1]);
  });

  // Re-recorded in M13 by FR-483 (card Q119 (a)): was "only while its treasury after the order stays at $2,500 or more:
  // at $3,000 yes, at $2,999 no"; under a threat the floor is now the upkeep reserve counted with the new regiment
  // (2 x ($100 + $25) = $250), and below Regulars' $500 the next of FR-482's list it can pay for is raised.
  it('FR-213 FR-483 only while its treasury after the order stays at its upkeep reserve with the new regiment ($250): $750 Regulars, $749 the $100 Hussars, $349 nothing', () => {
    const ordered = (cash: number) => armyOrders(scriptedPlayer(setTreasury(ready(), N2, cash), N2));
    expect(ordered(750)).toEqual([REGULARS_1]);
    expect(ordered(749)).toEqual([{ ...REGULARS_1, regiment: 'hussars' }]);
    expect(ordered(349)).toEqual([]);
  });

  // Re-recorded in M13 by FR-482 (card Q119 (a)): was "nor without an untrained worker" -> []; without one, a trained
  // worker and a horse raise Cuirassiers, the next of the threat list.
  it('FR-213 FR-482 not without an armament; without an untrained worker a trained one raises Cuirassiers', () => {
    expect(armyOrders(scriptedPlayer(threatened(), N2))).toEqual([]);
    expect(armyOrders(scriptedPlayer(setIndustry(ready(), N2, { workers: { untrained: 0, trained: 2, expert: 1 } }), N2))).toEqual([{ ...REGULARS_1, regiment: 'cuirassiers' }]);
  });

  it('FR-213 FR-129 its production run first makes up to 2 armaments while it has fewer than 2', () => {
    // a metal works of 3 so the run is not capped below 2; $300 so no recruit takes an armament first (re-recorded in M13
    // by FR-483: was $2,000, which now pays a recruit above the $250 reserve; $300 is below the cheapest, Hussars' $350)
    const base = setTreasury(setBuilding(threatened(), N2, 'metalWorks', { capacity: 3 }), N2, 300);
    const made = (s: GameState) => armamentOrders(scriptedPlayer(s, N2)).map(o => (o as { amount: number }).amount);

    expect(made(base)).toEqual([2]);
    expect(made(setWarehouse(base, N2, { armaments: 1 }))).toEqual([1]);
    expect(made(setWarehouse(base, N2, { armaments: 2 }))).toEqual([]);
    // the start metal works (capacity 1) makes 1 a turn
    expect(made(setTreasury(threatened(), N2, 2000))).toEqual([1]);
  });

  it('FR-213 without a threat the run makes no armaments', () => {
    expect(armamentOrders(scriptedPlayer(setBuilding(war(continent()), N2, 'metalWorks', { capacity: 3 }), N2))).toEqual([]);
  });

  it('FR-213 (c) under a threat it keeps its 2 armaments: none offered on the world market', () => {
    const s = setWarehouse(setTreasury(threatened(continent('world')), N2, 2000), N2, { armaments: 2 });
    const offered = (orders: Order[]) => orders.filter(o => o.kind === 'sellCommodity' && o.commodity === GoodsType.Armaments);

    expect(offered(scriptedPlayer(s, N2))).toEqual([]);
  });
});

describe('FR-482 FR-483 recruit what can be raised (card Q119 (a))', () => {
  const recruit = (regiment: RegimentType): Order => ({ kind: 'setRecruitment', nationId: N2, regiment, count: 1 });
  /** Valdoria with these workers, horses, armaments and cash. */
  const equip = (s: GameState, workers: { untrained: number; trained: number; expert: number }, horses: number, armaments: number, cash: number): GameState =>
    setTreasury(setWarehouse(setIndustry(s, N2, { workers }), N2, { horses, armaments }), N2, cash);
  /** The audit's invasion on seed 1, turn 9 (AISIM-02): no untrained worker, 4 trained, 4 horses, $3,118, an armament in stock. */
  const invaded = (cash = 3118, s: GameState = threatened()): GameState => equip(s, { untrained: 0, trained: 4, expert: 1 }, 4, 1, cash);
  /** A campaign on Arvelia at peace (turn 10, FR-274): no threat, so the $2,500 floor. */
  const campaign = (cash = 10000): GameState => invaded(cash, { ...continent(), turn: 10 });

  it('FR-482 the lists are data: under a threat Regulars, Cuirassiers, Grenadiers, Artillery, Hussars, Skirmishers, Light Artillery; for a campaign Cuirassiers, Grenadiers, Hussars, Regulars, Light Artillery, Artillery, Skirmishers', () => {
    expect(SCRIPTED_WAR.threatRegiments).toEqual(['regulars', 'cuirassiers', 'grenadiers', 'artillery', 'hussars', 'skirmishers', 'lightArtillery']);
    expect(SCRIPTED_WAR.campaignRegiments).toEqual(['cuirassiers', 'grenadiers', 'hussars', 'regulars', 'lightArtillery', 'artillery', 'skirmishers']);
  });

  it('FR-482 the audit\'s invasion on turn 9 (0 untrained, 4 trained, 4 horses, $3,118): Cuirassiers is ordered, where a refused Regulars was the only try', () => {
    expect(armyThreat(invaded(), N2)).toBe(true);
    expect(wantedRegiment(invaded(), N2)).toBe('cuirassiers');
    expect(armyOrders(scriptedPlayer(invaded(), N2))).toEqual([recruit('cuirassiers')]);
  });

  it('FR-483 the audit\'s turn 10 ($1,635): Cuirassiers is ordered under a threat ($1,135 left, above the $250 reserve); in a campaign at peace the $2,500 floor stays, so nothing', () => {
    expect(armyOrders(scriptedPlayer(invaded(1635), N2))).toEqual([recruit('cuirassiers')]);
    expect(armyThreat(campaign(1635), N2)).toBe(false);
    expect(wantedRegiment(campaign(1635), N2)).toBeUndefined();
    expect(wantedRegiment(campaign(3000), N2)).toBe('cuirassiers');
  });

  it('FR-483 under a threat the floor is the upkeep reserve counted with the new regiment: 2 turns of $100 + $25 = $250, so $750 orders Cuirassiers and $749 nothing; in the last 8 turns every turn left (turn 36: 5 x $125 = $625)', () => {
    expect([750, 749].map(cash => wantedRegiment(invaded(cash), N2))).toEqual(['cuirassiers', undefined]);
    const at36 = (cash: number) => invaded(cash, { ...threatened(), turn: 36 });
    expect([1125, 1124].map(cash => wantedRegiment(at36(cash), N2))).toEqual(['cuirassiers', undefined]);
  });

  it('FR-483 the recruit stays counted for the rest of the turn: once a Cuirassiers is ordered the reserve is 2 x $125, so later orders cannot spend below it', () => {
    expect(upkeepReserve(invaded(), N2)).toBe(200);
    expect(upkeepReserve(applyOrder(invaded(), recruit('cuirassiers')), N2)).toBe(250);
  });

  it('FR-482 the 2 armaments the run keeps (SCRIPTED_GARRISON.armaments) cover any regiment of both lists', () => {
    const arms = [...SCRIPTED_WAR.threatRegiments, ...SCRIPTED_WAR.campaignRegiments].map(r => REGIMENTS[r].stats.armamentsCost);
    expect(Math.max(...arms)).toBeLessThanOrEqual(SCRIPTED_GARRISON.armaments);
  });

  // (no dollar sign in these titles: vitest reads "$name" in a test name as a placeholder)
  it.each([
    ['an untrained worker', 'regulars', { untrained: 1, trained: 0, expert: 1 }, 4, 1, 3000],
    ['no untrained worker', 'cuirassiers', { untrained: 0, trained: 1, expert: 1 }, 4, 1, 3000],
    ['no untrained worker, no horse', 'grenadiers', { untrained: 0, trained: 1, expert: 1 }, 0, 1, 3000],
    ['an untrained worker, 600 dollars (Regulars would leave 100, below the 250 reserve)', 'hussars', { untrained: 1, trained: 0, expert: 1 }, 4, 1, 600],
    ['an untrained worker, no horse, 700 dollars', 'skirmishers', { untrained: 1, trained: 0, expert: 1 }, 0, 1, 700],
    ['experts only', undefined, { untrained: 0, trained: 0, expert: 3 }, 4, 1, 3000],
    ['no armament', undefined, { untrained: 1, trained: 1, expert: 1 }, 4, 0, 3000],
  ] as const)('FR-482 under a threat, the first of its list it can raise: with %s -> %s', (_, expected, workers, horses, armaments, cash) => {
    expect(wantedRegiment(equip(threatened(), { ...workers }, horses, armaments, cash), N2)).toBe(expected);
  });

  it.each([
    ['a trained worker and a horse', 'cuirassiers', { untrained: 1, trained: 1, expert: 1 }, 4],
    ['a trained worker, no horse', 'grenadiers', { untrained: 1, trained: 1, expert: 1 }, 0],
    ['an untrained worker and a horse', 'hussars', { untrained: 1, trained: 0, expert: 1 }, 4],
    ['an untrained worker, no horse', 'regulars', { untrained: 1, trained: 0, expert: 1 }, 0],
  ] as const)('FR-482 in a campaign (turn 10, 10,000 dollars), the first of its list it can raise: with %s -> %s', (_, expected, workers, horses) => {
    expect(wantedRegiment(equip({ ...continent(), turn: 10 }, { ...workers }, horses, 1, 10000), N2)).toBe(expected);
  });
});

describe('FR-213 (a) FR-202 it keeps the cash of its garrison\'s upkeep', () => {
  const after = (s: GameState) => scriptedPlayer(s, N2).reduce(applyOrder, s);
  const onTurn = (s: GameState, turn: number): GameState => ({ ...s, turn });

  it('FR-213 (a) with $250 and the start army\'s $100 upkeep its orders leave two turns of it ($200); with no army (two-islands) the same $250 is spent below that', () => {
    const continentAt250 = setTreasury(continent('world'), N2, 250);
    const twoIslandsAt250 = setTreasury(newGame({ seed: 1, world: 'two-islands' }), N2, 250);

    expect(treasury(after(continentAt250), N2)).toBeGreaterThanOrEqual(200);
    expect(treasury(after(twoIslandsAt250), N2)).toBeLessThan(200);
  });

  it('FR-213 (a) the reserve: two turns of upkeep up to turn 32, then the upkeep of every turn left (turn 33: 8 turns, $800; turn 40: $100); $0 without an army', () => {
    const s = continent('world');
    const reserve = (turn: number) => upkeepReserve(onTurn(s, turn), N2);

    expect([1, 32, 33, 36, 39, 40].map(reserve)).toEqual([200, 200, 800, 500, 200, 100]);
    expect(upkeepReserve(newGame({ seed: 1, world: 'two-islands' }), N2)).toBe(0);
  });

  it('FR-213 (a) review E1: on turn 33 with $1,000 its orders leave the $800 that pays the upkeep to turn 40, where two turns would let it spend down to $200', () => {
    const at33 = setTreasury(onTurn(continent('world'), 33), N2, 1000);

    expect(treasury(after(at33), N2)).toBeGreaterThanOrEqual(800);
  });
});

describe('FR-275 with a field army the reserve rises one turn of upkeep a turn into the last 8 turns (M9 review R1)', () => {
  const onTurn = (s: GameState, turn: number): GameState => ({ ...s, turn });
  // One Cuirassiers beyond the capital keep (the start army's 4 arms): a field army, as after the FR-274 campaign
  const field = addRegiments(continent('world'), N2, SW2, ['cuirassiers']);

  it('FR-275 turns of upkeep kept: 2 up to turn 27, then 3, 4 ... 7 on turns 28 to 32, 8 on turn 33, 1 on turn 40; without a field army the FR-213 (a) step', () => {
    const turnsKept = (s: GameState, turn: number) => upkeepReserve(onTurn(s, turn), N2) / upkeepOf(s, N2);
    expect([1, 27, 28, 30, 32, 33, 40].map(t => turnsKept(field, t))).toEqual([2, 2, 3, 5, 7, 8, 1]);
    expect([1, 27, 28, 30, 32, 33, 40].map(t => turnsKept(continent('world'), t))).toEqual([2, 2, 2, 2, 2, 8, 1]);
  });
});

describe('FR-488 FR-497 in a war it declared on a Great Power the reserve is the upkeep of every turn left', () => {
  // The other Great Power may never accept its peace (FR-489; an idle player answers nothing), so the war and its field
  // army can last to turn 40; without this, 3 of the 24 idle sim games lost regiments for want of pay (seeds 4, 5, 6).
  const onTurn = (s: GameState, turn: number): GameState => ({ ...s, turn });
  const atWarWithTestland = (s: GameState, aggressor: string): GameState =>
    setPair(s, N1, N2, { war: { aggressors: [aggressor], since: 21 }, consulates: [], embassies: [] });
  const after = (s: GameState) => scriptedPlayer(s, N2).reduce(applyOrder, s);

  it('FR-488 FR-497 turn 23 with the start army ($100 a turn): 18 turns ($1,800) in its war on Testland; 2 turns ($200) when Testland declared the war, or at peace', () => {
    const s = onTurn(continent('world'), 23);
    expect([upkeepReserve(atWarWithTestland(s, N2), N2), upkeepReserve(atWarWithTestland(s, N1), N2), upkeepReserve(s, N2)]).toEqual([1800, 200, 200]);
  });

  it('FR-488 FR-497 with $1,500 on turn 23 its orders spend nothing in its war on Testland, and spend below $1,500 at peace', () => {
    const s = setTreasury(onTurn(continent('world'), 23), N2, 1500);
    expect(treasury(after(atWarWithTestland(s, N2)), N2)).toBe(1500);
    expect(treasury(after(s), N2)).toBeLessThan(1500);
  });
});

describe('FR-213 (b) the steel of the garrison\'s armaments', () => {
  it('FR-213 (b) under a threat the steel of the 2 armaments the run makes first (4 steel) stays out of expansion; without a threat it does not', () => {
    // a metal works of 3 so the run makes 2 armaments; $2,000 so no recruit is ordered; 5 lumber + 5 steel in stock
    const stocked = (s: GameState) =>
      setWarehouse(setTreasury(setBuilding(s, N2, 'metalWorks', { capacity: 3 }), N2, 2000), N2, { lumber: 5, steel: 5, armaments: 0 });
    const steelAfterExpansion = (s: GameState) =>
      stockOf(scriptedPlayer(s, N2).filter(o => o.kind === 'expandBuilding').reduce(applyOrder, s), N2, 'steel');

    expect(steelAfterExpansion(stocked(threatened()))).toBeGreaterThanOrEqual(4);
    expect(steelAfterExpansion(stocked(war(continent())))).toBeLessThan(4);
  });
});

describe('FR-213 the garrison over ten turns at war', () => {
  it('FR-213 no move, cancel or disband order; at most 1 recruit a turn; the capital province never below 4 arms; no order refused', () => {
    let s = threatened();
    const recruits: number[] = [];
    const other: Order[] = [];
    let refused = 0;
    const capital: number[] = [];
    for (let turn = 1; turn <= 10; turn++) {
      const orders = computerOrders(s);
      const army = armyOrders(orders[N2] ?? []);
      recruits.push(army.filter(o => o.kind === 'setRecruitment').length);
      other.push(...army.filter(o => o.kind !== 'setRecruitment'));
      const result = resolveTurn(s, orders, s.seed);
      refused += result.events.filter(e => e.type === 'order-rejected').length;
      s = result.state;
      capital.push(forceSize(armyIn(s, N2, SW2)!));
    }

    expect(other).toEqual([]);
    expect(Math.max(...recruits)).toBe(1);
    expect(recruits.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(Math.min(...capital)).toBeGreaterThanOrEqual(SCRIPTED_GARRISON.capitalArms);
    expect(refused).toBe(0);
  });

  // M9: from turn 10 (SCRIPTED_WAR.fromTurn) FR-274's campaign on a minor makes armaments and recruits on the continent
  // (tests/engine/scriptedWar.test.ts), so there the window of peace without army orders ends at turn 9
  it.each([['two-islands', 10], ['continent', SCRIPTED_WAR.fromTurn - 1]] as const)('FR-213 on %s at peace (world market), %i turns of nation 2: no army order and no armaments made', (world, turns) => {
    let s = newGame({ seed: 1, world, market: 'world' });
    const orders: Order[] = [];
    for (let turn = 1; turn <= turns; turn++) {
      const mine = scriptedPlayer(s, N2);
      orders.push(...mine);
      s = resolveTurn(s, { [N2]: mine }, s.seed).state;
    }

    expect(armyOrders(orders)).toEqual([]);
    expect(armamentOrders(orders)).toEqual([]);
  });
});
