import { describe, expect, it } from 'vitest';
import { capitalProvinceOf } from '@/engine/army/armies';
import { newGame } from '@/engine/newGame';
import { settledTownOutput, townDevelopmentSystem } from '@/engine/systems/townDevelopmentSystem';
import { transferProvince } from '@/engine/world/provinces';
import { townsOf } from '@/engine/world/towns';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { deepFreeze, N1, N2, setBuilding, setTile, tileAt } from './fixtures';

const northwest = 'province-nation-1-nw';
const continent = () => newGame({ seed: 1, world: 'continent' });

function port(state: GameState, id: string, owner: string, closed = false, depot = false): GameState {
  const seat = state.provinces.find(p => p.id === id)!.seatTileId;
  const { x, y } = tileAt(state, seat);
  const node = { x, y, isActive: true };
  return { ...state, transportNetwork: { ...state.transportNetwork, railroadNetworks: {
    ...state.transportNetwork.railroadNetworks,
    [owner]: { graph: {}, ports: [node], depots: depot ? [node] : [], closedFishingPorts: closed ? [seat] : [] },
  } } };
}

function industry(state: GameState, id: string, owner: string): GameState {
  const tiles = state.provinces.find(p => p.id === id)!.tileIds;
  for (const [i, tileId] of tiles.entries()) {
    const type = i < 8 ? ResourceType.Timber : ResourceType.Wool;
    state = setTile(state, tileId, { resource: { type, level: 0 } });
  }
  return setBuilding(setBuilding(state, owner, 'furnitureFactory', { capacity: 16 }),
    owner, 'clothingFactory', { capacity: 0 });
}

function settle(state: GameState, count = 1): GameState {
  for (let i = 0; i < count; i++) state = townDevelopmentSystem(deepFreeze(state));
  return state;
}

function offer(state: GameState, id = northwest, owner = N1) {
  const town = townsOf(state, owner).find(t => t.provinceId === id)!;
  return settledTownOutput(state, owner, town);
}

const start = () => port(industry(continent(), northwest, N1), northwest, N1);

describe('FR-619 connected settlements and independent chains', () => {
  it('starts at six and advances every two further settlements, including the full bundle on the boundary', () => {
    let state = port(start(), northwest, N1, false, true);
    const expected = [
      {}, {}, {}, {}, {}, { lumber: 1 }, { lumber: 1 },
      { lumber: 2, furniture: 1 }, { lumber: 2, furniture: 1 },
      { lumber: 3, furniture: 1 }, { lumber: 3, furniture: 1 },
      { lumber: 4, furniture: 2 }, { lumber: 4, furniture: 2 },
    ];
    const nations = state.nations;
    for (const bundle of expected) {
      state = settle(state);
      expect(offer(deepFreeze(state))).toEqual(bundle);
      expect(offer(state)).toEqual(bundle);
    }
    expect(state.nations).toEqual(nations);
  });

  it('starts a late qualifying chain immediately, then requires two more settlements of its own', () => {
    let state = settle(setBuilding(start(), N1, 'clothingFactory', { capacity: 0, pendingCapacity: 8 }), 10);
    expect(offer(state)).toEqual({ lumber: 3, furniture: 1 });
    state = settle(setBuilding(state, N1, 'clothingFactory', { capacity: 8, pendingCapacity: 0 }));
    expect(offer(state)).toEqual({ lumber: 3, furniture: 1, fabric: 1 });
    state = settle(state);
    expect(offer(state)).toEqual({ lumber: 4, furniture: 2, fabric: 1 });
    expect(offer(settle(state))).toEqual({ lumber: 4, furniture: 2, fabric: 2, clothing: 1 });
  });

  it('pauses halfway through startup and through an upgrade, suspending offers until relief', () => {
    let state = settle(start(), 3);
    state = settle(port(state, northwest, N1, true), 4);
    expect(state.townProgress![northwest].connectedSettlements).toBe(3);
    expect(offer(state)).toEqual({});
    state = settle(port(state, northwest, N1), 2);
    expect(offer(state)).toEqual({});
    state = settle(state, 2);
    expect(offer(state)).toEqual({ lumber: 1 });
    const beforeClosure = state.townProgress![northwest];
    state = settle(port(state, northwest, N1, true), 4);
    expect(offer(state)).toEqual({});
    expect(state.townProgress![northwest]).toEqual(beforeClosure);
    expect(offer(settle(port(state, northwest, N1)))).toEqual({ lumber: 2, furniture: 1 });
  });

  it.each([false, true])('retains matured tiers but restarts an interrupted upgrade when support falls (closed %s)', closed => {
    let state = settle(start(), 9); // tier two plus one settlement toward tier three
    state = settle(setBuilding(port(state, northwest, N1, closed), N1, 'furnitureFactory', { capacity: 4 }));
    expect(offer(state)).toEqual(closed ? {} : { lumber: 1 });
    state = settle(setBuilding(port(state, northwest, N1), N1, 'furnitureFactory', { capacity: 16 }));
    expect(offer(state)).toEqual({ lumber: 2, furniture: 1 });
    expect(offer(settle(state))).toEqual({ lumber: 3, furniture: 1 });
  });

  it('retains the sparse historical shape on a world without provinces', () => {
    const initial = newGame(1);
    expect(settle(initial)).toEqual(initial);
    expect(settle(initial)).not.toHaveProperty('townProgress');
  });
});

describe('FR-620 town ownership and founding capitals', () => {
  it('uses the new owner’s route, clock and factories after transfer of a producing ordinary town', () => {
    let state = settle(start(), 8);
    expect(offer(state)).toEqual({ lumber: 2, furniture: 1 });
    const formerView = townsOf(state, N1).find(t => t.provinceId === northwest)!;
    expect(settledTownOutput(state, N2, formerView)).toEqual({});
    state = settle(transferProvince(state, northwest, N2), 3);
    expect(state.townProgress?.[northwest]).toBeUndefined();
    state = settle(setBuilding(port(state, northwest, N2), N2, 'furnitureFactory', { capacity: 4 }), 5);
    expect(offer(state, northwest, N2)).toEqual({});
    state = settle(state, 3);
    expect(state.townProgress![northwest].ownerId).toBe(N2);
    expect(settledTownOutput(state, N1, formerView)).toEqual({});
    expect(settledTownOutput(state, N2, formerView)).toEqual({});
    expect(offer(state, northwest, N2)).toMatchObject({ lumber: 1 });
    expect(offer(state, northwest, N2)).not.toHaveProperty('furniture');
  });

  it('waives only startup for a captured Great Power capital, and excludes it again on recapture', () => {
    const capital = capitalProvinceOf(continent(), N1)!.id;
    let state = settle(port(industry(continent(), capital, N1), capital, N1), 8);
    expect(state.townProgress?.[capital]).toBeUndefined();
    state = settle(transferProvince(state, capital, N2), 2);
    expect(state.townProgress?.[capital]).toBeUndefined();
    state = settle(port(industry(state, capital, N2), capital, N2));
    expect(offer(state, capital, N2)).toEqual({ lumber: 1 });
    state = settle(state);
    expect(offer(state, capital, N2)).toEqual({ lumber: 1 });
    state = settle(state);
    expect(offer(state, capital, N2)).toEqual({ lumber: 2, furniture: 1 });
    state = settle(transferProvince(state, capital, N1), 6);
    expect(state.townProgress?.[capital]).toBeUndefined();
    expect(offer(state, capital)).toEqual({});
  });

  it('keeps a founding minor capital idle and treats another province founded by that minor as ordinary', () => {
    const base = continent();
    const minor = base.minorNations[0].id;
    const capital = capitalProvinceOf(base, minor)!.id;
    let state = transferProvince(base, capital, N1);
    state = settle(port(industry(state, capital, N1), capital, N1), 8);
    expect(offer(state, capital)).toEqual({});
    expect(state.townProgress?.[capital]).toBeUndefined();
    state = { ...state, provinces: state.provinces.map(p => p.id === northwest ? { ...p, startOwnerId: minor } : p) };
    state = settle(port(industry(state, northwest, N1), northwest, N1), 5);
    expect(offer(state)).toEqual({});
    expect(offer(settle(state))).toEqual({ lumber: 1 });
  });
});
