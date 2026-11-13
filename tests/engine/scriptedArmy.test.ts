// FR-213: the scripted garrison (Imp1 Defense Minister: "Strengthen the Army" when a rival army is far stronger; rule
// remake). It never moves or disbands; under a threat it recruits 1 Regulars a turn and makes armaments for it first.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { computerOrders } from '@/engine/ai/players';
import { upkeepReserve } from '@/engine/ai/scriptedPlayer';
import { SCRIPTED_GARRISON } from '@/definisions/regiments';
import { armyThreat } from '@/engine/ai/scriptedArmy';
import { forceSize } from '@/engine/army/armies';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import type { RegimentType } from '@/types/Unit';
import { GoodsType } from '@/types/Resource';
import { applyOrder } from '@/engine/orders/apply';
import { N1, N2, setBuilding, setIndustry, setPair, setTreasury, setWarehouse, stockOf, treasury } from './fixtures';
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

  it('FR-213 only while its treasury after the order stays at $2,500 or more: at $3,000 yes, at $2,999 no', () => {
    expect(armyOrders(scriptedPlayer(setTreasury(ready(), N2, 3000), N2))).toEqual([REGULARS_1]);
    expect(armyOrders(scriptedPlayer(setTreasury(ready(), N2, 2999), N2))).toEqual([]);
  });

  it('FR-213 not without an armament, nor without an untrained worker', () => {
    expect(armyOrders(scriptedPlayer(threatened(), N2))).toEqual([]);
    expect(armyOrders(scriptedPlayer(setIndustry(ready(), N2, { workers: { untrained: 0, trained: 2, expert: 1 } }), N2))).toEqual([]);
  });

  it('FR-213 FR-129 its production run first makes up to 2 armaments while it has fewer than 2', () => {
    // a metal works of 3 so the run is not capped below 2; $2,000 so no recruit takes an armament first
    const base = setTreasury(setBuilding(threatened(), N2, 'metalWorks', { capacity: 3 }), N2, 2000);
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
  it('FR-213 no move, cancel or disband order; at most 1 Regulars a turn; the capital province never below 4 arms; no order refused', () => {
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

  it.each(['two-islands', 'continent'] as const)('FR-213 on %s at peace (world market), ten turns of nation 2: no army order and no armaments made', world => {
    let s = newGame({ seed: 1, world, market: 'world' });
    const orders: Order[] = [];
    for (let turn = 1; turn <= 10; turn++) {
      const mine = scriptedPlayer(s, N2);
      orders.push(...mine);
      s = resolveTurn(s, { [N2]: mine }, s.seed).state;
    }

    expect(armyOrders(orders)).toEqual([]);
    expect(armamentOrders(orders)).toEqual([]);
  });
});
