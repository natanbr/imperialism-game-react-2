// M8 QA fix round: the engine reads behind the screens' new lines. FR-263: this turn's march and disband orders of a
// nation, counted per pair of provinces and per province, for the map. FR-264: the nation as it was before this turn's
// recruit orders, for the Armoury's "in warehouse" and "reserved by this order". FR-266: the upkeep of one province.
import { describe, it, expect } from 'vitest';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { beforeRecruiting, freeWorkersOf, pendingArmyOrders, recruitingOf } from '@/engine/army/armies';
import { upkeepForecast, upkeepIn } from '@/engine/army/upkeepForecast';
import type { GameState } from '@/types/GameState';
import { deepFreeze, N1, N2, nationOf, setWarehouse, stockOf, treasury } from './fixtures';
import { addRegiments, continent, idOf, NE1, NW1, SE1, SW1 } from './armyFixtures';

function ordered(s: GameState, ...orders: Order[]): GameState {
  return orders.reduce((state, order) => {
    const { state: next, result } = tryApplyOrder(state, order);
    expect(result, order.kind).toEqual({ ok: true });
    return next;
  }, s);
}
const march = (s: GameState, names: string[], toProvinceId: string, fromProvinceId = SW1): Order => ({
  kind: 'moveArmy',
  nationId: N1,
  fromProvinceId,
  regimentIds: names.map((n) => idOf(s, N1, n)),
  toProvinceId,
});
const disband = (s: GameState, names: string[], provinceId = SW1): Order => ({ kind: 'disbandRegiments', nationId: N1, provinceId, regimentIds: names.map((n) => idOf(s, N1, n)) });

describe('FR-263 pendingArmyOrders: this turn\'s marches and disbands of a nation', () => {
  it('FR-263 a new game has none', () => {
    expect(pendingArmyOrders(continent(), N1)).toEqual({ marches: [], attacks: [], disbands: {} });
  });

  it('FR-263 marches are counted per pair of provinces, disbands per province; another nation\'s orders are not ours', () => {
    let s = addRegiments(continent(), N1, NW1, ['regulars']);
    s = ordered(
      s,
      march(s, ['1st Regulars', '2nd Regulars'], NW1),
      march(s, ['1st Artillery'], NE1),
      march(s, ['Test Regulars 901'], SW1, NW1)
    );
    s = deepFreeze(s);
    expect(pendingArmyOrders(s, N1)).toEqual({
      marches: [
        { fromProvinceId: NW1, toProvinceId: SW1, count: 1 },
        { fromProvinceId: SW1, toProvinceId: NW1, count: 2 },
        { fromProvinceId: SW1, toProvinceId: NE1, count: 1 },
      ],
      attacks: [],
      disbands: {},
    });
    expect(pendingArmyOrders(s, N2)).toEqual({ marches: [], attacks: [], disbands: {} });
  });

  it('FR-263 a later order for a regiment replaces its earlier one: a disband takes it out of the march, cancelArmyMove out of everything', () => {
    let s = continent();
    s = ordered(s, march(s, ['1st Regulars', '2nd Regulars'], SE1), disband(s, ['2nd Regulars']));
    expect(pendingArmyOrders(s, N1)).toEqual({ marches: [{ fromProvinceId: SW1, toProvinceId: SE1, count: 1 }], attacks: [], disbands: { [SW1]: 1 } });
    s = ordered(s, { kind: 'cancelArmyMove', nationId: N1, regimentIds: [idOf(s, N1, '1st Regulars')] });
    expect(pendingArmyOrders(s, N1)).toEqual({ marches: [], attacks: [], disbands: { [SW1]: 1 } });
  });
});

describe('FR-264 beforeRecruiting: the nation before this turn\'s recruit orders', () => {
  it('FR-264 the cash, armaments, horses and free workers that the recruits took come back; without recruits it is the same nation', () => {
    const s0 = setWarehouse(continent(), N1, { armaments: 3 });
    expect(beforeRecruiting(nationOf(s0, N1))).toBe(nationOf(s0, N1));
    const s = ordered(
      s0,
      { kind: 'setRecruitment', nationId: N1, regiment: 'regulars', count: 1 },
      { kind: 'setRecruitment', nationId: N1, regiment: 'hussars', count: 1 }
    );
    expect([treasury(s, N1), stockOf(s, N1, 'armaments'), stockOf(s, N1, 'horses'), freeWorkersOf(nationOf(s, N1), 'untrained')]).toEqual([9400, 1, 3, 2]);

    const before = beforeRecruiting(nationOf(s, N1));
    expect([before.treasury, before.warehouse.armaments, before.warehouse.horses, freeWorkersOf(before, 'untrained')]).toEqual([10000, 3, 4, 4]);
    expect([recruitingOf(before, 'regulars'), recruitingOf(before, 'hussars')]).toEqual([0, 0]);
    // A read: the state's nation is unchanged
    expect(recruitingOf(nationOf(s, N1), 'regulars')).toBe(1);
  });
});

describe('FR-266 upkeepIn: the upkeep of the nation\'s regiments in one province', () => {
  it('FR-266 a new game: $100 in the capital province, $0 in a militia-only province; the provinces add up to the whole', () => {
    const s = continent();
    expect([upkeepIn(s, N1, SW1), upkeepIn(s, N1, NW1), upkeepIn(s, N1, NE1), upkeepIn(s, N1, SE1)]).toEqual([100, 0, 0, 0]);
    expect(upkeepForecast(s, N1).due).toBe(100);
  });

  it('FR-266 a disband ordered takes its regiments out, a march does not (the upkeep step comes before the marches); another nation\'s regiments do not count', () => {
    let s = addRegiments(continent(), 'nation-2', SW1, ['regulars']);
    s = ordered(s, disband(s, ['1st Artillery']), march(s, ['1st Regulars'], NW1));
    expect([upkeepIn(s, N1, SW1), upkeepIn(s, N1, NW1)]).toEqual([50, 0]);
    expect(upkeepForecast(s, N1).due).toBe(50);
  });
});
