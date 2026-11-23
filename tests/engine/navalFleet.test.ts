import { expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order, SetFleetMissionOrder } from '@/engine/orders/Order';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { interceptionsSystem } from '@/engine/systems/interceptionsSystem';
import { combatSystem } from '@/engine/systems/combatSystem';
import { fallCapital } from '@/engine/army/conquest';
import { armyAt, capitalProvinceOf } from '@/engine/army/armies';
import { isMilitia, REGIMENTS } from '@/definisions/regiments';
import { approachesOf, homeApproach, openPortApproaches } from '@/engine/navy/fleets';
import type { GameState } from '@/types/GameState';
import { ShipType, type Fleet } from '@/types/Navy';
import { TerrainType } from '@/types/Tile';
import { deepFreeze, N1, N2, nationOf, setPair, setWarehouse } from './fixtures';
import { N3, threePowers } from './armyFixtures';

const island = 'province-minor-2';
const otherIsland = 'province-minor-3';
const stock = () => newGame({ world: 'continent', seed: 1 });
const funded = () => setWarehouse(stock(), N1, { armaments: 12, lumber: 40, fabric: 15 });
const build = (ship: 'frigate' | 'shipOfTheLine' | 'indiaman', count: number) =>
  ({ kind: 'setShipyard', nationId: N1, ship, count }) as const;
const sail = (nationId: string, fleetId: string, provinceId: string): SetFleetMissionOrder =>
  ({ kind: 'setFleetMission', nationId, fleetId, mission: 'sail', provinceId });
const home = (nationId: string): Fleet => ({
  id: nationId + '-test', name: 'Home squadron', ownerNationId: nationId, location: 'berth', aggression: 'normal',
  ships: [{id: nationId + '-ship', type: ShipType.Frigate, firepower: 3, range: 5, armour: 10, hull: 35, battleMove: 4, speed: 3, experience: 0}],
});
function withFleets(state: GameState, ...fleets: Fleet[]): GameState {
  return { ...state, fleets, nations: state.nations.map(n => ({ ...n, fleets: fleets.filter(f => f.ownerNationId === n.id).map(f => f.id) })) };
}

it('FR-548 charges changes in printed hull costs, commissions once and preserves cargo, workers and payroll', () => {
  const base = deepFreeze(funded());
  const frigate = tryApplyOrder(base, build('frigate', 2));
  expect(frigate.result).toEqual({ok: true});
  expect(nationOf(frigate.state,N1).warehouse).toMatchObject({armaments:8, lumber:30, fabric:11});
  const cancelled = tryApplyOrder(frigate.state, build('frigate', 0)).state;
  expect(nationOf(cancelled,N1).warehouse).toEqual(nationOf(base,N1).warehouse);
  const line = tryApplyOrder(frigate.state, build('shipOfTheLine', 1)).state;
  expect(nationOf(line,N1).warehouse).toMatchObject({armaments:3, lumber:22, fabric:8});
  const rejected = tryApplyOrder(line, build('shipOfTheLine', 2));
  expect(rejected.result).toEqual({ok:false,reason:'insufficient-resources'});
  expect(rejected.state).toBe(line);
  const mixed = tryApplyOrder(line, build('indiaman',1)).state;
  const control = tryApplyOrder(base, build('indiaman',1)).state;
  expect(mixed.fleets).toEqual([]);
  const [built, baseline] = [mixed,control].map(s => resolveTurn(s,{}).state);
  const nation = nationOf(built,N1);
  expect(nation.merchantMarine.holds).toBe(8);
  expect(nation.industry.workers).toEqual(nationOf(baseline,N1).industry.workers);
  expect(nation.treasury).toBe(nationOf(baseline,N1).treasury);
  expect(built.fleets.map(f => f.id)).toEqual(nation.fleets);
  const fleet = built.fleets[0];
  expect(fleet.approach).toBeUndefined();
  expect(fleet.ships.map(s => [s.type,s.firepower])).toEqual([['frigate',3],['frigate',3],['shipOfTheLine',6]]);
  expect(resolveTurn(built,{}).state.fleets).toEqual(built.fleets);
  expect(tryApplyOrder(newGame(1), build('frigate',0)).result.ok).toBe(false);
});

it('FR-549 sails from either home to each island, edits, cancels and consolidates home hulls after return', () => {
  const start = withFleets(funded(),home(N1),home(N2));
  for (const fleet of start.fleets) for (const minor of ['minor-2','minor-3','minor-4']) {
    const provinceId = 'province-'+minor;
    const order = sail(fleet.ownerNationId,fleet.id,provinceId);
    const next = tryApplyOrder(start,order);
    expect(next.result).toEqual({ok:true});
    expect(next.state.fleets).toEqual(start.fleets);
    expect(resolveTurn(next.state,{}).state.fleets.find(f => f.id === fleet.id)?.approach).toEqual({provinceId,seaId:'0-0'});
  }
  const fleetId = home(N1).id;
  const first = tryApplyOrder(start,sail(N1,fleetId,island)).state;
  const edited = tryApplyOrder(first,sail(N1,fleetId,otherIsland)).state;
  expect(tryApplyOrder(edited,sail(N1,home(N2).id,island)).state).toBe(edited);
  expect(tryApplyOrder(edited,sail(N1,fleetId,'unknown')).state).toBe(edited);
  const cancelled = tryApplyOrder(edited,{kind:'setFleetMission',nationId:N1,fleetId,mission:'cancel'}).state;
  expect(resolveTurn(cancelled,{}).state.fleets).toEqual(start.fleets);
  const away = resolveTurn(edited,{[N1]:[build('frigate',1)]}).state;
  const atHome = away.fleets.find(f => f.ownerNationId === N1 && !f.approach)!;
  expect(away.fleets.find(f => f.id === fleetId)?.approach?.provinceId).toBe(otherIsland);
  expect(tryApplyOrder(away,sail(N1,atHome.id,island)).result.ok).toBe(false);
  const returned = resolveTurn(away,{[N1]:[{kind:'setFleetMission',nationId:N1,fleetId,mission:'return'}]}).state;
  const own = returned.fleets.filter(f => f.ownerNationId === N1);
  expect(own).toHaveLength(1);
  expect(own[0].approach).toBeUndefined();
  expect(new Set(own[0].ships.map(s => s.id)).size).toBe(2);
  expect(nationOf(returned,N1).fleets).toEqual([own[0].id]);
});

it('FR-549 binds the home outlet and subsequent voyages to one ocean, rejecting inland and disconnected shores', () => {
  const base = withFleets(stock(),home(N1));
  const tiles = base.map.tiles.map(row => row.map(t => t.terrain === TerrainType.Water && t.x === 10
    ? {...t,terrain:TerrainType.River} : t));
  const divided = {...base,map:{...base.map,tiles}};
  expect(tryApplyOrder(divided,sail(N1,home(N1).id,'province-nation-2-sw')).result.ok).toBe(false);
  const dry = {...base,map:{...base.map,tiles:base.map.tiles.map(row => row.map(t =>
    t.terrain === TerrainType.Water ? {...t,terrain:TerrainType.Farm} : t))}};
  expect(tryApplyOrder(dry,sail(N1,home(N1).id,island)).result.ok).toBe(false);
});

it('FR-549 retains the arrival sea on a province between two oceans; each port binds to its own lowest outlet', () => {
  const stockMap = stock();
  // West/east ocean columns flank a vertical isthmus.
  const terrain = [
    ['water','water','capital','water','water'],
    ['water','water','farm','water','water'],
    ['farm','water','farm','water','farm'],
  ] as const;
  const tiles = terrain.map((row,y) => row.map((key,x) => {
    const provinceId = x === 2 ? (y === 0 ? 'home' : 'bridge') : x === 4 ? 'east' : 'west';
    return {id:x+'-'+y,x,y,terrain:key as TerrainType,workers:[],visible:true,explored:true,
      ...(key !== 'water' && {provinceId,ownerNationId:N1}),
      ...(key === 'capital' && {cityId:nationOf(stockMap,N1).cities[0]}),
      ...(x === 2 && y === 1 && {port:true})};
  }));
  const provinces = ['home','bridge','east','west'].map(id => {
    const ids = tiles.flat().filter(t=>t.provinceId===id).map(t=>t.id);
    return { id,name:id,ownerId:N1,seatTileId:ids[0],tileIds:ids };
  });
  const state = withFleets({...stockMap,provinces,map:{...stockMap.map,
    config:{...stockMap.map.config,rows:3,cols:5},tiles}},home(N1));
  expect(homeApproach(state,N1)).toEqual({provinceId:'home',seaId:'0-0'});
  expect(approachesOf(state,'bridge').map(a=>a.seaId).sort()).toEqual(['0-0','3-0']);
  expect(openPortApproaches(state,N1,'bridge')).toEqual([{provinceId:'bridge',seaId:'3-0'}]);
  const first = tryApplyOrder(state,sail(N1,home(N1).id,'bridge'));
  expect(first.result.ok).toBe(true);
  // Keep the synthetic map independent of economic turn systems that use the stock rail network.
  const settled = interceptionsSystem(first.state,createTurnContext({turn:state.turn}));
  expect(settled.fleets[0].approach).toEqual({provinceId:'bridge',seaId:'0-0'});
  const landed = {...settled,turn:state.turn+1,intents:[]};
  expect(tryApplyOrder(landed,sail(N1,home(N1).id,'west')).result.ok).toBe(true);
  expect(tryApplyOrder(landed,sail(N1,home(N1).id,'east')).result.ok).toBe(false);
});

it.each([[1,2,N2],[3,1,N1],[2,2,undefined]] as const)('FR-552 resolves simultaneous arrivals, %i versus %i, once before land combat', (one,two,winner) => {
  const fleets = [home(N1),home(N2)].map((f,index) => ({
    ...f, ships: Array.from({length:index === 0 ? one : two}, (_,i) => ({...f.ships[0],id:f.id+'-'+i})),
  }));
  const base = deepFreeze(setPair(withFleets(stock(),...fleets),N1,N2,{war:{since:1,aggressors:[N1]}}));
  const orders = fleets.map(f => sail(f.ownerNationId,f.id,island));
  const run = (list: typeof orders) => resolveTurn(list.reduce((s,o) => tryApplyOrder(s,o).state,base),{});
  const first = run(orders);
  const events = first.events.filter(e => e.type === 'naval-engagement');
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({provinceId:island,sides:[{nationId:N1,firepower:one*3},{nationId:N2,firepower:two*3}],landing:'none'});
  expect(events[0].winnerId).toBe(winner);
  expect(run([...orders].reverse())).toEqual(first);
  for (const f of first.state.fleets) {
    expect(!!f.approach).toBe(!winner || winner === f.ownerNationId);
    expect(!!f.contested).toBe(!winner);
    const side = events[0].sides.find(s => s.nationId === f.ownerNationId)!;
    expect(f.ships.map(s => [s.id, s.hull - (s.hullDamage ?? 0)]))
      .toEqual(side.ships!.map(s => [s.id, s.hullAfter]));
  }
  expect(first.state.fleets.flatMap(f => f.ships).some(s => s.hullDamage)).toBe(true);
  expect(resolveTurn(first.state,{}).events.filter(e => e.type === 'naval-engagement')).toHaveLength(winner ? 0 : 1);
  const peace = setPair(base,N1,N2,{war:undefined});
  expect(resolveTurn(peace,Object.fromEntries(orders.map(o=>[o.nationId,[o]]))).state.fleets.every(f=>f.approach && !f.contested)).toBe(true);
});

it('FR-552 ends support on retreat, reports the landing outcome and retires a fallen navy before commissioning', () => {
  const beach = {...home(N1),approach:{provinceId:island,seaId:'0-0'},siteSinceTurn:0};
  const relief = home(N2);
  relief.ships = [relief.ships[0],{...relief.ships[0],id:'relief-2'}];
  const war = setPair(withFleets(funded(),beach,relief),N1,N2,{war:{since:1,aggressors:[N1]}});
  const result = resolveTurn(war,{[N2]:[sail(N2,relief.id,island)]});
  expect(result.events).toContainEqual(expect.objectContaining({type:'naval-engagement',winnerId:N2,landing:'blocked'}));
  expect(result.state.fleets.find(f=>f.ownerNationId===N1)?.siteSinceTurn).toBeUndefined();
  const planned = tryApplyOrder(tryApplyOrder(war,build('frigate',1)).state,sail(N1,beach.id,otherIsland)).state;
  const fallen = fallCapital(planned,N1,N2,war.turn,()=>{});
  expect(fallen.fleets.some(f=>f.ownerNationId===N1)).toBe(false);
  expect(nationOf(fallen,N1).fleets).toEqual([]);
  expect(nationOf(fallen,N1).pendingWarships?.frigate ?? 0).toBe(0);
  expect(fallen.intents.some(i=>i.kind==='fleet-mission' && i.nationId===N1)).toBe(false);
});

it.each([1,2])('FR-552 keeps booked troops unharmed at origin when %i defending Frigates intercept before battle', count => {
  const start = stock();
  const from = capitalProvinceOf(start,N1)!.id;
  const to = capitalProvinceOf(start,N2)!.id;
  const beach = {...home(N1), approach:{provinceId:to,seaId:'0-0'},siteSinceTurn:0};
  const relief = home(N2);
  relief.ships = Array.from({length:count},(_,i)=>({...relief.ships[0],id:'relief-'+i}));
  const state = deepFreeze(setPair(withFleets(start,beach,relief),N1,N2,{war:{since:1,aggressors:[N1]}}));
  const army = armyAt(state,N1,from)!;
  const regiment = army.regiments.find(r => !isMilitia(r.type) && REGIMENTS[r.type].stats.armamentsCost <= 2)!;
  const queued = tryApplyOrder(state,{kind:'moveArmy',via:'sea',nationId:N1,fromProvinceId:from,toProvinceId:to,regimentIds:[regiment.id]});
  expect(queued.result).toEqual({ok:true});
  const turn = resolveTurn(queued.state,{[N2]:[sail(N2,relief.id,to)]});
  expect(turn.events.filter(e=>e.type==='naval-engagement')).toEqual([expect.objectContaining({landing:'blocked'})]);
  expect(turn.events).toContainEqual(expect.objectContaining({type:'sea-deployment-failed',reason:'no-landing-site'}));
  expect(turn.events.some(e=>e.type==='battle-resolved')).toBe(false);
  expect(armyAt(turn.state,N1,from)?.regiments.find(r=>r.id===regiment.id)).toEqual(regiment);
  expect(turn.state.armies.flatMap(a=>a.regiments).filter(r=>r.id===regiment.id)).toHaveLength(1);
});

it('FR-552 settles three squadrons in public strength order and clears a tie once its opponent has returned', () => {
  const three = threePowers(stock());
  const war = setPair(setPair(three,N1,N2,{war:{since:1,aggressors:[N1]}}),N1,N3,{war:{since:1,aggressors:[N1]}});
  const fleets = [N1,N2,N3].map(id=>({...home(id),approach:{provinceId:island,seaId:'0-0'}}));
  fleets[2].ships.push({...fleets[2].ships[0],id:'third-power-second-hull'});
  const resolve = (list: Fleet[]) => {
    const state = withFleets(war,...list);
    const events: string[] = [];
    const end = interceptionsSystem(state,createTurnContext({turn:state.turn,emit:e=>{
      if (e.type==='naval-engagement') events.push(e.sides.map(side=>side.nationId).join('/')+' '+e.winnerId);
    }}));
    return { events, fleets: [...end.fleets].sort((a,b)=>a.id.localeCompare(b.id)) };
  };
  const result = resolve(fleets);
  expect(result.fleets[0].approach).toBeUndefined();
  expect(result.fleets[0].ships[0]).toMatchObject({ ...fleets[0].ships[0], hullDamage: expect.any(Number) });
  expect(result.fleets.slice(1).every(f=>f.approach && !f.contested)).toBe(true);
  expect(result.events).toEqual([N1+'/'+N3+' '+N3]);
  expect(resolve([...fleets].reverse())).toEqual(result);
});

it('FR-549 reports why a queued station failed after peace with the coast resolved', () => {
  const deployed = {...home(N1),approach:{provinceId:island,seaId:'0-0'}};
  const war = setPair(withFleets(stock(),deployed),N1,'minor-2',{war:{since:1,aggressors:[N1]}});
  const station = {kind:'setFleetMission',nationId:N1,fleetId:deployed.id,mission:'station'} as const;
  const queued = tryApplyOrder(war,station);
  expect(queued.result).toEqual({ok:true});
  const peace = tryApplyOrder(queued.state,{kind:'proposeOverture',nationId:N1,overture:'peace',targetId:'minor-2'});
  expect(peace.result).toEqual({ok:true});
  const turn = resolveTurn(peace.state,{});
  expect(turn.state.fleets[0].siteSinceTurn).toBeUndefined();
  expect(turn.events).toContainEqual({type:'order-rejected',nationId:N1,order:station,reason:'not-at-war'});
});

it('FR-552 reports a tied landing site as blocked in every engagement, even after it repels a weaker third fleet', () => {
  const three = threePowers(stock());
  const from = capitalProvinceOf(three,N1)!.id;
  const to = capitalProvinceOf(three,N2)!.id;
  const war = setPair(setPair(three,N1,N2,{war:{since:1,aggressors:[N1]}}),N1,N3,{war:{since:1,aggressors:[N1]}});
  const attacker = {...home(N1), approach:{provinceId:to,seaId:'0-0'},siteSinceTurn:0};
  const defender = home(N2);
  const third = {...home(N3),approach:{provinceId:otherIsland,seaId:'0-0'}};
  for (const fleet of [attacker,defender]) fleet.ships.push({...fleet.ships[0], id:fleet.id+'-2'});
  const base = withFleets(war,attacker,defender,third);
  const regiment = armyAt(base,N1,from)!.regiments.find(r=>!isMilitia(r.type))!;
  const orders: Order[] = [
    {kind:'moveArmy',via:'sea',nationId:N1,fromProvinceId:from,toProvinceId:to,regimentIds:[regiment.id]},
    sail(N2,defender.id,to),sail(N3,third.id,to),
  ];
  let planned = base;
  for (const order of orders) {
    const queued = tryApplyOrder(planned, order);
    expect(queued.result).toEqual({ok:true});
    planned = queued.state;
  }
  const events: GameEvent[] = [];
  const ctx = createTurnContext({turn:planned.turn,emit:e=>events.push(e)});
  const resolved = combatSystem(interceptionsSystem(planned,ctx),ctx);
  expect(events.filter(e=>e.type==='naval-engagement').map(e=>e.landing)).toEqual(['blocked','blocked']);
  expect(events).toContainEqual(expect.objectContaining({type:'naval-engagement',winnerId:N1,winnerContested:true}));
  expect(events).toContainEqual(expect.objectContaining({type:'sea-deployment-failed',reason:'no-landing-site'}));
  expect(events.some(e=>e.type==='battle-resolved')).toBe(false);
  expect(armyAt(resolved,N1,from)?.regiments.find(r=>r.id===regiment.id)).toEqual(regiment);
});
