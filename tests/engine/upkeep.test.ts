// FR-202: army upkeep, $25 per arms point a turn (Imp1 ledgers), a step right after the trade phase; a treasury that
// cannot pay disbands the newest regiments (Q36). The Deal Book's bottom line reads it (the M7 seam, FR-244).
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameEvent } from '@/engine/turn/context';
import type { Order } from '@/engine/orders/Order';
import { dealBook } from '@/engine/market/dealBook';
import { TURN_PHASES } from '@/engine/turn/phases';
import { tradeSystem } from '@/engine/systems/tradeSystem';
import { productionSystem } from '@/engine/systems/productionSystem';
import { disbandSystem, upkeepSystem } from '@/engine/systems/armySystem';
import { upkeepOf } from '@/engine/army/armies';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { N1, N2, nationOf, setTreasury, setWarehouse } from './fixtures';
import { ARVELIA, continent, idOf, namesIn, SW1 } from './armyFixtures';

const endTurn = (s: GameState, orders: Record<string, Order[]> = {}) => resolveTurn(s, orders, s.seed);
const ofType = <K extends GameEvent['type']>(events: GameEvent[], type: K) => events.filter((e): e is Extract<GameEvent, { type: K }> => e.type === type);
function ordered(s: GameState, ...orders: Order[]): GameState {
  return orders.reduce((state, order) => {
    const { state: next, result } = tryApplyOrder(state, order);
    expect(result, order.kind).toEqual({ ok: true });
    return next;
  }, s);
}

describe('FR-202 army upkeep', () => {
  it('FR-202 the example: the FR-203 start army (4 arms) costs each Great Power $100 a turn, as on the Imp1 1815 ledger', () => {
    const s = continent();
    expect([upkeepOf(s, N1), upkeepOf(s, N2)]).toEqual([100, 100]);

    const { state, events } = endTurn(s);

    expect(ofType(events, 'army-upkeep')).toEqual([
      { type: 'army-upkeep', nationId: N1, amount: 100 },
      { type: 'army-upkeep', nationId: N2, amount: 100 },
    ]);
    expect([nationOf(state, N1).treasury, nationOf(state, N2).treasury]).toEqual([9900, 9900]);
  });

  it('FR-202 FR-215 two-islands: no army, no upkeep, no event; the treasury is unchanged', () => {
    const s = newGame({ seed: 1, world: 'two-islands' });

    const { state, events } = endTurn(s);

    expect(ofType(events, 'army-upkeep')).toEqual([]);
    expect(nationOf(state, N1).treasury).toBe(10000);
  });

  it('FR-202 militia cost nothing and minors pay nothing: the only upkeep events are the Great Powers\'', () => {
    const { events } = endTurn(continent());

    expect(ofType(events, 'army-upkeep').map(e => e.nationId)).toEqual([N1, N2]);
    expect(upkeepOf(continent(), ARVELIA)).toBe(0);
  });

  it('FR-202 the step runs right after the trade phase: the cash of this turn\'s sale pays it', () => {
    expect(TURN_PHASES.indexOf(upkeepSystem)).toBe(TURN_PHASES.indexOf(tradeSystem) + 2);
    expect(TURN_PHASES.indexOf(disbandSystem)).toBe(TURN_PHASES.indexOf(tradeSystem) + 1);
    expect(TURN_PHASES.indexOf(upkeepSystem)).toBeLessThan(TURN_PHASES.indexOf(productionSystem));
    // $0 in the treasury, 1 coal sold on the world market at $100: the upkeep is paid, nothing disbanded
    const s = setWarehouse(setTreasury(continent('world'), N1, 0), N1, { coal: 1 });
    const { state, events } = endTurn(ordered(s, { kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 }));

    expect(ofType(events, 'regiments-disbanded')).toEqual([]);
    expect(ofType(events, 'army-upkeep').filter(e => e.nationId === N1)).toEqual([{ type: 'army-upkeep', nationId: N1, amount: 100 }]);
    expect(nationOf(state, N1).treasury).toBe(0);
  });

  it('FR-202 a treasury that cannot pay: the newest regiment goes first, one at a time, until it can; then it pays', () => {
    const s = setTreasury(continent(), N1, 60);

    const { state, events } = endTurn(s);

    // the 1st Artillery (2 arms) is the newest non-militia regiment; the 2 Regulars then cost $50
    expect(namesIn(state, N1, SW1).slice(0, 3)).toEqual(['1st Regulars', '2nd Regulars', '9th Minutemen']);
    const n1 = events.filter(e => (e.type === 'regiments-disbanded' || e.type === 'army-upkeep') && e.nationId === N1);
    expect(n1).toEqual([
      { type: 'regiments-disbanded', nationId: N1, reason: 'no-pay', count: 1 },
      { type: 'army-upkeep', nationId: N1, amount: 50 },
    ]);
    expect(nationOf(state, N1).treasury).toBe(10);
  });

  it('FR-202 when nothing can be paid every non-militia regiment goes and no upkeep event follows; the militia stay', () => {
    const s = setTreasury(continent(), N1, 20);

    const { state, events } = endTurn(s);

    expect(namesIn(state, N1, SW1)).toEqual(['9th Minutemen', '10th Minutemen', '11th Minutemen', '12th Minutemen']);
    expect(events.filter(e => (e.type === 'regiments-disbanded' || e.type === 'army-upkeep') && e.nationId === N1)).toEqual([
      { type: 'regiments-disbanded', nationId: N1, reason: 'no-pay', count: 3 },
    ]);
    expect(nationOf(state, N1).treasury).toBe(20);
  });

  it('FR-202 FR-207 the amount counts the regiments left after this turn\'s disbands', () => {
    const s = continent();

    const { events } = endTurn(ordered(s, { kind: 'disbandRegiments', nationId: N1, provinceId: SW1, regimentIds: [idOf(s, N1, '1st Artillery')] }));

    expect(ofType(events, 'army-upkeep').filter(e => e.nationId === N1)).toEqual([{ type: 'army-upkeep', nationId: N1, amount: 50 }]);
  });

  it('FR-201 FR-202 a regiment recruited this turn joins after the step: it pays from next turn', () => {
    const s = setWarehouse(continent(), N1, { armaments: 1 });

    const first = endTurn(ordered(s, { kind: 'setRecruitment', nationId: N1, regiment: 'regulars', count: 1 }));
    const second = endTurn(first.state);

    expect(ofType(first.events, 'army-upkeep').find(e => e.nationId === N1)?.amount).toBe(100);
    expect(ofType(second.events, 'army-upkeep').find(e => e.nationId === N1)?.amount).toBe(125);
  });

  it('FR-202 FR-244 the Deal Book\'s bottom line reads the upkeep: militaryUpkeep and the trade net', () => {
    const { state, events } = endTurn(continent());

    const book = dealBook(events, N1, { start: 10000, end: nationOf(state, N1).treasury });

    expect(book.bottomLine).toEqual({ sold: 0, bought: 0, militaryUpkeep: 100, net: -100 });
    expect(book.treasury).toEqual({ start: 10000, end: 9900, change: -100, other: 0 });
  });
});
