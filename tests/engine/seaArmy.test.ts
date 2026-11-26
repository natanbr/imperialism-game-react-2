import { describe, expect, it } from 'vitest';
import { eventText } from '@/components/gameText';
import { isMilitia } from '@/definisions/regiments';
import { armyAt, capitalProvinceOf, findRegiment } from '@/engine/army/armies';
import { councilVote } from '@/engine/council/council';
import { isAdjacentToOcean } from '@/engine/map/mapHelpers';
import type { MoveArmyOrder, Order } from '@/engine/orders/Order';
import { tryApplyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import { logisticsSystem } from '@/engine/systems/logisticsSystem';
import { initializeRailroadNetworks } from '@/engine/systems/railroadSystem';
import { transportConnectivitySystem } from '@/engine/systems/transportConnectivitySystem';
import { createTurnContext } from '@/engine/turn/context';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { adjacentProvinces, transferProvince } from '@/engine/world/provinces';
import type { GameState } from '@/types/GameState';
import { ShipType, type Fleet } from '@/types/Navy';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import { ARVELIA, ARVELIA_P, NW2, SUNDMARK, addRegiments, clearArmy, continent, patchRegiment, relocate } from './armyFixtures';
import { N1, N2, put, setPair, setTile, stockOf, tileAt } from './fixtures';

const island = 'province-minor-2';
const war = (nationId: string, targetId: string): Order => ({ kind: 'proposeOverture', overture: 'war', nationId, targetId });
const atWar = (s: GameState, a: string, b: string) => setPair(s, a, b, { war: { since: 1, aggressors: [a] } });
const capital = (s: GameState, id = N1) => capitalProvinceOf(s, id)!.id;
const mobile = (s: GameState, p = capital(s), nation = N1) => armyAt(s, nation, p)!.regiments.filter(r => !isMilitia(r.type)).map(r => r.id);
const sea = (s: GameState, ids = mobile(s), from = capital(s), to = island): MoveArmyOrder =>
  ({ kind: 'moveArmy', via: 'sea', nationId: N1, fromProvinceId: from, toProvinceId: to, regimentIds: ids });
function accepted(s: GameState, order: Order) {
  const result = tryApplyOrder(s, order);
  expect(result.result).toEqual({ ok: true });
  return result.state;
}
function squadron(nation: string, coast?: string, count = 4): Fleet {
  const ships = Array.from({ length: count }, (_, i) => ({ id: nation + '-ship-' + i, type: ShipType.Frigate,
    firepower: 3, armour: 10, range: 5, hull: 35, battleMove: 4, speed: 3, experience: 0 }));
  return { id: nation + '-squadron', ownerNationId: nation, name: 'Squadron', ships, location: coast ?? 'berth', aggression: 'normal',
    ...(coast ? { approach: { provinceId: coast, seaId: '0-0' }, siteSinceTurn: 1 } : {}) };
}
function fleets(s: GameState, ...ships: Fleet[]): GameState {
  return { ...s, fleets: ships, nations: s.nations.map(n => ({ ...n, fleets: ships.filter(f => f.ownerNationId === n.id).map(f => f.id) })) };
}
function ready(target = island, owner = SUNDMARK) {
  return fleets(atWar({ ...continent(), turn: 2 }, N1, owner), squadron(N1, target));
}
function port(s: GameState, provinceId: string) {
  const tile = s.map.tiles.flat().find(t => t.provinceId === provinceId && isAdjacentToOcean(s.map, t.x, t.y))!;
  const updated = setTile(s, tile.id, { port: true });
  return { state: { ...updated, transportNetwork: { ...updated.transportNetwork, railroadNetworks: initializeRailroadNetworks(updated.map, updated.nations) } }, tile };
}
function secondPort(s: GameState) {
  const province = s.provinces.find(p => p.ownerId === N1 && p.id !== capital(s) &&
    s.map.tiles.flat().some(t => t.provinceId === p.id && isAdjacentToOcean(s.map, t.x, t.y)))!;
  return { ...port(s, province.id), provinceId: province.id };
}

describe('FR-550 declare a reachable war', () => {
  it.each([N1,N2])('%s needs a commissioned warship and a mobile regiment at a matching own port for an island war', nation => {
    const s = continent();
    const equipped = fleets(s, squadron(nation));
    for (const target of ['minor-2','minor-3','minor-4']) {
      expect(validateOrder(s, war(nation, target)).ok).toBe(false);
      expect(validateOrder(equipped, war(nation, target))).toEqual({ ok: true });
      expect(validateOrder({ ...equipped, armies: [] }, war(nation, target)).ok).toBe(false);
    }
    for (const target of [ARVELIA, nation === N1 ? N2 : N1]) expect(validateOrder(s, war(nation, target)).ok).toBe(true);
  });
  it('rechecks port troops and starts a legal declaration next turn', () => {
    const s = fleets(continent(), squadron(N1, island));
    const ordered = accepted(s, war(N1, SUNDMARK));
    expect(validateOrder(ordered, sea(s)).ok).toBe(false);
    expect(resolveTurn(ordered, {}).events).toContainEqual({ type: 'war-declared', nationId: N1, targetId: SUNDMARK, startsTurn: s.turn + 1 });
    expect(resolveTurn({ ...ordered, armies: [] }, {}).events).toContainEqual(expect.objectContaining({ type: 'overture-failed', reason: 'no-land-route' }));
  });
  it('requires an open port and a commissioned squadron in the target ocean', () => {
    const s = continent();
    const pending = { ...s, nations: s.nations.map(n => ({ ...n, pendingWarships: { frigate: 4 } })) };
    expect(validateOrder(pending, war(N1, SUNDMARK)).ok).toBe(false);
    const away = squadron(N1, island);
    const otherOcean = { ...away, approach: { provinceId: island, seaId: 'disconnected-ocean' } };
    expect(validateOrder(fleets(s, otherOcean), war(N1, SUNDMARK)).ok).toBe(false);
    const blockaded = fleets(atWar(s, N1, N2), squadron(N1), squadron(N2, capital(s)));
    expect(validateOrder(blockaded, war(N1, SUNDMARK)).ok).toBe(false);
    const committed = accepted(fleets(s, away), { kind: 'disbandRegiments', nationId: N1, provinceId: capital(s), regimentIds: mobile(s) });
    expect(validateOrder(committed, war(N1, SUNDMARK)).ok).toBe(false);
  });
});

describe('FR-551 book sea transport', () => {
  it('shares eight ARMS between two ports; edits and cancel release only the replaced regiments', () => {
    const origin = secondPort(ready());
    let s = addRegiments(origin.state, N1, origin.provinceId, ['regulars','regulars','regulars','regulars','regulars']);
    const home = mobile(s), others = mobile(s, origin.provinceId);
    s = accepted(s, sea(s, home)); // four ARMS
    s = accepted(s, sea(s, others.slice(0,4), origin.provinceId));
    expect(tryApplyOrder(s, sea(s, others, origin.provinceId))).toEqual({ state: s, result: { ok: false, reason: 'insufficient-naval-support' } });
    s = accepted(s, { kind: 'cancelArmyMove', nationId: N1, regimentIds: [home[0]] });
    s = accepted(s, sea(s, others, origin.provinceId));
    const adjacent = adjacentProvinces(s, capital(s)).find(p => p.ownerId === N1)!.id;
    s = accepted(s, { ...sea(s,[home[1]]), via: undefined, toProvinceId: adjacent });
    s = accepted(s, sea(s, [home[1]]));
    expect(validateOrder(s, sea(s, [home[0]])).ok).toBe(false);
  });
  it('refuses duplicate, militia, neutral, another shore, a fresh site and a closed embarkation port', () => {
    const s = ready(), ids = mobile(s), home = capital(s);
    expect(validateOrder(s, sea(s))).toEqual({ ok: true });
    expect(validateOrder(s, sea(s, [ids[0],ids[0]])).ok).toBe(false);
    expect(validateOrder(s, sea(s, [armyAt(s,N1,home)!.regiments.find(r => isMilitia(r.type))!.id])).ok).toBe(false);
    expect(validateOrder({ ...s, diplomacy: continent().diplomacy }, sea(s)).ok).toBe(false);
    expect(validateOrder(s, sea(s, ids, home, ARVELIA_P)).ok).toBe(false);
    expect(validateOrder({ ...s, turn: 1 }, sea(s)).ok).toBe(false);
    expect(validateOrder(fleets(atWar(s,N1,N2), squadron(N1,island),squadron(N2,home)), sea(s))).toEqual({ ok:false, reason:'port-closed' });
  });
  it('reinforces an owned beach without creating a port', () => {
    const s = transferProvince(ready(), island, N1), ids = mobile(s);
    const { state, events } = resolveTurn(accepted(s,sea(s)), {});
    expect(ids.every(id => findRegiment(state,id)?.army.provinceId === island)).toBe(true);
    expect(events).toContainEqual({ type: 'army-moved', nationId: N1, fromProvinceId: capital(s), toProvinceId: island, count: ids.length, via: 'sea' });
    expect(events.some(e => e.type === 'battle-resolved')).toBe(false);
    expect(state.map.tiles.flat().filter(t => t.provinceId === island && t.port)).toHaveLength(0);
  });
  it('reports rail, sea and ordinary marches on the same route as separate movements', () => {
    const base = continent();
    const coast = adjacentProvinces(base, capital(base)).find(p => p.ownerId === N1 && base.map.tiles.flat().some(t =>
      t.provinceId === p.id && isAdjacentToOcean(base.map, t.x, t.y)))!;
    let s = fleets({ ...base, turn: 2 }, squadron(N1, coast.id));
    const [marcher, passenger, marine] = mobile(s);
    const route = sea(s, [marine], capital(s), coast.id);
    s = accepted(s, { ...route, via: undefined, regimentIds: [marcher] });
    s = accepted(s, { ...route, via: 'rail', regimentIds: [passenger] });
    s = accepted(s, route);
    const moves = resolveTurn(s, {}).events.filter(e => e.type === 'army-moved');
    const expected = { type: 'army-moved', nationId: N1, fromProvinceId: capital(s), toProvinceId: coast.id, count: 1 };
    expect(moves).toEqual([expected, { ...expected, via: 'rail' }, { ...expected, via: 'sea' }]);
  });
  it('requires separate arrival and station turns and moving the squadron ends support', () => {
    let s = fleets(atWar(continent(), N1, SUNDMARK), squadron(N1));
    const fleetId = s.fleets[0].id;
    const sail: Order = { kind: 'setFleetMission', nationId: N1, fleetId, mission: 'sail', provinceId: island };
    const station: Order = { kind: 'setFleetMission', nationId: N1, fleetId, mission: 'station' };
    s = accepted(s, sail);
    expect(validateOrder(s, station).ok).toBe(false);
    s = accepted(resolveTurn(s, {}).state, station);
    expect(validateOrder(s, sea(s)).ok).toBe(false);
    s = resolveTurn(s, {}).state;
    expect(validateOrder(s, sea(s)).ok).toBe(true);
    s = accepted(s, { ...sail, provinceId: 'province-minor-3' });
    expect(validateOrder(s, sea(s)).ok).toBe(false);
    expect(resolveTurn(s, {}).state.fleets[0].siteSinceTurn).toBeUndefined();
  });
});

describe('FR-553 dispatch through the normal land battle', () => {
  it('FR-556 reports the regiment lost at the origin after relief intercepts its landing', () => {
    let s = transferProvince(atWar(ready(), N1, N2), ARVELIA_P, N1);
    s = relocate(clearArmy(s, ARVELIA, ARVELIA_P), ['regiment-1'], ARVELIA_P);
    s = patchRegiment(s, 'regiment-1', { health: 1 });
    s = addRegiments(s, N2, NW2, ['artillery', 'artillery']);
    s = fleets({ ...port(s, ARVELIA_P).state, seed: 2 }, squadron(N1, island, 1), squadron(N2, undefined, 2));
    const orders: Order[] = [
      sea(s, ['regiment-1'], ARVELIA_P),
      { kind: 'setFleetMission', nationId: N2, fleetId: s.fleets[1].id, mission: 'sail', provinceId: island },
      { kind: 'moveArmy', nationId: N2, fromProvinceId: NW2, toProvinceId: ARVELIA_P, regimentIds: ['regiment-901', 'regiment-902'] },
    ];
    const end = resolveTurn(orders.reduce(accepted, s), {});
    expect(end.events.find(e => e.type === 'naval-engagement')).toMatchObject({ landing: 'blocked' });
    expect(end.events.find(e => e.type === 'battle-resolved')?.regiments)
      .toContainEqual(expect.objectContaining({ id: 'regiment-1', fate: 'destroyed' }));
    expect(findRegiment(end.state, 'regiment-1')).toBeUndefined();
    const failure = end.events.find(e => e.type === 'sea-deployment-failed')!;
    expect(failure).toMatchObject({ nationId: N1, fromProvinceId: ARVELIA_P, toProvinceId: island, reason: 'no-landing-site' });
    expect(eventText(failure)).toContain('1 regiment lost');
    expect(failure).toMatchObject({ troops: { stayed: 0, relocated: 0, lost: 1 } });
  });
  it('dispatches an already stored sea sortie across nonadjacent provinces', () => {
    const s = ready();
    const intent = { id:'intent-2-1',turn:s.turn,kind:'attack',via:'sea',nationId:N1,targetId:SUNDMARK,
      fromProvinceId:capital(s),toProvinceId:island,regimentIds:mobile(s) };
    expect(resolveTurn({ ...s,intents:[intent] }, {}).events.filter(e => e.type === 'battle-resolved')).toHaveLength(1);
  });
  it('wins the island once and its colony votes at the Council', () => {
    const s = { ...ready(), turn: 10 };
    const { state, events } = resolveTurn(accepted(s,sea(s)), {});
    for (const type of ['battle-resolved','province-taken','minor-colonised','council-met']) expect(events.filter(e => e.type === type)).toHaveLength(1);
    expect(councilVote(state)?.ballots).toContainEqual({ provinceId: island, forId: N1, row: 'colonies' });
    const all = state.armies.flatMap(a => a.regiments.map(r => r.id));
    expect(new Set(all).size).toBe(all.length);
    expect(armyAt(state,N1,island)?.regiments.length).toBeGreaterThan(0);
  });
  it('returns survivors of a lost attack to their port', () => {
    const s = addRegiments(ready(),SUNDMARK,island,['regulars','regulars','artillery','artillery']);
    const regiment = mobile(s)[0];
    const { events,state } = resolveTurn(accepted(s,sea(s,[regiment])), {});
    const battle = events.find(e => e.type === 'battle-resolved');
    expect(battle?.provinceTaken).toBe(false);
    const line = battle!.regiments.find(r => r.id === regiment)!;
    expect(line.fate).toBe('routed');
    expect(findRegiment(state,regiment)?.army.provinceId).toBe(capital(s));
  });
  it('one combined battle accepts a land sortie and a naval sortie', () => {
    let s = ready(ARVELIA_P, ARVELIA);
    const from = adjacentProvinces(s,ARVELIA_P).find(p => p.ownerId === N1 && p.id !== capital(s))!.id;
    s = addRegiments(s,N1,from,['regulars']);
    s = accepted(s,sea(s,mobile(s),capital(s),ARVELIA_P));
    const byLand = mobile(s,from);
    s = accepted(s,{ kind:'moveArmy',nationId:N1,fromProvinceId:from,toProvinceId:ARVELIA_P,regimentIds:byLand });
    const fights = resolveTurn(s,{}).events.filter(e => e.type === 'battle-resolved');
    expect(fights).toHaveLength(1);
    expect(fights[0].regiments.filter(r => r.side === 'attacker').map(r => r.id).sort()).toEqual([...mobile(s),...byLand].sort());
  });
  it('holds troops at origin when peace, changed ownership or lost support invalidates the crossing', () => {
    const s = ready(), ids = mobile(s);
    expect(validateOrder(s,{ ...sea(s), via:undefined })).toEqual({ ok:false, reason:'not-adjacent' });
    const ordered = accepted(s,sea(s));
    const peace = accepted(ordered,{ kind:'proposeOverture',nationId:N1,overture:'peace',targetId:SUNDMARK });
    for (const stale of [peace, fleets(ordered), transferProvince(ordered,island,N1)]) {
      const { state,events } = resolveTurn(stale,{});
      expect(events.some(e => e.type === 'battle-resolved')).toBe(false);
      expect(events.find(e => e.type === 'sea-deployment-failed')?.troops).toEqual({ stayed: ids.length, relocated: 0, lost: 0 });
      expect(ids.every(id => findRegiment(state,id)?.army.provinceId === capital(s))).toBe(true);
    }
  });
  it.each([[1, true], [4, false], [5, false]] as const)('a relief fleet of %i Frigates gives landing success %s', (defenders, passes) => {
    const s = fleets(atWar(ready(), N1, N2), squadron(N1, island), squadron(N2, undefined, defenders));
    const relief: Order = { kind: 'setFleetMission', nationId: N2, fleetId: s.fleets[1].id, mission: 'sail', provinceId: island };
    const privateRelief = accepted(s, relief);
    expect(validateOrder(privateRelief, sea(s))).toEqual(validateOrder(s, sea(s)));
    const { events, state } = resolveTurn(accepted(privateRelief, sea(s)), {});
    expect(events.filter(e => e.type === 'naval-engagement')).toHaveLength(1);
    expect(events.some(e => e.type === 'battle-resolved')).toBe(passes);
    if (!passes) {
      expect(events).toContainEqual(expect.objectContaining({ type: 'sea-deployment-failed', reason: 'no-landing-site' }));
      for (const id of mobile(s)) {
        const found = findRegiment(state, id);
        expect(found?.army.provinceId).toBe(capital(s));
        expect(found?.regiment.health).toBe(100);
      }
    }
  });
});

describe('FR-554 actual freight under blockade', () => {
  it('keeps a defended capital open when war starts before the squadrons fight', () => {
    const base = continent();
    const coast = capital(base);
    const peaceful = fleets(base, squadron(N1, coast, 2), squadron(N2, coast, 1));
    const islandWar = war(N1, SUNDMARK);
    expect(validateOrder(peaceful, islandWar)).toEqual({ ok: true });
    const declared = resolveTurn(accepted(peaceful, war(N2, N1)), {});
    expect(declared.events.some(e => e.type === 'naval-engagement')).toBe(false);
    expect(declared.events).toContainEqual({ type: 'war-declared', nationId: N2, targetId: N1, startsTurn: base.turn + 1 });
    expect(validateOrder(declared.state, islandWar)).toEqual({ ok: true });
  });
  it('uses the same Coast outlet for embarkation and cotton deliveries at an isolated port (FR-551/554)', () => {
    const base = transferProvince(continent(), island, N1);
    const site = '12-7';
    const tiles = base.map.tiles.map(row => row.map(t => ({
      ...t, terrain: t.terrain === TerrainType.Water ? TerrainType.Coast : t.terrain, resource: undefined,
    })));
    const coast = setTile({ ...base, map: { ...base.map, tiles } }, site, { resource: { type: ResourceType.Cotton, level: 2 } });
    const engineer = coast.map.tiles.flat().flatMap(t => t.workers).find(w => w.nationId === N1 && w.type === WorkerType.Engineer)!;
    let built = accepted(put(coast, engineer.id, site), { kind: 'startConstruction', tileId: site, structure: 'port', nationId: N1, workerId: engineer.id });
    const turns = tileAt(built, site).constructionJob!.durationTurns;
    for (let i = 0; i < turns; i++) built = resolveTurn(built, {}).state;
    expect(tileAt(built, site).port).toBe(true);
    const home = capital(built);
    const army = addRegiments(built, N1, island, ['regulars']);
    const open = fleets(atWar(army, N1, N2), squadron(N1, home));
    const closed = fleets(open, ...open.fleets, squadron(N2, island));
    const move = sea(open, mobile(open, island), island, home);
    const cottonDelivery = (s: GameState) => {
      const ctx = createTurnContext({ turn: s.turn });
      return stockOf(logisticsSystem(transportConnectivitySystem(s, ctx), ctx), N1, 'cotton') - stockOf(s, N1, 'cotton');
    };
    expect([validateOrder(open, move), cottonDelivery(open), validateOrder(closed, move), cottonDelivery(closed)])
      .toEqual([{ ok: true }, 3, { ok: false, reason: 'port-closed' }, 0]);
  });
  it('withholds an isolated port delivery, restores it under relief, peace or departure, and permits an independent rail link', () => {
    const base = transferProvince(ready(),island,N1);
    const built = port(base,island), tile = built.tile;
    const empty = { ...built.state, map: { ...built.state.map, tiles: built.state.map.tiles.map(row => row.map(t => ({ ...t, resource: undefined }))) } };
    const stock = setTile(empty,tile.id,{ resource:{ type:ResourceType.Cotton,level:2,discovered:true } });
    const delivery = (s:GameState) => {
      const ctx = createTurnContext({turn:s.turn});
      const result = logisticsSystem(transportConnectivitySystem(s,ctx),ctx);
      return result.nations[0].warehouse.cotton - s.nations[0].warehouse.cotton;
    };
    const closed = fleets(atWar(stock,N1,N2),squadron(N2,island));
    expect(delivery(fleets(stock))).toBe(3);
    expect(delivery(closed)).toBe(0);
    expect(delivery(fleets(closed))).toBe(3);
    expect(delivery(fleets(stock,squadron(N2,island)))).toBe(3);
    expect(delivery(fleets(closed,squadron(N2,ARVELIA_P)))).toBe(3);
    expect(delivery(fleets(closed,{...squadron(N1,island),contested:true},{...squadron(N2,island),contested:true}))).toBe(3);
    const networks = closed.transportNetwork.railroadNetworks!, network = networks[N1], cap = network.capital!;
    const graph = {...network.graph,[cap.x+','+cap.y]:[...network.graph[cap.x+','+cap.y],{x:tile.x,y:tile.y}]};
    expect(delivery({...closed,transportNetwork:{...closed.transportNetwork,railroadNetworks:{...networks,[N1]:{...network,graph}}}})).toBe(3);
  });
  it('preserves the capital depot and actual commercial trade records while the capital port is blockaded', () => {
    const war = atWar(setPair(continent(), N1, ARVELIA, { consulates: [N1] }), N1, N2);
    // FR-616: the open port can land Fish. Allocate zero Fish so both sides compare the same land freight and overseas trade.
    const base = accepted(war, { kind: 'setTransportAllocations', nationId: N1, allocations: { fish: 0 } });
    const buy: Order = { kind: 'buyCommodity', commodity: ResourceType.Timber, amount: 2, nationId: N1 };
    const open = resolveTurn(accepted(base, buy), {});
    const closed = resolveTurn(accepted(fleets(base, squadron(N2, capital(base))), buy), {});
    expect(closed.events.filter(e => e.type === 'goods-bought')).toEqual(open.events.filter(e => e.type === 'goods-bought'));
    expect(closed.state.nations[0].merchantMarine).toEqual(open.state.nations[0].merchantMarine);
    expect(closed.state.nations[0].merchantMarine.tradeHistory?.at(-1)).toEqual({ holds: 4, used: 2 });
    expect(closed.state.nations[0].warehouse).toEqual(open.state.nations[0].warehouse);
  });
});
