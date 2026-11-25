import { describe, expect, it } from 'vitest';
import { WARSHIPS } from '@/definisions/ships';
import { newGame } from '@/engine/newGame';
import { portApproach, withFleets } from '@/engine/navy/fleets';
import { tryApplyOrder } from '@/engine/orders/apply';
import type { Order } from '@/engine/orders/Order';
import { validateOrder } from '@/engine/orders/validate';
import { addRailroad } from '@/engine/systems/railroadSystem';
import { transportConnectivitySystem } from '@/engine/systems/transportConnectivitySystem';
import { createTurnContext } from '@/engine/turn/context';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { transferProvince } from '@/engine/world/provinces';
import type { GameState } from '@/types/GameState';
import type { Fleet } from '@/types/Navy';
import { TerrainType } from '@/types/Tile';
import { deepFreeze, N1, N2, put, setPair, setTechnologies, setTile, tileAt } from './fixtures';

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
    const squadron = (nation: string): Fleet => ({
      id: `fleet-${nation}`, ownerNationId: nation, name: 'Frigates',
      location: approach.seaId, approach, aggression: 'normal',
      ships: [{ ...WARSHIPS.frigate, id: `ship-${nation}`, experience: 0 }],
    });
    const war = setPair(state, N1, N2, { war: { since: 1, aggressors: [N2] } });
    const blockaded = withFleets(war, [squadron(N2)]);
    expect(riverPortIsActive(blockaded)).toBe(false);
    expect(riverPortIsActive(withFleets(blockaded, [squadron(N2), squadron(N1)]))).toBe(true);

    const rail = ['2-9', '3-9', '4-9', '5-9', '6-9', '6-8', '6-7', inland];
    const railConnected = rail.slice(1).reduce((linked, id, i) =>
      addRailroad(linked, N1, tileAt(linked, id), tileAt(linked, rail[i])), blockaded);
    expect(riverPortIsActive(railConnected)).toBe(true);
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
