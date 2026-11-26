import { describe, expect, it } from 'vitest';
import { WARSHIPS } from '@/definisions/ships';
import { getAdjacentTiles, isOcean } from '@/engine/map/mapHelpers';
import { newGame } from '@/engine/newGame';
import { homeApproach, openPortApproaches, portApproach, threatenedPorts, withFleets } from '@/engine/navy/fleets';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { validateOrder } from '@/engine/orders/validate';
import { collectingFishHub, collectingHub, computeLogisticsTransport } from '@/engine/systems/logisticsSystem';
import { addDepot, addPort, addRailroad } from '@/engine/systems/railroadSystem';
import { transportConnectivitySystem } from '@/engine/systems/transportConnectivitySystem';
import { createTurnContext } from '@/engine/turn/context';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { transferProvince } from '@/engine/world/provinces';
import { townsOf } from '@/engine/world/towns';
import type { GameState } from '@/types/GameState';
import type { Approach, Fleet } from '@/types/Navy';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { deepFreeze, N1, N2, put, setPair, setTechnologies, setTile, tileAt } from './fixtures';
import { addRegiments } from './armyFixtures';

const engineer = 'worker-nation-1-7';
const inland = '7-6';
const mouth = '10-7';
const river = [inland, '8-6', '8-7', '9-7', mouth];
const portOrder: Order = { kind: 'moveAndStartConstruction', nationId: N1, workerId: engineer, toTileId: inland, structure: 'port' };

function riverside() {
  return river.reduce((state, id) => setTile(state, id, { hasRiver: true }), newGame({ seed: 1, world: 'continent' }));
}

function commissionRiverPort(state: GameState) {
  const applied = tryApplyOrder(state, portOrder);
  expect(applied.result).toEqual({ ok: true });
  let built = applied.state;
  for (let turn = 0; turn < 3; turn++) built = resolveTurn(built, {}).state;
  expect(tileAt(built, inland).port).toBe(true);
  return built;
}

function riverPortIsActive(state: GameState) {
  const { x, y } = tileAt(state, inland);
  const checked = transportConnectivitySystem(deepFreeze(state), createTurnContext({ turn: state.turn }));
  const network = checked.transportNetwork.railroadNetworks![N1];
  return network.ports.find(port => port.x === x && port.y === y)?.isActive;
}

function squadron(nation: string, approach: Approach): Fleet {
  return {
    id: `fleet-${nation}`, ownerNationId: nation, name: 'Frigates',
    location: approach.seaId, approach, aggression: 'normal',
    ships: [{ ...WARSHIPS.frigate, id: `ship-${nation}`, experience: 0 }],
  };
}

function linkRail(state: GameState, rail: string[]) {
  return rail.slice(1).reduce((linked, id, i) =>
    addRailroad(linked, N1, tileAt(linked, id), tileAt(linked, rail[i])), state);
}

describe('FR-617 town routes at a rail-served port', () => {
  it.each([['river', inland], ['coastal', mouth]])('requires an open %s port even when rail still carries land freight', (_, siteId) => {
    const base = setTile(riverside(), siteId, { port: true });
    const site = tileAt(base, siteId);
    const provinces = base.provinces.map(p => p.id === site.provinceId ? { ...p, seatTileId: siteId } : p);
    const rail = ['2-9', '3-9', '4-9', '5-9', '6-9', '6-8', '6-7', ...river.slice(0, river.indexOf(siteId) + 1)];
    const built = linkRail(addPort({ ...base, provinces }, N1, site), rail);
    const war = setPair(built, N1, N2, { war: { since: 1, aggressors: [N2] } });
    const outlet = portApproach(war, tileAt(war, mouth))!;
    const enemy = squadron(N2, outlet);
    const blockaded = withFleets(war, [enemy]);
    const connected = (position: GameState) => {
      const checked = transportConnectivitySystem(deepFreeze(position), createTurnContext({ turn: position.turn }));
      expect(collectingHub(checked, N1, siteId)?.tileId).toBe(siteId);
      return townsOf(checked, N1).find(t => t.provinceId === site.provinceId)?.connected;
    };
    expect(connected(war)).toBe(true);
    expect(connected(blockaded)).toBe(false);
    expect(connected(withFleets(war, [enemy, squadron(N1, outlet)]))).toBe(true);
    const depotId = rail[rail.length - 2];
    const depot = setTile(blockaded, depotId, { depot: true });
    expect(connected(addDepot(depot, N1, tileAt(depot, depotId)))).toBe(true);
    if (siteId === inland) {
      const outletProvince = tileAt(war, mouth).provinceId!;
      expect(connected(transferProvince(war, outletProvince, N2))).toBe(false);
    }
  });
});

describe('FR-582 river transport and rail bridges', () => {
  it('takes an inland port Order on river land and refuses otherwise identical dry land, hills and mountains', () => {
    const state = riverside();
    expect(validateOrder(state, portOrder)).toEqual({ ok: true });
    for (const change of [{ hasRiver: false }, { terrain: TerrainType.FertileHills }, { terrain: TerrainType.Mountains }]) {
      expect(validateOrder(setTile(state, inland, change), portOrder)).toEqual({ ok: false, reason: 'invalid-site' });
    }
  });

  it('activates a commissioned port through its connected river and stops when the downstream province is lost or the river is cut', () => {
    const state = commissionRiverPort(riverside());
    expect(riverPortIsActive(state)).toBe(true);
    expect(riverPortIsActive(setTile(state, '9-7', { hasRiver: false }))).toBe(false);
    const mouthProvince = tileAt(state, mouth).provinceId!;
    expect(mouthProvince).not.toBe(tileAt(state, inland).provinceId);
    expect(riverPortIsActive(transferProvince(state, mouthProvince, N2))).toBe(false);
  });

  it('applies a real wartime blockade at the river mouth, restores the port under relief and preserves an independent rail connection', () => {
    const state = commissionRiverPort(riverside());
    const approach = portApproach(state, tileAt(state, mouth))!;
    const war = setPair(state, N1, N2, { war: { since: 1, aggressors: [N2] } });
    const blockaded = withFleets(war, [squadron(N2, approach)]);
    expect(riverPortIsActive(blockaded)).toBe(false);
    expect(riverPortIsActive(withFleets(blockaded, [squadron(N2, approach), squadron(N1, approach)]))).toBe(true);

    const rail = ['2-9', '3-9', '4-9', '5-9', '6-9', '6-8', '6-7', inland];
    const railConnected = linkRail(blockaded, rail);
    expect(riverPortIsActive(railConnected)).toBe(true);
    const riverCatch = (position: GameState) => {
      const checked = transportConnectivitySystem(position, createTurnContext({ turn: position.turn }));
      return collectingFishHub(checked, N1, '8-6')?.tileId;
    };
    expect(riverCatch(railConnected)).toBeUndefined();
    expect(riverCatch(withFleets(railConnected, [squadron(N1, approach), squadron(N2, approach)]))).toBe(inland);
  });

  it('FR-583 keeps land freight on the independent railway but stops fishing at a blockaded coastal port', () => {
    const bank = setTile(riverside(), '9-7', { resource: { type: ResourceType.Fish, level: 0 } });
    const base = setTile(bank, mouth, { port: true });
    const site = tileAt(base, mouth);
    const state = linkRail(addPort(base, N1, site), ['2-9', '3-9', '4-9', '5-9', '6-9', '6-8', '6-7', ...river]);
    const approach = portApproach(state, site)!;
    const sea = getAdjacentTiles(state.map, site.x, site.y).find(isOcean)!;
    const enemy = squadron(N2, approach);
    const war = setPair(state, N1, N2, { war: { since: 1, aggressors: [N2] } });
    const catchAtPort = (fleets: Fleet[]) => {
      const checked = transportConnectivitySystem(withFleets(war, fleets), createTurnContext({ turn: war.turn }));
      expect(collectingHub(checked, N1, mouth)?.tileId).toBe(mouth);
      return {
        fishingPort: collectingFishHub(checked, N1, sea.id)?.tileId,
        fish: computeLogisticsTransport(checked.map, N1, checked.transportNetwork.railroadNetworks![N1]).fish ?? 0,
      };
    };
    const open = catchAtPort([]);
    expect(open.fishingPort).toBe(mouth);
    const blockaded = catchAtPort([enemy]);
    expect(blockaded.fishingPort).toBeUndefined();
    const nearbyGrounds = getAdjacentTiles(state.map, site.x, site.y)
      .filter(tile => isOcean(tile) || (tile.hasRiver && tile.ownerNationId === N1));
    expect(blockaded.fish).toBe(open.fish - nearbyGrounds.length);
    expect(catchAtPort([enemy, squadron(N1, approach)])).toEqual(open);
  });

  it('embarks from a commissioned inland river port via its mouth and identifies that shore for relief', () => {
    const built = commissionRiverPort(riverside());
    const fromProvinceId = tileAt(built, inland).provinceId!;
    const outlet = portApproach(built, tileAt(built, mouth))!;
    expect(outlet.provinceId).not.toBe(fromProvinceId);
    const island = portApproach(built, tileAt(built, '12-7'))!;
    const state = addRegiments(transferProvince(built, island.provinceId, N1), N1, fromProvinceId, ['regulars']);
    const army = state.armies.find(a => a.ownerId === N1 && a.provinceId === fromProvinceId)!;
    const regimentIds = [army.regiments.find(r => r.type === 'regulars')!.id];
    const war = setPair(state, N1, N2, { war: { since: 1, aggressors: [N2] } });
    const station = (approach: Approach) => ({ ...squadron(N1, approach), siteSinceTurn: 1 });
    const move = (to: Approach): Order => ({
      kind: 'moveArmy', via: 'sea', nationId: N1, fromProvinceId, toProvinceId: to.provinceId, regimentIds,
    });
    const open = withFleets(war, [station(island)]);
    expect(validateOrder(open, move(island))).toEqual({ ok: true });
    expect(openPortApproaches(setTile(open, '9-7', { hasRiver: false }), N1, fromProvinceId)).toEqual([]);
    const enemy = squadron(N2, outlet);
    const closed = withFleets(war, [station(island), enemy]);
    expect(validateOrder(closed, move(island))).toEqual({ ok: false, reason: 'port-closed' });
    expect(threatenedPorts(closed, N1)).toContainEqual(outlet);
    const relieved = withFleets(war, [station(outlet), enemy]);
    expect(validateOrder(relieved, move(outlet))).toEqual({ ok: true });
  });

  it('FR-583 stops capital fishing under blockade while its depot keeps gathering land resources', () => {
    const war = setPair(newGame({ seed: 1, world: 'continent' }), N1, N2, { war: { since: 1, aggressors: [N2] } });
    const enemy = squadron(N2, homeApproach(war, N1)!);
    const freight = (fleets: Fleet[]) => {
      const checked = transportConnectivitySystem(withFleets(war, fleets), createTurnContext({ turn: war.turn }));
      return computeLogisticsTransport(checked.map, N1, checked.transportNetwork.railroadNetworks![N1]);
    };
    const open = freight([]);
    expect(open.fish).toBeGreaterThan(0);
    expect(open.grain).toBeGreaterThan(0);
    const closed = freight([enemy]);
    expect(closed.fish ?? 0).toBe(0);
    expect(closed.grain).toBe(open.grain);
  });

  it('requires bridge technology to enter a river and also requires the underlying terrain permission', () => {
    const state = newGame(1);
    const riverHills = setTile(state, '3-9', { hasRiver: true, terrain: TerrainType.FertileHills });
    const order: Order = { kind: 'moveAndBuildRail', nationId: N1, workerId: engineer, toTileId: '3-9' };
    expect(validateOrder(setTechnologies(riverHills, N1, 'compoundSteamEngine'), order)).toEqual({ ok: false, reason: 'invalid-site' });
    expect(validateOrder(setTechnologies(riverHills, N1, 'ironRailroadBridge'), order)).toEqual({ ok: false, reason: 'invalid-site' });
    expect(validateOrder(setTechnologies(riverHills, N1, 'ironRailroadBridge', 'compoundSteamEngine'), order)).toEqual({ ok: true });
  });

  it('requires a bridge when a rail section starts on a riverside depot and ends on dry land', () => {
    const dry = newGame(1);
    const bank = '3-9';
    const state = put(setTile(dry, bank, { hasRiver: true, depot: true }), engineer, bank);
    const order: Order = { kind: 'moveAndStartConstruction', nationId: N1, workerId: engineer, toTileId: '4-9', structure: 'rail', fromTileId: bank };
    expect(validateOrder(setTechnologies(state, N1, 'highPressureSteamEngine'), order)).toEqual({ ok: false, reason: 'invalid-site' });
    expect(validateOrder(setTechnologies(state, N1, 'ironRailroadBridge'), order)).toEqual({ ok: true });
  });
});
