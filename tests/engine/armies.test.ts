// M8 armies on the continent: start forces (FR-203), the army shape, names and sums (FR-204), recruiting (FR-200,
// FR-201), move orders and marching (FR-205, FR-206), disbands (FR-207) and healing (FR-208). The order refusals are
// rows in tests/engine/validate.test.ts; upkeep (FR-202) is tests/engine/upkeep.test.ts.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { applyOrder, tryApplyOrder } from '@/engine/orders/apply';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameEvent } from '@/engine/turn/context';
import type { Order } from '@/engine/orders/Order';
import {
  armyMarkers,
  forceSize,
  freeWorkersOf,
  marchTargets,
  ordinal,
  recruitingOf,
  regimentStatus,
  strength,
  upkeepOf,
} from '@/engine/army/armies';
import { militaryStrength } from '@/engine/diplomacy/queries';
import { transferProvince } from '@/engine/world/provinces';
import type { RegimentType } from '@/types/Unit';
import { MaterialType } from '@/types/Resource';
import type { GameState } from '@/types/GameState';
import type { ArmyMoveIntent, DisbandIntent } from '@/types/Intent';
import { deepFreeze, industryOf, N1, N2, nationOf, setIndustry, setTreasury, setWarehouse, stockOf, tileAt } from './fixtures';
import {
  addRegiments,
  ARVELIA,
  ARVELIA_P,
  armyIn,
  clearArmy,
  continent,
  idOf,
  NE1,
  NE2,
  namesIn,
  NW1,
  NW2,
  patchRegiment,
  regimentNamed,
  regimentsOf,
  relocate,
  SE1,
  SE2,
  SW1,
  SW2,
} from './armyFixtures';

const recruit = (regiment: RegimentType, count: number, nationId = N1): Order => ({ kind: 'setRecruitment', nationId, regiment, count });
const march = (s: GameState, names: string[], fromProvinceId: string, toProvinceId: string, nationId = N1): Order => ({
  kind: 'moveArmy',
  nationId,
  fromProvinceId,
  regimentIds: names.map(n => idOf(s, nationId, n)),
  toProvinceId,
});
const disband = (s: GameState, names: string[], provinceId: string, nationId = N1): Order => ({
  kind: 'disbandRegiments',
  nationId,
  provinceId,
  regimentIds: names.map(n => idOf(s, nationId, n)),
});
/** Applies the orders one after another; each must be accepted. */
function ordered(s: GameState, ...orders: Order[]): GameState {
  return orders.reduce((state, order) => {
    const { state: next, result } = tryApplyOrder(state, order);
    expect(result, order.kind).toEqual({ ok: true });
    return next;
  }, s);
}
const endTurn = (s: GameState) => resolveTurn(s, {}, s.seed);
const ofType = <K extends GameEvent['type']>(events: GameEvent[], type: K) => events.filter((e): e is Extract<GameEvent, { type: K }> => e.type === type);
const serial = (id: string) => Number(id.replace('regiment-', ''));
const minutemen = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${ordinal(from + i)} Minutemen`);

describe('FR-203 start forces on the continent', () => {
  it.each([
    [N1, [NW1, NE1, SW1, SE1]],
    [N2, [NW2, NE2, SW2, SE2]],
  ] as const)('FR-203 %s: 2 Regulars and 1 Artillery in its capital province (force size 4), 4 Minutemen in each of its 4 provinces', (nationId, [nw, ne, sw, se]) => {
    const s = continent();

    expect(s.armies.filter(a => a.ownerId === nationId).map(a => [a.provinceId, a.regiments.map(r => r.name)])).toEqual([
      [nw, minutemen(1, 4)],
      [ne, minutemen(5, 8)],
      [sw, ['1st Regulars', '2nd Regulars', '1st Artillery', ...minutemen(9, 12)]],
      [se, minutemen(13, 16)],
    ]);
    expect(forceSize(armyIn(s, nationId, sw)!)).toBe(4);
  });

  it('FR-203 each minor nation: 3 Minutemen in its province', () => {
    const s = continent();

    expect(s.minorNations.map(m => [m.id, namesIn(s, m.id, `province-${m.id}`)])).toEqual(
      s.minorNations.map(m => [m.id, ['1st Minutemen', '2nd Minutemen', '3rd Minutemen']])
    );
    expect(s.armies).toHaveLength(8 + 4);
  });

  it('FR-203 a level-1 fort on each Great Power capital tile, none on a minor capital (Q30) nor anywhere else', () => {
    const s = continent();

    expect(s.map.tiles.flat().filter(t => (t.fortLevel ?? 0) > 0).map(t => [t.id, t.fortLevel])).toEqual([
      ['2-9', 1],
      ['14-9', 1],
    ]);
    for (const m of s.minorNations) expect(tileAt(s, m.capitalTileId).fortLevel ?? 0).toBe(0);
  });

  it('FR-203 4 horses more in each Great Power\'s start warehouse than on two-islands', () => {
    const c = continent();
    const v1 = newGame({ seed: 1, world: 'two-islands' });

    expect([stockOf(c, N1, 'horses'), stockOf(c, N2, 'horses')]).toEqual([stockOf(v1, N1, 'horses') + 4, stockOf(v1, N2, 'horses') + 4]);
  });

  it('FR-203 two-islands gets no regiment, fort or extra horse', () => {
    const s = newGame({ seed: 1, world: 'two-islands' });

    expect(s.armies).toEqual([]);
    expect(s.map.tiles.flat().filter(t => (t.fortLevel ?? 0) > 0)).toEqual([]);
    expect([stockOf(s, N1, 'horses'), stockOf(s, N2, 'horses')]).toEqual([0, 0]);
  });

  it('FR-203 FR-204 every regiment starts at health 100 with an id no other regiment has', () => {
    const regiments = continent().armies.flatMap(a => a.regiments);

    expect(regiments).toHaveLength(2 * 19 + 4 * 3);
    expect(regiments.every(r => r.health === 100)).toBe(true);
    expect(new Set(regiments.map(r => r.id)).size).toBe(regiments.length);
  });
});

describe('FR-204 armies', () => {
  it('FR-204 an army is { id, ownerId, provinceId, regiments }, a regiment { id, type, name, health }; one army per country per province', () => {
    const s = continent();

    for (const army of s.armies) {
      expect(Object.keys(army).sort()).toEqual(['id', 'ownerId', 'provinceId', 'regiments']);
      for (const r of army.regiments) expect(Object.keys(r).sort()).toEqual(['health', 'id', 'name', 'type']);
    }
    const places = s.armies.map(a => `${a.ownerId} ${a.provinceId}`);
    expect(new Set(places).size).toBe(places.length);
    expect(new Set(s.armies.map(a => a.id)).size).toBe(s.armies.length);
  });

  it('FR-204 FR-206 review R8: a regiment that marched also carries movedOnTurn, the turn it moved; the army keeps its four keys', () => {
    const s = continent();
    const { state } = endTurn(ordered(s, march(s, ['1st Regulars'], SW1, NW1)));

    for (const army of state.armies) expect(Object.keys(army).sort()).toEqual(['id', 'ownerId', 'provinceId', 'regiments']);
    const moved = armyIn(state, N1, NW1)!.regiments.find(r => r.name === '1st Regulars')!;
    expect(Object.keys(moved).sort()).toEqual(['health', 'id', 'movedOnTurn', 'name', 'type']);
    expect(moved.movedOnTurn).toBe(1);
    const stayed = armyIn(state, N1, SW1)!.regiments.find(r => r.name === '2nd Regulars')!;
    expect(Object.keys(stayed).sort()).toEqual(['health', 'id', 'name', 'type']);
  });

  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [11, '11th'], [12, '12th'], [13, '13th'],
    [21, '21st'], [22, '22nd'], [23, '23rd'], [101, '101st'], [111, '111th'], [112, '112th'],
  ])('FR-204 ordinal(%i) is "%s"', (n, text) => {
    expect(ordinal(n)).toBe(text);
  });

  it('FR-204 names are ordinals per owner and type in creation order: the next recruit after a disband takes the next number', () => {
    let s = setWarehouse(continent(), N1, { armaments: 2 });
    s = endTurn(ordered(s, recruit('regulars', 1))).state;
    expect(namesIn(s, N1, SW1).filter(n => !n.endsWith('Minutemen'))).toEqual(['1st Regulars', '2nd Regulars', '1st Artillery', '3rd Regulars']);

    s = endTurn(ordered(s, disband(s, ['3rd Regulars'], SW1), recruit('regulars', 1))).state;

    expect(namesIn(s, N1, SW1).filter(n => n.endsWith('Regulars'))).toEqual(['1st Regulars', '2nd Regulars', '4th Regulars']);
    // Valdoria counts its own: its first recruit is its 3rd Regulars
    let v = setWarehouse(continent(), N2, { armaments: 1 });
    v = endTurn(ordered(v, recruit('regulars', 1, N2))).state;
    expect(namesIn(v, N2, SW2)).toContain('3rd Regulars');
  });

  it('FR-204 forceSize sums the ARMS of the non-militia regiments, strength FPN x health / 100 of them (start army: 4 and 36)', () => {
    const s = continent();
    const capital = armyIn(s, N1, SW1)!;

    expect([forceSize(capital), strength(capital.regiments)]).toEqual([4, 36]);
    const hurt = patchRegiment(s, idOf(s, N1, '1st Artillery'), { health: 50 });
    expect(strength(armyIn(hurt, N1, SW1)!.regiments)).toBe(28);
    expect([forceSize(armyIn(s, N1, NW1)!), strength(armyIn(s, N1, NW1)!.regiments)]).toEqual([0, 0]);
  });

  it('FR-204 review E2: equal strengths compare equal: Grenadiers at 10 and 20 health (1.2 + 2.4) against one at 30 (3.6)', () => {
    const grenadiers = (...healths: number[]) => healths.map((health, i) => ({ id: `regiment-${900 + i}`, type: 'grenadiers' as const, name: `g${i}`, health }));

    expect(strength(grenadiers(10, 20))).toBe(strength(grenadiers(30)));
    expect(strength(grenadiers(10, 20))).toBe(3.6);
  });

  it('FR-204 the nations carry no army list (Nation.armies is removed)', () => {
    const s = continent();

    for (const nation of s.nations) expect(Object.hasOwn(nation, 'armies')).toBe(false);
  });

  it('FR-204 armyMarkers (the FR-210 markers): one per country with regiments in a province, on its seat tile, with force size, regiments and militia', () => {
    const s = continent();
    const markers = armyMarkers(s);

    expect(markers).toHaveLength(12);
    expect(markers.filter(m => m.provinceId === SW1)).toEqual([{ provinceId: SW1, seatTileId: '2-9', ownerId: N1, forceSize: 4, regiments: 3, militia: 4 }]);
    expect(markers.filter(m => m.provinceId === ARVELIA_P)).toEqual([{ provinceId: ARVELIA_P, seatTileId: '11-4', ownerId: ARVELIA, forceSize: 0, regiments: 0, militia: 3 }]);
    // a second country in the province gets its own marker
    const visiting = addRegiments(s, N1, ARVELIA_P, ['regulars']);
    expect(armyMarkers(visiting).filter(m => m.provinceId === ARVELIA_P).map(m => [m.ownerId, m.forceSize, m.regiments, m.militia])).toEqual([
      [ARVELIA, 0, 0, 3],
      [N1, 1, 1, 0],
    ]);
  });
});

describe('FR-200 recruiting', () => {
  const armaments = (s: GameState, nationId = N1) => stockOf(s, nationId, 'armaments');
  const snapshot = (s: GameState) => ({
    treasury: nationOf(s, N1).treasury,
    armaments: armaments(s),
    horses: stockOf(s, N1, 'horses'),
    workers: { ...industryOf(s, N1).workers },
    ordered: recruitingOf(nationOf(s, N1), 'regulars'),
  });

  it('FR-200 the example: $10,000, 2 armaments, 4 untrained workers: 2 Regulars leave $9,000, 0 armaments, 2 untrained; a third is refused', () => {
    const s = setWarehouse(continent(), N1, { armaments: 2 });
    expect(industryOf(s, N1).workers.untrained).toBe(4);

    const two = tryApplyOrder(s, recruit('regulars', 2));

    expect(two.result).toEqual({ ok: true });
    expect(snapshot(two.state)).toEqual({ treasury: 9000, armaments: 0, horses: 4, workers: { untrained: 2, trained: 2, expert: 1 }, ordered: 2 });
    expect(tryApplyOrder(two.state, recruit('regulars', 3)).result).toEqual({ ok: false, reason: 'insufficient-resources' });
  });

  it('FR-200 lowering the count gives the cash, armaments and workers back', () => {
    const s = setWarehouse(continent(), N1, { armaments: 2 });
    const start = snapshot(s);

    const one = ordered(s, recruit('regulars', 2), recruit('regulars', 1));
    expect(snapshot(one)).toEqual({ ...start, treasury: 9500, armaments: 1, workers: { untrained: 3, trained: 2, expert: 1 }, ordered: 1 });
    expect(snapshot(ordered(one, recruit('regulars', 0)))).toEqual(start);
  });

  it('FR-200 a Light Artillery takes $1,000, 2 armaments, a horse and a trained worker at once', () => {
    const s = setWarehouse(continent(), N1, { armaments: 2 });

    const after = ordered(s, recruit('lightArtillery', 1));

    expect([nationOf(after, N1).treasury, armaments(after), stockOf(after, N1, 'horses'), industryOf(after, N1).workers]).toEqual([
      9000, 0, 3, { untrained: 4, trained: 1, expert: 1 },
    ]);
    expect(recruitingOf(nationOf(after, N1), 'lightArtillery')).toBe(1);
  });

  it('FR-200 refusals by what is short: cash, then armaments or horses, then a free worker of the grade', () => {
    const s = setWarehouse(continent(), N1, { armaments: 2 });

    expect(tryApplyOrder(setTreasury(s, N1, 499), recruit('regulars', 1)).result).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect(tryApplyOrder(setWarehouse(s, N1, { horses: 0 }), recruit('hussars', 1)).result).toEqual({ ok: false, reason: 'insufficient-resources' });
    const sick = setIndustry(s, N1, { sick: { untrained: 4, trained: 0, expert: 0 } });
    expect(tryApplyOrder(sick, recruit('regulars', 1)).result).toEqual({ ok: false, reason: 'insufficient-labour' });
  });

  it('FR-200 FR-116 a worker whose labour the production plan uses is not free: refused with insufficient-labour', () => {
    // Labour 2, all of it committed to 1 lumber; the 2 untrained workers are healthy but none is free.
    let s = setIndustry(setWarehouse(continent(), N1, { armaments: 2 }), N1, { workers: { untrained: 2, trained: 0, expert: 0 } });
    s = ordered(s, { kind: 'setProduction', nationId: N1, building: 'lumberMill', output: MaterialType.Lumber, amount: 1 });

    expect(freeWorkersOf(nationOf(s, N1), 'untrained')).toBe(0);
    expect(tryApplyOrder(s, recruit('regulars', 1)).result).toEqual({ ok: false, reason: 'insufficient-labour' });
  });

  it('FR-200 freeWorkersOf (for the FR-212 Armoury): the healthy workers of the grade whose labour the plan leaves free', () => {
    const s = continent();

    expect(['untrained', 'trained', 'expert'].map(g => freeWorkersOf(nationOf(s, N1), g as 'untrained'))).toEqual([4, 2, 1]);
    const sick = setIndustry(s, N1, { sick: { untrained: 1, trained: 2, expert: 0 } });
    expect(['untrained', 'trained', 'expert'].map(g => freeWorkersOf(nationOf(sick, N1), g as 'untrained'))).toEqual([3, 0, 1]);
  });

  it('FR-200 a refused order changes nothing (the same state object comes back)', () => {
    const s = deepFreeze(continent());

    expect(tryApplyOrder(s, recruit('regulars', 1)).state).toBe(s); // no armaments
  });
});

describe('FR-201 new regiments', () => {
  it('FR-201 at End Turn a recruit joins the army in the capital province at health 100, named; one event per type; its worker never returns', () => {
    const s = setWarehouse(continent(), N1, { armaments: 2 });

    const { state, events } = endTurn(ordered(s, recruit('regulars', 1), recruit('skirmishers', 1)));

    expect(namesIn(state, N1, SW1)).toEqual(['1st Regulars', '2nd Regulars', '1st Artillery', ...minutemen(9, 12), '1st Skirmishers', '3rd Regulars']);
    expect(regimentNamed(state, N1, '3rd Regulars')).toMatchObject({ type: 'regulars', health: 100, provinceId: SW1 });
    expect(ofType(events, 'regiments-recruited')).toEqual([
      { type: 'regiments-recruited', nationId: N1, regiment: 'skirmishers', count: 1 },
      { type: 'regiments-recruited', nationId: N1, regiment: 'regulars', count: 1 },
    ]);
    expect(recruitingOf(nationOf(state, N1), 'regulars')).toBe(0);
    expect(industryOf(state, N1).workers.untrained).toBe(2);
    // the cash: $500 + $200 when ordered, then the start army's upkeep ($100); the recruits pay from next turn (FR-202)
    expect(nationOf(state, N1).treasury).toBe(10000 - 700 - 100);
  });

  it('FR-201 the new regiments are the newest: their ids come after every other regiment\'s', () => {
    const s = setWarehouse(continent(), N1, { armaments: 2 });

    const { state } = endTurn(ordered(s, recruit('regulars', 2)));

    const ids = state.armies.flatMap(a => a.regiments).map(r => serial(r.id));
    const recruits = ['3rd Regulars', '4th Regulars'].map(n => serial(idOf(state, N1, n)));
    expect(Math.min(...recruits)).toBeGreaterThan(Math.max(...ids.filter(id => !recruits.includes(id))));
  });

  it('FR-201 review R4, E4: a nation that no longer holds its capital province at End Turn raises none; the cash, armaments and workers come back, with recruits-refunded', () => {
    const s = setWarehouse(continent(), N1, { armaments: 2 });
    const before = { treasury: nationOf(s, N1).treasury, armaments: stockOf(s, N1, 'armaments'), workers: { ...industryOf(s, N1).workers } };
    const recruiting = ordered(s, recruit('regulars', 1), recruit('skirmishers', 1));

    // M9's combat phase may take the capital province in the same End Turn; here it changes hands before End Turn
    const { state, events } = endTurn(transferProvince(recruiting, SW1, N2));

    expect(ofType(events, 'regiments-recruited')).toEqual([]);
    expect(ofType(events, 'recruits-refunded')).toEqual([
      { type: 'recruits-refunded', nationId: N1, regiment: 'skirmishers', count: 1 },
      { type: 'recruits-refunded', nationId: N1, regiment: 'regulars', count: 1 },
    ]);
    expect(namesIn(state, N1, SW1)).toEqual(['1st Regulars', '2nd Regulars', '1st Artillery', ...minutemen(9, 12)]);
    // everything back; the start army's upkeep ($100) is still paid
    expect({ treasury: nationOf(state, N1).treasury, armaments: stockOf(state, N1, 'armaments'), workers: industryOf(state, N1).workers }).toEqual({
      ...before,
      treasury: before.treasury - 100,
    });
    expect(nationOf(state, N1).recruiting).toBeUndefined();
  });

  it('FR-201 they join after the combat phase: a march ordered the same turn is reported first', () => {
    const s = setWarehouse(continent(), N1, { armaments: 1 });

    const { events } = endTurn(ordered(s, recruit('regulars', 1), march(s, ['1st Regulars'], SW1, NW1)));

    const types = events.map(e => e.type);
    expect(types.indexOf('army-moved')).toBeGreaterThanOrEqual(0);
    expect(types.indexOf('army-moved')).toBeLessThan(types.indexOf('regiments-recruited'));
  });
});

describe('FR-205 move orders', () => {
  const moveIntents = (s: GameState) =>
    s.intents.filter((i): i is ArmyMoveIntent => i.kind === 'army-move').map(i => ({ ...i, id: undefined, turn: undefined }));

  it('FR-205 moveArmy stores a move intent and changes no army', () => {
    const s = continent();

    const after = ordered(s, march(s, ['1st Regulars', '2nd Regulars'], SW1, NW1));

    expect(moveIntents(after)).toEqual([
      { id: undefined, turn: undefined, kind: 'army-move', nationId: N1, fromProvinceId: SW1, toProvinceId: NW1, regimentIds: [idOf(s, N1, '1st Regulars'), idOf(s, N1, '2nd Regulars')] },
    ]);
    expect(after.armies).toEqual(s.armies);
  });

  it('FR-205 a later moveArmy for a regiment replaces its earlier one; the other regiments keep theirs', () => {
    const s = continent();

    const after = ordered(s, march(s, ['1st Regulars', '2nd Regulars'], SW1, NW1), march(s, ['2nd Regulars'], SW1, SE1));

    expect(moveIntents(after).map(i => [i.toProvinceId, i.regimentIds])).toEqual([
      [NW1, [idOf(s, N1, '1st Regulars')]],
      [SE1, [idOf(s, N1, '2nd Regulars')]],
    ]);
  });

  it('FR-205 cancelArmyMove removes the regiments from their move intents; an intent left empty is dropped', () => {
    const s = continent();
    const moving = ordered(s, march(s, ['1st Regulars', '2nd Regulars'], SW1, NW1));

    const one = ordered(moving, { kind: 'cancelArmyMove', nationId: N1, regimentIds: [idOf(s, N1, '1st Regulars')] });
    expect(moveIntents(one).map(i => i.regimentIds)).toEqual([[idOf(s, N1, '2nd Regulars')]]);
    const none = ordered(one, { kind: 'cancelArmyMove', nationId: N1, regimentIds: [idOf(s, N1, '2nd Regulars')] });
    expect(none.intents).toEqual([]);
  });

  it('FR-205 regimentStatus (for the FR-211 Army screen): defending (militia), available, marching to, disband ordered', () => {
    const s = continent();
    const after = ordered(s, march(s, ['1st Regulars'], SW1, NW1), disband(s, ['1st Artillery'], SW1));

    expect(regimentStatus(after, idOf(s, N1, '9th Minutemen'))).toEqual({ kind: 'defending' });
    expect(regimentStatus(after, idOf(s, N1, '2nd Regulars'))).toEqual({ kind: 'available' });
    expect(regimentStatus(after, idOf(s, N1, '1st Regulars'))).toEqual({ kind: 'marching', toProvinceId: NW1 });
    expect(regimentStatus(after, idOf(s, N1, '1st Artillery'))).toEqual({ kind: 'disband-ordered' });
    expect(regimentStatus(after, 'regiment-unknown')).toBeUndefined();
  });

  it('FR-205 marchTargets (for the FR-211 "March to"): the bordering provinces of the nation, in state order; no foreign one in M8', () => {
    const s = continent();

    expect(marchTargets(s, N1, SW1).map(p => p.id)).toEqual([NW1, NE1, SE1]);
    expect(marchTargets(s, N1, NE1).map(p => p.id)).toEqual([NW1, SW1, SE1]);
    expect(marchTargets(s, N2, NW2).map(p => p.id)).toEqual([NE2, SW2]);
  });
});

describe('FR-206 marching', () => {
  it('FR-206 in the combat phase the regiments move one province and join the army there; army-moved; marked as moved this turn', () => {
    const s = continent();

    const { state, events } = endTurn(ordered(s, march(s, ['1st Regulars', '2nd Regulars', '1st Artillery'], SW1, NE1)));

    expect(namesIn(state, N1, SW1)).toEqual(minutemen(9, 12));
    expect(namesIn(state, N1, NE1)).toEqual(['1st Regulars', '2nd Regulars', '1st Artillery', ...minutemen(5, 8)]);
    expect(ofType(events, 'army-moved')).toEqual([{ type: 'army-moved', nationId: N1, fromProvinceId: SW1, toProvinceId: NE1, count: 3 }]);
    expect(['1st Regulars', '2nd Regulars', '1st Artillery'].map(n => regimentNamed(state, N1, n).movedOnTurn)).toEqual([1, 1, 1]);
    expect(regimentNamed(state, N1, '5th Minutemen').movedOnTurn).toBeUndefined();
    expect(state.intents).toEqual([]);
  });

  it('FR-206 the moves resolve together: two armies may swap provinces', () => {
    const s = relocate(continent(), [idOf(continent(), N1, '1st Regulars')], NW1);

    const { state } = endTurn(ordered(s, march(s, ['2nd Regulars', '1st Artillery'], SW1, NW1), march(s, ['1st Regulars'], NW1, SW1)));

    expect(namesIn(state, N1, SW1)).toEqual(['1st Regulars', ...minutemen(9, 12)]);
    expect(namesIn(state, N1, NW1)).toEqual(['2nd Regulars', '1st Artillery', ...minutemen(1, 4)]);
  });

  it('FR-204 FR-206 a move into a province with no army of the nation makes one; an army left without regiments is removed', () => {
    const s = clearArmy(continent(), N1, NW1);

    const { state } = endTurn(ordered(s, march(s, ['1st Regulars'], SW1, NW1)));
    expect(namesIn(state, N1, NW1)).toEqual(['1st Regulars']);

    const back = endTurn(ordered(state, march(state, ['1st Regulars'], NW1, SW1))).state;
    expect(armyIn(back, N1, NW1)).toBeUndefined();
    expect(back.armies.every(a => a.regiments.length > 0)).toBe(true);
  });

  it('FR-206 checked again when resolved: a move into a province the nation no longer owns does not happen (M9 makes it an attack)', () => {
    const s = continent();
    const moving = ordered(s, march(s, ['1st Regulars'], SW1, NW1));

    const { state, events } = endTurn(transferProvince(moving, NW1, N2));

    expect(regimentNamed(state, N1, '1st Regulars').provinceId).toBe(SW1);
    expect(ofType(events, 'army-moved')).toEqual([]);
  });

  it('FR-206 one event per nation and route, with the regiments of every order on it', () => {
    const s = continent();

    const { events } = endTurn(ordered(s, march(s, ['1st Regulars'], SW1, NW1), march(s, ['2nd Regulars'], SW1, NW1), march(s, ['1st Artillery'], SW1, SE1)));

    expect(ofType(events, 'army-moved').map(e => [e.toProvinceId, e.count])).toEqual([
      [NW1, 2],
      [SE1, 1],
    ]);
  });
});

describe('FR-207 disband', () => {
  it('FR-207 the regiments go at End Turn before the upkeep step, with no cash, armaments or worker back', () => {
    const s = continent();
    const before = { treasury: nationOf(s, N1).treasury, workers: industryOf(s, N1).workers, armaments: stockOf(s, N1, 'armaments') };
    const after = ordered(s, disband(s, ['2nd Regulars', '1st Artillery'], SW1));
    expect(after.armies).toEqual(s.armies);

    const { state, events } = endTurn(after);

    expect(namesIn(state, N1, SW1)).toEqual(['1st Regulars', ...minutemen(9, 12)]);
    expect(ofType(events, 'regiments-disbanded')).toEqual([{ type: 'regiments-disbanded', nationId: N1, reason: 'order', count: 2 }]);
    // upkeep is charged on what is left: 1 arms, $25
    expect(ofType(events, 'army-upkeep').filter(e => e.nationId === N1)).toEqual([{ type: 'army-upkeep', nationId: N1, amount: 25 }]);
    expect({ treasury: nationOf(state, N1).treasury, workers: industryOf(state, N1).workers, armaments: stockOf(state, N1, 'armaments') }).toEqual({
      ...before,
      treasury: before.treasury - 25,
    });
  });

  it('FR-207 review F4: cancelDisband takes the regiments out of their disband intents; they stay at End Turn and the upkeep counts them', () => {
    const s = continent();
    const disbanding = ordered(s, disband(s, ['2nd Regulars', '1st Artillery'], SW1));

    const one = ordered(disbanding, { kind: 'cancelDisband', nationId: N1, regimentIds: [idOf(s, N1, '1st Artillery')] });
    expect(one.intents.map(i => [i.kind, (i as DisbandIntent).regimentIds])).toEqual([['disband', [idOf(s, N1, '2nd Regulars')]]]);
    expect(regimentStatus(one, idOf(s, N1, '1st Artillery'))).toEqual({ kind: 'available' });

    const { state, events } = endTurn(one);
    expect(namesIn(state, N1, SW1)).toEqual(['1st Regulars', '1st Artillery', ...minutemen(9, 12)]);
    expect(ofType(events, 'army-upkeep').filter(e => e.nationId === N1)).toEqual([{ type: 'army-upkeep', nationId: N1, amount: 75 }]);
    // cancelling the last one leaves no intent
    expect(ordered(one, { kind: 'cancelDisband', nationId: N1, regimentIds: [idOf(s, N1, '2nd Regulars')] }).intents).toEqual([]);
  });

  it('FR-205 FR-207 one pending order per regiment: a disband replaces its march, a march replaces its disband', () => {
    const s = continent();
    const r1 = idOf(s, N1, '1st Regulars');

    const disbanded = ordered(s, march(s, ['1st Regulars'], SW1, NW1), disband(s, ['1st Regulars'], SW1));
    expect(disbanded.intents.map(i => i.kind)).toEqual(['disband']);
    expect(regimentStatus(disbanded, r1)).toEqual({ kind: 'disband-ordered' });

    const marching = ordered(disbanded, march(s, ['1st Regulars'], SW1, NW1));
    expect(marching.intents.map(i => i.kind)).toEqual(['army-move']);
    expect(regimentStatus(marching, r1)).toEqual({ kind: 'marching', toProvinceId: NW1 });
  });
});

describe('FR-208 healing', () => {
  it('FR-208 at the end of the combat phase each regiment that did not move gains 10 health, up to 100; one that moved does not', () => {
    let s = continent();
    s = patchRegiment(s, idOf(s, N1, '1st Regulars'), { health: 50 });
    s = patchRegiment(s, idOf(s, N1, '2nd Regulars'), { health: 50 });
    s = patchRegiment(s, idOf(s, N1, '1st Artillery'), { health: 95 });
    s = patchRegiment(s, idOf(s, ARVELIA, '1st Minutemen'), { health: 30 });

    const { state } = endTurn(ordered(s, march(s, ['2nd Regulars'], SW1, NW1)));

    expect(['1st Regulars', '2nd Regulars', '1st Artillery'].map(n => regimentNamed(state, N1, n).health)).toEqual([60, 50, 100]);
    expect(regimentNamed(state, ARVELIA, '1st Minutemen').health).toBe(40);
    // the turn after, the regiment that moved heals again
    expect(regimentNamed(endTurn(state).state, N1, '2nd Regulars').health).toBe(60);
  });
});

describe('FR-200 to FR-208 the army orders and phases are pure', () => {
  it('FR-205 FR-207 applying army orders and resolving the turn leave a deep-frozen state unchanged', () => {
    const s = deepFreeze(setWarehouse(continent(), N1, { armaments: 1 }));
    const snapshot = structuredClone(s);

    const after = applyOrder(applyOrder(applyOrder(s, recruit('regulars', 1)), march(s, ['1st Regulars'], SW1, NW1)), disband(s, ['1st Artillery'], SW1));
    endTurn(deepFreeze(after));

    expect(s).toEqual(snapshot);
    expect(regimentsOf(after, N1)).toEqual(regimentsOf(s, N1));
  });

  it('FR-201 FR-206 the same orders on the same state give the same armies', () => {
    const s = setWarehouse(continent(), N1, { armaments: 1 });
    const orders = [recruit('regulars', 1), march(s, ['1st Regulars'], SW1, NW1)];

    expect(endTurn(ordered(s, ...orders)).state.armies).toEqual(endTurn(ordered(s, ...orders)).state.armies);
  });

  it('FR-202 FR-204 FR-206 review R9: an army in another country\'s province (M9\'s case) is its owner\'s: counted in its strength and upkeep, kept apart from the owner\'s army there, and healed', () => {
    // two Testland Regulars in Arvelia, one hurt; Arvelia's 3 Minutemen stay its own army
    let s = addRegiments(continent(), N1, ARVELIA_P, ['regulars', 'regulars']);
    s = patchRegiment(s, 'regiment-902', { health: 50 });

    expect(militaryStrength(s, N1)).toBe(36 + 15);
    expect(upkeepOf(s, N1)).toBe(100 + 50);
    expect(s.armies.filter(a => a.provinceId === ARVELIA_P).map(a => `${a.ownerId} ${a.regiments.length}`).sort()).toEqual([`${ARVELIA} 3`, `${N1} 2`]);
    // the turn heals it and charges its upkeep; it does not join or move the minor's army
    const { state, events } = endTurn(s);
    expect(armyIn(state, N1, ARVELIA_P)!.regiments.map(r => r.health)).toEqual([100, 60]);
    expect(namesIn(state, ARVELIA, ARVELIA_P)).toEqual(['1st Minutemen', '2nd Minutemen', '3rd Minutemen']);
    expect(ofType(events, 'army-upkeep').filter(e => e.nationId === N1)).toEqual([{ type: 'army-upkeep', nationId: N1, amount: 150 }]);
  });
});
