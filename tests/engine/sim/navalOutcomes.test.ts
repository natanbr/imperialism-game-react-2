import { expect, it } from 'vitest';
import { addRegiments, ARVELIA, ARVELIA_P, clearArmy, continent, NW1, SW1 } from '../armyFixtures';
import { N1, N2, setPair, setTile, setWarehouse } from '../fixtures';
import { resolveTurn, applyTurnOrders } from '@/engine/turn/resolveTurn';
import { adjacentProvinces } from '@/engine/world/provinces';
import { deployedFleet, homeFleet } from '@/engine/navy/fleets';
import { armyAt } from '@/engine/army/armies';
import type { Order } from '@/engine/orders/Order';
import { navalTurn } from './navalMeasurement';

function commissioned() {
  let s = setPair(setPair(continent(), N1, N2, { war: { since: 1, aggressors: [N1] } }),
    N1, ARVELIA, { war: { since: 1, aggressors: [N1] } });
  s = setWarehouse(setWarehouse(s, N1, { armaments: 5, lumber: 8, fabric: 3 }), N2, { armaments: 5, lumber: 8, fabric: 3 });
  return resolveTurn(s, { [N1]: [{ kind:'setShipyard', nationId:N1, ship:'frigate', count:1 }],
    [N2]: [{ kind:'setShipyard', nationId:N2, ship:'shipOfTheLine', count:1 }] }).state;
}

function landingSite() {
  let s = commissioned();
  const fleetId = homeFleet(s, N1)!.id;
  s = resolveTurn(s, { [N1]: [{ kind:'setFleetMission', nationId:N1, mission:'sail', provinceId:ARVELIA_P, fleetId }] }).state;
  return resolveTurn(s, { [N1]: [{ kind:'setFleetMission', nationId:N1, mission:'station', fleetId }] }).state;
}

it('FR-559 counts both ports closed by the same squadron and one if the second port is absent', () => {
  const berth = commissioned();
  for (const secondPort of [false, true]) {
    const start = setTile(setTile(berth, '3-1', { port: true }), '4-1', { port: secondPort });
    const atCoast = resolveTurn(start, { [N2]: [{ kind: 'setFleetMission', nationId: N2, mission: 'sail',
      provinceId: NW1, fleetId: homeFleet(start, N2)!.id }] }).state;
    const end = resolveTurn(atCoast, {});
    expect(navalTurn(atCoast, end, N1, atCoast)).toMatchObject({
      threats: secondPort ? 2 : 1, blockaded: secondPort ? 2 : 1,
    });
  }
});

it('FR-559 records arrival on turn four when relief engages and returns to berth in the same turn', () => {
  const berth = commissioned();
  const blockade = resolveTurn(berth, { [N2]: [{ kind: 'setFleetMission', nationId: N2, mission: 'sail',
    provinceId: SW1, fleetId: homeFleet(berth, N2)!.id }] }).state;
  const start = resolveTurn(blockade, {}).state;
  const planned = applyTurnOrders(start, { [N1]: [{ kind: 'setFleetMission', nationId: N1, mission: 'sail',
    provinceId: SW1, fleetId: homeFleet(start, N1)!.id }] }, e => { throw Error(JSON.stringify(e)); }).state;
  const end = resolveTurn(planned, {});
  expect(homeFleet(end.state, N1)).toBeDefined();
  expect(navalTurn(planned, end, N1, start)).toMatchObject({
    turn: 4, sailOrders: 1, arrived: 1, engagements: 1,
  });
  expect(navalTurn(planned, end, N2, start)).toMatchObject({ sailOrders: 0, arrived: 0 });
});

it('FR-559 counts the opportunity even when the attacker chooses to leave the coast', () => {
  const start = landingSite();
  const planned = applyTurnOrders(start, { [N1]: [{ kind:'setFleetMission', nationId:N1, mission:'return', fleetId:deployedFleet(start,N1)!.id }] }, () => {}).state;
  const end = resolveTurn(planned, {});
  expect(navalTurn(planned, end, N1, start)).toMatchObject({ landingEligible: 1, attempts: 0 });
});

it('FR-559 credits only the land regiments that fought when relief stops a simultaneous sea sortie', () => {
  const site = landingSite();
  const neighbor = adjacentProvinces(site, ARVELIA_P).find(p => p.ownerId === N1 && p.id !== SW1)!.id;
  const start = addRegiments(clearArmy(site, ARVELIA, ARVELIA_P), N1, neighbor, ['regulars']);
  const fromLand = armyAt(start, N1, neighbor)!.regiments.find(r => r.type === 'regulars')!.id;
  const orders: Order[] = [
    { kind:'moveArmy', via:'sea', nationId:N1, fromProvinceId:SW1, toProvinceId:ARVELIA_P, regimentIds:['regiment-1'] },
    { kind:'moveArmy', nationId:N1, fromProvinceId:neighbor, toProvinceId:ARVELIA_P, regimentIds:[fromLand] },
  ];
  const planned = applyTurnOrders(start, { [N1]: orders, [N2]: [{ kind:'setFleetMission', nationId:N2, mission:'sail', provinceId:ARVELIA_P, fleetId:homeFleet(start,N2)!.id }] }, e => { throw Error(JSON.stringify(e)); }).state;
  const end = resolveTurn(planned, {});
  expect(end.events).toContainEqual(expect.objectContaining({ type:'province-taken', nationId:N1, provinceId:ARVELIA_P }));
  expect(navalTurn(planned, end, N1, start)).toMatchObject({ attempts: 1, landBattles: 0, captured: 0, captures: 1 });
});
