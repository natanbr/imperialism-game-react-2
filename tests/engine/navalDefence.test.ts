import { describe, expect, it } from 'vitest';
import { coastalDefenceOrder } from '@/engine/ai/navalDefence';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { applyTurnOrders, resolveTurn } from '@/engine/turn/resolveTurn';
import { homeApproach, withFleets } from '@/engine/navy/fleets';
import { capitalProvinceOf } from '@/engine/army/armies';
import { addRegiments, ARVELIA_P, continent } from './armyFixtures';
import { N1, N2, setBuilding, setIndustry, setPair, setWarehouse } from './fixtures';
import { WARSHIPS } from '@/definisions/ships';
import { MaterialType } from '@/types/Resource';
import { armsWanted } from '@/engine/ai/scriptedArmy';
import { ShipType, type Fleet } from '@/types/Navy';
import type { GameState } from '@/types/GameState';
import { applyOrder, tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';

function squadron(s: GameState, owner: string, at?: string): Fleet {
  return { id: 'squadron-' + owner, name: 'Frigates', ownerNationId: owner, location: 'berth', aggression: 'normal',
    ...(at ? { approach: homeApproach(s, at)! } : {}),
    ships: [{ id: 'test-' + owner, type: ShipType.Frigate, firepower: 3, range: 5, armour: 10, hull: 35, battleMove: 4, speed: 3, experience: 0 }] };
}
function fixture(market?: 'world') {
  const start = setWarehouse(continent(market), N2, { lumber: 50, fabric: 50, armaments: 50 });
  const war = setPair(start, N1, N2, { war: { aggressors: [N1], since: 1 } });
  const s = { ...war, turn: 4 };
  return { ...s, fleets: [squadron(s, N1, N2)] };
}
const frigate: Order = { kind: 'setShipyard', nationId: N2, ship: 'frigate', count: 1 };
const navalOrders = (s: GameState) => scriptedPlayer(s, N2).filter(o => o.kind === 'setFleetMission' || (o.kind === 'setShipyard' && o.ship === 'frigate'));

describe('FR-557 scripted coastal defence', () => {
  it('buys a single funded Frigate only on a public wartime threat, after commitments', () => {
    const s = fixture();
    expect(navalOrders(s)).toEqual([frigate]);
    expect(navalOrders({ ...s, fleets: [] })).toEqual([]);
    const finalTurn = { ...s, turn: s.turnLimit ?? 40 };
    expect(navalOrders(finalTurn)).toEqual([frigate]);
    expect(scriptedPlayer(finalTurn, N2).some(o => o.kind === 'buyCommodity')).toBe(false);
    expect(navalOrders(setWarehouse(s, N2, { fabric: 0 }))).toEqual([]);
    expect(navalOrders(applyOrder(s, frigate))).toEqual([]);
    expect(navalOrders(setPair(s, N1, N2, { war: undefined }))).toEqual([]);
    const rejected: string[] = [];
    applyTurnOrders(s, { [N2]: scriptedPlayer(s, N2) }, event => { if (event.type === 'order-rejected') rejected.push(event.reason); });
    expect(rejected).toEqual([]);
  });
  it('protects fabric committed to standing clothing production when the warehouse could pay for a hull', () => {
    const stock = setWarehouse(fixture(), N2, { fabric: 2 });
    expect(coastalDefenceOrder(stock, N2)).toEqual(frigate);
    const ordered = setBuilding(stock, N2, 'clothingFactory', { capacity: 1, orders: { clothing: 1 } });
    expect(coastalDefenceOrder(ordered, N2)).toBeUndefined();
  });
  it('FR-516 Q140 keeps the turn-five Indiaman when a hostile squadron appears one lumber before funding', () => {
    const stocked = setWarehouse(fixture(), N2, { lumber: 6, fabric: 5, armaments: 8 });
    const preparing = { ...stocked, nations: stocked.nations.map(n => n.id !== N2 ? n : {
      ...n, merchantMarine: { ...n.merchantMarine, tradeHistory: Array(3).fill({ used: 4, holds: 4 }) },
    }) };
    const indiaman = { kind: 'setShipyard', nationId: N2, ship: 'indiaman', count: 1 };
    for (const fleets of [[], preparing.fleets]) {
      const start = withFleets(preparing, fleets);
      const orders = scriptedPlayer(start, N2);
      const next = resolveTurn(start, { [N2]: orders }, start.seed).state;
      expect(next.turn).toBe(5);
      expect(scriptedPlayer(next, N2), fleets.length ? 'under blockade' : 'without a threat').toContainEqual(indiaman);
      expect(orders).not.toContainEqual(frigate);
    }
  });
  it('FR-557 spends only surplus beyond the garrison reserve and counts paid sale commitments once', () => {
    const threatened = addRegiments(fixture('world'), N1, ARVELIA_P, ['regulars', 'regulars', 'regulars']);
    expect(armsWanted(threatened, N2)).toBe(true);
    expect(coastalDefenceOrder(setWarehouse(threatened, N2, { armaments: 2 }), N2)).toBeUndefined();
    const funded = setWarehouse(threatened, N2, { armaments: 4, lumber: 6 });
    const offer = tryApplyOrder(funded, { kind: 'sellCommodity', nationId: N2, commodity: MaterialType.Lumber, amount: 1 });
    expect(offer.result).toEqual({ ok: true });
    expect(coastalDefenceOrder(offer.state, N2)).toEqual(frigate);
  });
  it('FR-485 keeps the lumber for turn-five furniture and a turn-six recruit under blockade', () => {
    const stores = setWarehouse(fixture(), N2, {
      lumber: 5, steel: 0, armaments: 5, fabric: 4, paper: 0, timber: 0,
      furniture: 0, clothing: 4, cannedFood: 10, grain: 20, fruit: 20, livestock: 20,
    });
    const sick = setIndustry(stores, N2, {
      workers: { untrained: 4, trained: 0, expert: 0 }, sick: { untrained: 3, trained: 0, expert: 0 },
    });
    const start = withFleets({ ...sick, nations: sick.nations.map(n => n.id === N2
      ? { ...n, merchantMarine: { ...n.merchantMarine, lastShipOrderTurn: 3 } } : n) },
    sick.fleets.map(f => ({ ...f, location: homeApproach(sick, N2)!.seaId })));
    const orders = scriptedPlayer(start, N2);
    expect.soft(orders).not.toContainEqual(frigate);
    const fifth = resolveTurn(start, { [N2]: orders }).state;
    const production = scriptedPlayer(fifth, N2);
    expect.soft(production).toContainEqual({ kind: 'setProduction', nationId: N2, building: 'furnitureFactory', output: 'furniture', amount: 1 });
    const sixth = resolveTurn(fifth, { [N2]: production }).state;
    expect(scriptedPlayer(sixth, N2)).toContainEqual({ kind: 'recruitWorkers', nationId: N2, delta: 1 });
  });
  it('FR-485 FR-516 funds defence only from surplus beyond the combined migrant and merchant reserves', () => {
    const sick = setIndustry(fixture(), N2, { sick: { untrained: 3, trained: 0, expert: 0 } });
    const saving = { ...sick, nations: sick.nations.map(n => n.id !== N2 ? n : {
      ...n, merchantMarine: { ...n.merchantMarine, tradeHistory: [{ used: 4, holds: 4 }] },
    }) };
    // Seven lumber for the merchant, two for the migrant's furniture, five for the Frigate.
    expect(coastalDefenceOrder(setWarehouse(saving, N2, { lumber: 13 }), N2)).toBeUndefined();
    expect(coastalDefenceOrder(setWarehouse(saving, N2, { lumber: 14 }), N2)).toEqual(frigate);
  });
  it('FR-485 protects inputs for the migrant goods once, including a scheduled batch', () => {
    const sick = setIndustry(fixture(), N2, { sick: { untrained: 3, trained: 0, expert: 0 } });
    const stock = setWarehouse(sick, N2, { lumber: 7, fabric: 3, furniture: 0, clothing: 0 });
    expect(coastalDefenceOrder(stock, N2)).toBeUndefined();
    const funded = setWarehouse(stock, N2, { fabric: 4 });
    const furniture = setBuilding(funded, N2, 'furnitureFactory', { capacity: 1, orders: { furniture: 1 } });
    const both = setBuilding(furniture, N2, 'clothingFactory', { capacity: 1, orders: { clothing: 1 } });
    expect(coastalDefenceOrder(both, N2)).toEqual(frigate);
  });
  it('sails an available squadron to the public port; varying rival private plans leaves the entire plan identical', () => {
    const s = fixture();
    const own = squadron(s, N2);
    const { armaments, lumber, fabric } = WARSHIPS.frigate;
    const fundedRival = setWarehouse(s, N1, { armaments, lumber, fabric });
    const ready = withFleets(fundedRival, [...s.fleets, own]);
    const port = capitalProvinceOf(s, N2)!.id;
    expect(navalOrders(ready)).toEqual([{ kind: 'setFleetMission', nationId: N2, fleetId: own.id, mission: 'sail', provinceId: port }]);
    const variations: Order[] = [
      { kind: 'setFleetMission', nationId: N1, fleetId: ready.fleets[0].id, mission: 'return' },
      { ...frigate, nationId: N1 },
      { kind: 'moveArmy', nationId: N1, fromProvinceId: 'province-nation-1-sw', toProvinceId: 'province-nation-1-nw', regimentIds: ['regiment-1'] },
    ];
    const plan = scriptedPlayer(ready, N2);
    let combined = ready;
    for (const order of variations) {
      const isolated = tryApplyOrder(ready, order);
      expect(isolated.result).toEqual({ ok: true });
      expect(scriptedPlayer(isolated.state, N2)).toEqual(plan);
      const layered = tryApplyOrder(combined, order);
      expect(layered.result).toEqual({ ok: true });
      combined = layered.state;
    }
    expect(scriptedPlayer(combined, N2)).toEqual(plan);
    expect(navalOrders({ ...ready, fleets: [own] })).toEqual([]);
  });
});
