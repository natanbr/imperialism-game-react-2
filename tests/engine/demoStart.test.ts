import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { DEMO_START } from '@/engine/world/demoStart';
import { validateOrder } from '@/engine/orders/validate';
import { armyAt, capitalProvinceOf } from '@/engine/army/armies';
import type { Order } from '@/engine/orders/Order';
import { REGIMENTS } from '@/definisions/regiments';
import { WARSHIPS } from '@/definisions/ships';
import { createGameStore } from '@/store/rootStore';
import { readSave, saveOf } from '@/store/persistence';
import { replaySession } from '@/store/sessionReplay';
import type { GameState } from '@/types/GameState';
import type { Nation } from '@/types/Nation';
import { SUNDMARK } from './armyFixtures';

/** JSON with every object's keys sorted, so a digest does not depend on property insertion order. */
const canonical = (value: unknown) => JSON.stringify(value, (_key, v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : v);
const digest = (state: GameState) => createHash('sha256').update(canonical(state)).digest('hex');

const human = (s: GameState): Nation => s.nations.find(n => n.controller === 'human')!;
const regimentsOf = (s: GameState, nationId: string) => s.armies.filter(a => a.ownerId === nationId).flatMap(a => a.regiments);
const countByType = (s: GameState, nationId: string) =>
  regimentsOf(s, nationId).reduce<Record<string, number>>((count, r) => ({ ...count, [r.type]: (count[r.type] ?? 0) + 1 }), {});

const normal = () => newGame({ seed: 1, world: 'continent' });
const demo = () => newGame({ seed: 1, world: 'continent', difficulty: 'demo' });

describe('FR-561 NR-037 a Normal new game is unchanged', () => {
  // Recorded on main 65a4d5a (before FR-561) with this digest: a Normal start must not move by one byte
  it.each([
    ['continent, partners market', { seed: 1, world: 'continent' as const }, '9e31311b7f12c998c061fee51215cb34bfc98353474240a794bc720c01dfbb10'],
    ['continent, world market', { seed: 1, world: 'continent' as const, market: 'world' as const }, '9946ab8acacae66b7979f5d994cd587d3fa3000721679eed79e668ce09352c48'],
    ['two-islands', { seed: 7 }, '457923485ab07eb99d7ca5a436886d0829fae8ffd0f16f7306994a2a6cc0cff3'],
  ])('FR-561 NR-037 %s: the same state as on main', (_name, options, recorded) => {
    expect(digest(newGame(options))).toBe(recorded);
    expect(newGame({ ...options, difficulty: 'normal' })).toEqual(newGame(options));
    expect(newGame(options).difficulty).toBe('normal');
  });
});

describe('FR-561 the Demo level', () => {
  it('FR-561 the human nation starts with the Demo cash, the war chest, the extra regiments and a Frigate at its home berth', () => {
    const [n, d] = [normal(), demo()];
    const [before, after] = [human(n), human(d)];
    expect(after.id).toBe(d.nations[0].id);
    expect(d.difficulty).toBe('demo');

    expect(DEMO_START.cashMultiplier).toBeGreaterThan(1);
    expect(after.treasury).toBe(before.treasury * DEMO_START.cashMultiplier);

    const warehouse: Record<string, number> = { ...before.warehouse };
    for (const [key, extra] of Object.entries(DEMO_START.extraStock)) warehouse[key] += extra;
    expect(after.warehouse).toEqual(warehouse);
    // Enough for one more Frigate and one more regiment of every recruitable kind that needs horses
    for (const key of ['armaments', 'lumber', 'fabric'] as const) expect(after.warehouse[key]).toBeGreaterThanOrEqual(WARSHIPS.frigate[key]);
    expect(after.warehouse.horses).toBeGreaterThan(before.warehouse.horses);

    const counts = { ...countByType(n, before.id) };
    for (const [type, extra] of DEMO_START.extraRegiments) counts[type] = (counts[type] ?? 0) + extra;
    expect(countByType(d, after.id)).toEqual(counts);
    const extra = DEMO_START.extraRegiments.reduce((sum, [, count]) => sum + count, 0);
    expect(extra).toBeGreaterThanOrEqual(2);
    expect(regimentsOf(d, after.id)).toHaveLength(regimentsOf(n, before.id).length + extra);
    // The extra regiments join the field army in the capital province, at full health
    const capital = capitalProvinceOf(d, after.id)!.id;
    const raised = regimentsOf(d, after.id).filter(r => !regimentsOf(n, before.id).some(o => o.id === r.id));
    expect(raised.map(r => armyAt(d, after.id, capital)!.regiments.includes(r))).toEqual(raised.map(() => true));
    expect(raised.every(r => r.health === 100)).toBe(true);
    // Unique ids, after every start regiment
    const ids = d.armies.flatMap(a => a.regiments.map(r => r.id));
    expect(new Set(ids).size).toBe(ids.length);

    expect(n.fleets).toEqual([]);
    expect(d.fleets).toHaveLength(1);
    const [fleet] = d.fleets;
    expect(fleet).toMatchObject({ ownerNationId: after.id, location: 'berth', aggression: 'normal' });
    expect(fleet.approach).toBeUndefined();
    expect(fleet.ships).toHaveLength(DEMO_START.frigates);
    const { firepower, range, armour, hull, battleMove, speed, type } = WARSHIPS.frigate;
    for (const ship of fleet.ships) expect(ship).toMatchObject({ type, firepower, range, armour, hull, battleMove, speed, experience: 0 });
    expect(after.fleets).toEqual([fleet.id]);

    // Nothing else of the human nation changes
    expect({ ...after, treasury: before.treasury, warehouse: before.warehouse, fleets: before.fleets }).toEqual(before);
  });

  it('FR-561 NR-037 every other nation, the minors and the world start as on Normal', () => {
    const [n, d] = [normal(), demo()];
    const id = human(n).id;
    expect(d.nations.filter(x => x.id !== id)).toEqual(n.nations.filter(x => x.id !== id));
    expect(d.armies.filter(a => a.ownerId !== id)).toEqual(n.armies.filter(a => a.ownerId !== id));
    expect(d.fleets.filter(f => f.ownerNationId !== id)).toEqual([]);
    const othersRaised = (s: GameState) => Object.entries(s.regimentsRaised ?? {}).filter(([owner]) => owner !== id);
    expect(othersRaised(d)).toEqual(othersRaised(n));
    expect(othersRaised(n).length).toBeGreaterThan(0);
    const rest = (s: GameState) => ({ ...s, nations: [], armies: [], fleets: [], regimentsRaised: {}, difficulty: 'normal' });
    expect(rest(d)).toEqual(rest(n));
  });

  it('FR-561 on two-islands (no provinces) Demo adds the cash and the war chest only', () => {
    const [n, d] = [newGame({ seed: 7 }), newGame({ seed: 7, difficulty: 'demo' })];
    expect(human(d).treasury).toBe(human(n).treasury * DEMO_START.cashMultiplier);
    expect(d.armies).toEqual([]);
    expect(d.fleets).toEqual([]);
  });
});

describe('FR-561 a war and a landing in the first ten turns', () => {
  const island = 'province-minor-2';
  const ok = { ok: true };

  it('FR-561 a Demo human declares war on an island, sails its Frigate, stations it and lands two regiments before turn 10; the save replays', () => {
    const store = createGameStore({ seed: 1 });
    store.getState().startNewGame({ seed: 1, difficulty: 'demo' });
    const nationId = store.getState().activeNationId;
    const submit = (order: Order) => expect(store.getState().submitOrder(order)).toEqual(ok);
    const events = () => store.getState().eventLog.at(-1)!.events;
    const game = () => store.getState().game;

    // On Normal the same war is refused on turn 1: no warship to carry an army to the island
    const war: Order = { kind: 'proposeOverture', overture: 'war', nationId, targetId: SUNDMARK };
    expect(validateOrder(normal(), war).ok).toBe(false);

    const fleetId = game().fleets[0].id;
    submit(war);
    submit({ kind: 'setFleetMission', nationId, fleetId, mission: 'sail', provinceId: island });
    store.getState().advanceTurn();
    expect(events()).toContainEqual(expect.objectContaining({ type: 'war-declared', nationId, targetId: SUNDMARK }));
    expect(game().fleets.find(f => f.id === fleetId)?.approach?.provinceId).toBe(island);

    submit({ kind: 'setFleetMission', nationId, fleetId, mission: 'station' });
    store.getState().advanceTurn();
    expect(game().fleets.find(f => f.id === fleetId)?.siteSinceTurn).toBe(game().turn - 1);

    // The Frigate carries 2 ARMS: two Regulars of the capital's field army
    const from = capitalProvinceOf(game(), nationId)!.id;
    const landing = armyAt(game(), nationId, from)!.regiments.filter(r => r.type === 'regulars').slice(0, 2).map(r => r.id);
    expect(landing).toHaveLength(2);
    expect(landing.length * REGIMENTS.regulars.stats.armamentsCost).toBeLessThanOrEqual(WARSHIPS.frigate.armaments);
    submit({ kind: 'moveArmy', via: 'sea', nationId, fromProvinceId: from, toProvinceId: island, regimentIds: landing });
    const landingTurn = game().turn;
    store.getState().advanceTurn();
    expect(landingTurn).toBeLessThan(10);
    const battle = events().find(e => e.type === 'battle-resolved');
    expect(battle).toBeDefined();
    expect(battle!.regiments.filter(r => r.side === 'attacker').map(r => r.id).sort()).toEqual([...landing].sort());

    const slot = readSave({ getItem: () => JSON.stringify(saveOf(store.getState())) });
    if (slot.kind !== 'usable') throw new Error('Demo save was unusable');
    expect(slot.save.game.difficulty).toBe('demo');
    expect(replaySession(slot.save)).toEqual(slot.save.game);
  });
});
