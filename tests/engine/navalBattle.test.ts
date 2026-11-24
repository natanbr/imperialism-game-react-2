import { expect, it } from 'vitest';
import { WARSHIPS } from '@/definisions/ships';
import { withFleets } from '@/engine/navy/fleets';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order, SetFleetMissionOrder } from '@/engine/orders/Order';
import { interceptionsSystem } from '@/engine/systems/interceptionsSystem';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { readSave, saveOf } from '@/store/persistence';
import { createGameStore } from '@/store/rootStore';
import { replaySession } from '@/store/sessionReplay';
import type { OrderLogEntry, TurnReport } from '@/store/gameSlice';
import { GoodsType, MaterialType } from '@/types/Resource';
import type { GameState } from '@/types/GameState';
import { ShipType, type Fleet, type Ship } from '@/types/Navy';
import { continent, N3, threePowers } from './armyFixtures';
import { N1, N2, deepFreeze, setPair, setWarehouse } from './fixtures';
import { navalTurn } from './sim/navalMeasurement';

const approach = { provinceId: 'province-minor-2', seaId: '0-0' };
const war = (state: GameState, a = N1, b = N2) => setPair(state, a, b, { war: { since: 1, aggressors: [a] } });
const ship = (id: string, changes: Partial<Ship> = {}): Ship => ({
  ...WARSHIPS.frigate, id, experience: 0, ...changes,
});
const fleet = (nationId: string, ...ships: Ship[]): Fleet => ({
  id: 'fleet-' + nationId, name: nationId + ' squadron', ownerNationId: nationId,
  location: approach.seaId, approach, aggression: 'normal', ships,
});
const battle = (...fleets: Fleet[]) => withFleets(war(continent()), fleets);
const sail = (f: Fleet): SetFleetMissionOrder => ({
  kind: 'setFleetMission', nationId: f.ownerNationId, fleetId: f.id, mission: 'sail', provinceId: approach.provinceId,
});

// A fixed draw makes the hit boundary and volley timing observable; other cases use the real seeded stream.
function contact(state: GameState, fixedDraw?: number) {
  const events: GameEvent[] = [];
  const ctx = createTurnContext({ turn: state.turn, seed: state.seed, emit: e => events.push(e) });
  const next = interceptionsSystem(deepFreeze(state), fixedDraw === undefined ? ctx : { ...ctx, rngFor: () => ({ next: () => fixedDraw }) });
  return { state: next, reports: events.filter(e => e.type === 'naval-engagement') };
}

it('FR-552/559 counts repeat contact for each participant while keeping an unchanged contested approach quiet', () => {
  const start = deepFreeze({ ...withFleets(war(threePowers()), [fleet(N1, ship('one')), fleet(N2, ship('two'))]), seed: 2849 });
  const first = resolveTurn(start, {});
  const second = resolveTurn(first.state, {});
  const reports = (events: GameEvent[]) => events.filter(e => e.type === 'naval-engagement');
  expect(reports(first.events)).toHaveLength(1);
  expect(first.state.fleets.every(f => f.contested && !f.ships[0].hullDamage)).toBe(true);
  expect(second.state.fleets).toEqual(first.state.fleets);
  expect(reports(second.events)).toEqual([]);
  expect(contact(second.state, 0).reports[0]?.sides[0].ships?.[0].hullAfter).toBeLessThan(35);
  for (const [before, turn] of [[start, first], [first.state, second]] as const) {
    expect(turn.navalEngagements).toEqual([{ ...approach, rounds: 3, nationIds: [N1, N2] }]);
    expect([N1, N2, N3].map(id => navalTurn(before, turn, id, before).engagements))
      .toEqual([1, 1, 0]);
  }
});

it.each([[0.4999, 3], [0.5, 0]])('FR-552 resolves three volleys at the 50%% hit boundary (draw %f)', (draw, hits) => {
  const base = battle(fleet(N1, ship('one', { firepower: 12 })), fleet(N2, ship('two')));
  const { state, reports } = contact(base, draw);
  expect(reports).toHaveLength(1);
  expect(reports[0]).toMatchObject({
    rounds: 3, winnerId: N1, landing: 'none',
    sides: [
      { nationId: N1, firepower: 12, ships: [{ id: 'one', type: ShipType.Frigate, hullBefore: 35, hullAfter: 35 - hits }] },
      { nationId: N2, firepower: 3, ships: [{ id: 'two', type: ShipType.Frigate, hullBefore: 35, hullAfter: 35 - 2 * hits }] },
    ],
  });
  expect(state.fleets[0].approach).toEqual(approach);
  expect(state.fleets[1].approach).toBeUndefined();
  expect(state.fleets[1].ships[0].hullDamage ?? 0).toBe(2 * hits);
});

it('FR-552 recalculates the longest range each round and removes ships sunk before their side can fire', () => {
  const long = ship('scout', { range: 7, hullDamage: 34 });
  const short = ship('short', { range: 3, firepower: 4, hullDamage: 34 });
  const middle = ship('middle', { range: 5, hullDamage: 32 });
  const { state, reports } = contact({ ...battle(fleet(N1, long, short), fleet(N2, middle)), seed: 32 });
  // Round 1: two hits on middle (1 hull left), which sinks scout. Round 2: middle now outranges short.
  expect(reports).toEqual([expect.objectContaining({
    rounds: 2, winnerId: N2, sides: [
      { nationId: N1, firepower: 0, ships: [
        { id: 'scout', type: ShipType.Frigate, hullBefore: 1, hullAfter: 0 },
        { id: 'short', type: ShipType.Frigate, hullBefore: 1, hullAfter: 0 },
      ] },
      { nationId: N2, firepower: 3, ships: [{ id: 'middle', type: ShipType.Frigate, hullBefore: 3, hullAfter: 1 }] },
    ],
  })]);
  expect(state.fleets.map(f => f.ownerNationId)).toEqual([N2]);
  expect(state.nations.find(n => n.id === N1)!.fleets).toEqual([]);
});

it('FR-552 simultaneous equal range lets both last ships sink, contests the coast and blocks the beachhead', () => {
  const a = { ...fleet(N1, ship('one', { hullDamage: 34 })), siteSinceTurn: 0 };
  const b = fleet(N2, ship('two', { hullDamage: 34 }));
  const { state, reports } = contact({ ...battle(a, b), seed: 5 });
  expect(reports).toHaveLength(1);
  expect(reports[0]).toMatchObject({ rounds: 1, sides: [
    { firepower: 0, ships: [{ id: 'one', hullAfter: 0 }] }, { firepower: 0, ships: [{ id: 'two', hullAfter: 0 }] },
  ], landing: 'blocked' });
  expect(reports[0].winnerId).toBeUndefined();
  expect(state.fleets).toEqual([]);
  expect(state.nations.flatMap(n => n.fleets)).toEqual([]);
});

it('FR-552 a longer-ranged Ship-of-the-Line can defeat three Frigates with more total firepower', () => {
  const line = ship('line', { ...WARSHIPS.shipOfTheLine, hullDamage: 63 });
  const frigates = ['a', 'b', 'c'].map(id => ship(id, { hullDamage: 34 }));
  const { state, reports } = contact({ ...battle(fleet(N1, line), fleet(N2, ...frigates)), seed: 33 });
  expect(reports).toHaveLength(1);
  expect(reports[0]).toMatchObject({ rounds: 3, winnerId: N1, sides: [
    { firepower: 6, ships: [{ hullBefore: 2, hullAfter: 1 }] },
    { firepower: 0, ships: ['a', 'b', 'c'].map(id => ({ id, hullBefore: 1, hullAfter: 0 })) },
  ] });
  expect(state.fleets.map(f => f.id)).toEqual([fleet(N1).id]);
});

it('FR-552 seeded targeting is repeatable across submission and ship order, and varies with the seed', () => {
  const a = { ...fleet(N1, ship('one'), ship('two')), location: 'berth', approach: undefined };
  const b = { ...fleet(N2, ship('three'), ship('four')), location: 'berth', approach: undefined };
  function run(seed: number, reverse: boolean) {
    const fleets = reverse ? [b, a].map(f => ({ ...f, ships: [...f.ships].reverse() })) : [a, b];
    let state = deepFreeze({ ...battle(...fleets), seed });
    for (const f of fleets) {
      const order = tryApplyOrder(state, sail(f));
      expect(order.result).toEqual({ ok: true });
      state = order.state;
    }
    const turn = resolveTurn(state, {});
    return { fleets: [...turn.state.fleets].sort((x, y) => x.id.localeCompare(y.id)), reports: turn.events.filter(e => e.type === 'naval-engagement') };
  }
  const original = run(1, false);
  expect(original.reports).toHaveLength(1);
  expect(original.reports[0]).toMatchObject({ rounds: 3, sides: [{ firepower: 6 }, { firepower: 6 }] });
  expect(original.reports[0].winnerId).toBeUndefined();
  expect(original.fleets.every(f => f.contested && f.approach?.provinceId === approach.provinceId)).toBe(true);
  expect(run(1, true)).toEqual(original);
  expect(run(1, false)).toEqual(original);
  expect(run(2, false).reports).not.toEqual(original.reports);
});

it('FR-552 repairs 25% of printed hull per full turn at berth; an afloat or departing hull keeps its damage', () => {
  const wounded = ship('one', { hullDamage: 20 });
  const a = { ...fleet(N1, wounded), approach: undefined, location: 'berth' };
  const b = fleet(N2, ship('two', { hullDamage: 20 }));
  const base = withFleets(continent(), [a, b]);
  const { state, reports } = contact(base);
  expect(reports).toEqual([]);
  expect(state.fleets[0].ships[0].hullDamage).toBe(11.25);
  expect(state.fleets[1].ships[0].hullDamage).toBe(20);
  const fullyRepaired = resolveTurn(resolveTurn(state, {}).state, {}).state.fleets[0].ships[0];
  expect(fullyRepaired.hullDamage).toBeUndefined();
  const departure = resolveTurn(base, { [N1]: [sail(a)] });
  expect(departure.events.some(e => e.type === 'naval-engagement')).toBe(false);
  expect(departure.state.fleets[0].ships[0].hullDamage).toBe(20);
});

it('FR-552 carries surviving damage through the save, removes sunk hulls and treats absent damage as full hull', () => {
  const a = fleet(N1, ship('lost', { hullDamage: 34 }), ship('survivor'));
  const b = fleet(N2, ship('opponent'));
  const { state, reports } = contact(battle(a, b), 0);
  const session = createGameStore({ seed: 1, world: 'continent' }).getState();
  const save = saveOf({ ...session, game: state, eventLog: [{ turn: state.turn, year: state.year, events: reports }] });
  const restored = readSave({ getItem: () => JSON.stringify(save) });
  expect(restored.kind).toBe('usable');
  if (restored.kind !== 'usable') throw new Error('Expected a usable naval save');
  const ships = restored.save.game.fleets.flatMap(f => f.ships);
  expect(ships.some(s => s.id === 'lost')).toBe(false);
  // Both sides have the same range. The survivor receives the two subsequent rounds of fire.
  expect(ships.find(s => s.id === 'survivor')).toMatchObject({ hull: 35, hullDamage: 2 });
  expect(restored.save.eventLog[0].events).toEqual(reports);
  expect(contact(restored.save.game)).toEqual(contact(state));
});

it('FR-552 a returned loser cannot fight another opponent in this naval phase', () => {
  const a = fleet(N1, ship('one'), ship('two'), ship('three'));
  const b = fleet(N2, ship('four'), ship('five'));
  const c = fleet(N3, ship('six'));
  const base = withFleets(war(war(threePowers()), N2, N3), [a, b, c]);
  const { state, reports } = contact(base, 0);
  expect(reports).toHaveLength(1);
  expect(reports[0]).toMatchObject({ winnerId: N1, rounds: 3 });
  expect(state.fleets.find(f => f.id === b.id)?.approach).toBeUndefined();
  expect(state.fleets.find(f => f.id === c.id)).toEqual(c);
});

it('FR-552 a third squadron can displace an earlier winner before troops embark', () => {
  const a = { ...fleet(N1, ship('a', { hullDamage: 31 }), ship('b', { hullDamage: 34 })), siteSinceTurn: 0 };
  const b = fleet(N2, ship('c'));
  const c = fleet(N3, ship('d', { range: 6 }));
  const base = withFleets(war(war(threePowers()), N1, N3), [a, b, c]);
  const { state, reports } = contact(base, 0);
  expect(reports).toMatchObject([
    { winnerId: N1, winnerDisplaced: true, landing: 'blocked' },
    { winnerId: N3, landing: 'blocked' },
  ]);
  expect(state.fleets.filter(f => f.approach).map(f => f.ownerNationId)).toEqual([N3]);
});

it('FR-552 reports that a landing site is held if a third squadron sinks the opponent from a previous draw', () => {
  const a = { ...fleet(N1, ship('a')), siteSinceTurn: 0 };
  const b = fleet(N2, ship('b', { hullDamage: 31 }));
  const c = fleet(N3, ship('c', { range: 6, firepower: 1 }));
  const base = withFleets(war(war(threePowers()), N2, N3), [a, b, c]);
  const { state, reports } = contact(base, 0);
  expect(reports).toHaveLength(2);
  expect(reports[0].winnerId).toBeUndefined();
  expect(reports[0].landing).toBe('held');
  expect(reports[0].laterHolderId).toBe(N1);
  expect(reports[1].winnerId).toBe(N3);
  expect(state.fleets.find(f => f.id === a.id)).toMatchObject({ approach, siteSinceTurn: 0 });
  expect(state.fleets.find(f => f.id === a.id)?.contested).toBeFalsy();
});

it('FR-552/559 measures a commissioned hull even when its nation lost a hull in the same turn', () => {
  const a = fleet(N1, ship('lost', { hullDamage: 34 }));
  const b = fleet(N2, ship('line', WARSHIPS.shipOfTheLine));
  const start = setWarehouse({ ...battle(a, b), seed: 5 }, N1, { lumber: 5, fabric: 2, armaments: 2 });
  const planned = tryApplyOrder(start, { kind: 'setShipyard', nationId: N1, ship: 'frigate', count: 1 });
  expect(planned.result).toEqual({ ok: true });
  const end = resolveTurn(planned.state, {});
  const ownHulls = end.state.fleets.filter(f => f.ownerNationId === N1).flatMap(f => f.ships);
  expect(ownHulls.map(s => s.id)).toEqual([N1 + '-1-frigate-1']);
  expect(end.events.find(e => e.type === 'naval-engagement')).toMatchObject({ sides: [
    { nationId: N1, ships: [{ id: 'lost', hullAfter: 0 }] }, { nationId: N2 },
  ] });
  expect(navalTurn(planned.state, end, N1, start).built).toBe(1);
});

it('FR-552/558 replays commissioned ships, battle damage and a subsequent turn from the original continent start', () => {
  const session = createGameStore({ seed: 1, world: 'continent', market: 'world' }).getState();
  const orderLog: OrderLogEntry[] = [];
  const eventLog: TurnReport[] = [];
  let game = session.game;
  function advance(orders: Record<string, Order[]>) {
    for (const [nationId, entries] of Object.entries(orders)) {
      orderLog.push({ turn: game.turn, nationId, orders: entries });
    }
    const result = resolveTurn(game, orders);
    expect(result.events.filter(e => e.type === 'order-rejected')).toEqual([]);
    eventLog.push({ turn: game.turn, year: game.year, events: result.events });
    game = result.state;
  }
  const stockUp = (nationId: string): Order[] => [
    { kind: 'buyCommodity', nationId, commodity: GoodsType.Armaments, amount: 2 },
    { kind: 'buyCommodity', nationId, commodity: MaterialType.Fabric, amount: 2 },
  ];
  advance({ [N1]: stockUp(N1), [N2]: stockUp(N2) });
  const build = (nationId: string): Order => ({ kind: 'setShipyard', nationId, ship: 'frigate', count: 1 });
  advance({ [N1]: [build(N1), { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: N2 }], [N2]: [build(N2)] });
  advance(Object.fromEntries(game.fleets.map(f => [f.ownerNationId, [sail(f)]])));
  expect(eventLog[2].events.filter(e => e.type === 'naval-engagement')).toHaveLength(1);
  expect(game.fleets.flatMap(f => f.ships).some(s => s.hullDamage)).toBe(true);
  const loaded = readSave({ getItem: () => JSON.stringify(saveOf({ ...session, game, orderLog, eventLog })) });
  if (loaded.kind !== 'usable') throw new Error('Expected a usable battle save');
  const replay = replaySession(loaded.save);
  expect(replay).toEqual(game);
  expect(resolveTurn(replay, {})).toEqual(resolveTurn(loaded.save.game, {}));
});
