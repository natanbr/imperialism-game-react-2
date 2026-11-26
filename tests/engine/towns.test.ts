import { describe, expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { townsOf, townOutput } from '@/engine/world/towns';
import type { GameState } from '@/types/GameState';
import { ResourceType as R } from '@/types/Resource';
import { TerrainType, type Resource } from '@/types/Tile';
import type { RailroadNetwork } from '@/types/Transport';
import { N1, N2, deepFreeze, setBuilding, setIndustry, setTile, tileAt } from './fixtures';

const continent = () => newGame({ seed: 1, world: 'continent' });
const northwest = 'province-nation-1-nw';
const full = { textile: 4, wood: 4, metal: 4 } as const;
const emptyNetwork: RailroadNetwork = { graph: {}, depots: [], ports: [] };

function withNetwork(state: GameState, owner: string, patch: Partial<RailroadNetwork>) {
  return {
    ...state,
    transportNetwork: { ...state.transportNetwork, railroadNetworks: {
      ...state.transportNetwork.railroadNetworks, [owner]: { ...emptyNetwork, ...patch },
    } },
  };
}

const town = (state: GameState) => townsOf(state, N1).find(t => t.provinceId === northwest)!;

describe('FR-617 province seats and active hubs', () => {
  it.each(['continent', 'random'] as const)('finds the actual %s seats once for either controller', world => {
    const state = newGame({ seed: 7, world });
    for (const nation of state.nations) {
      const provinces = state.provinces.filter(p => p.ownerId === nation.id);
      const seat = provinces.map(p => tileAt(state, p.seatTileId))
        .find(t => t.terrain !== TerrainType.Capital && t.terrain !== TerrainType.Town)!;
      const position = withNetwork(setTile(state, seat.id, { depot: true }), nation.id, {
        depots: [{ x: seat.x, y: seat.y, isActive: true }],
      });
      const swapped: GameState = { ...position, nations: position.nations.map(n => ({
        ...n, controller: n.controller === 'human' ? 'scripted' : 'human',
      })) };
      const result = townsOf(deepFreeze(position), nation.id);
      expect(result.map(t => t.seatTileId).sort()).toEqual(provinces.map(p => p.seatTileId).sort());
      expect(result.find(t => t.provinceId === seat.provinceId)).toMatchObject({ seatTileId: seat.id, connected: true });
      expect(townsOf(deepFreeze(swapped), nation.id)).toEqual(result);
    }
  });

  it('has no towns on Two islands or for a minor nation', () => {
    for (const owner of [N1, N2]) expect(townsOf(newGame(1), owner)).toEqual([]);
    const state = continent();
    expect(townsOf(state, state.minorNations[0].id)).toEqual([]);
  });

  it('uses hex neighbours and ignores inactive nodes, bare rail and the other owner’s network', () => {
    const state = setTile(continent(), '4-4', { connected: true });
    const onSeat = { x: 4, y: 4, isActive: false };
    const adjacent = { x: 3, y: 3, isActive: true }; // Row four is offset left of row three.
    const twoAway = { x: 5, y: 3, isActive: true };
    const rival = withNetwork(state, N2, { depots: [adjacent] });
    const disconnected = withNetwork(rival, N1, { depots: [onSeat, twoAway], ports: [onSeat] });
    expect(town(disconnected).connected).toBe(false);
    const open = withNetwork(rival, N1, { ports: [adjacent] });
    expect(town(open).connected).toBe(true);
    const overlapping = withNetwork(rival, N1, { ports: [adjacent], depots: [{ ...onSeat, isActive: true }] });
    expect(townsOf(overlapping, N1)).toHaveLength(townsOf(open, N1).length);
    expect(town(overlapping).connected).toBe(true);
    const twoPorts = withNetwork(rival, N1, {
      ports: [{ ...onSeat, isActive: true }, adjacent], closedFishingPorts: ['4-4'],
    });
    expect(town(twoPorts).connected).toBe(true);
    expect(town({ ...state, transportNetwork: { ...state.transportNetwork, railroadNetworks: undefined } }).connected).toBe(false);
  });

  it('can use the capital as a land depot after its fishing approach closes', () => {
    const state = continent();
    const capital = state.transportNetwork.railroadNetworks![N1].capital!;
    const capitalTile = state.map.tiles[capital.y][capital.x];
    const position = withNetwork(state, N1, { capital, closedFishingPorts: [capitalTile.id] });
    expect(townsOf(position, N1).find(t => t.seatTileId === capitalTile.id)?.connected).toBe(true);
  });
});

const terrains = {
  [R.Cotton]: TerrainType.Plantation, [R.Wool]: TerrainType.FertileHills,
  [R.Timber]: TerrainType.HardwoodForest, [R.Coal]: TerrainType.BarrenHills,
  [R.IronOre]: TerrainType.Mountains, [R.Oil]: TerrainType.Swamp,
} as const;
type TownFixtureResource = keyof typeof terrains;
type Site = Resource & { type: TownFixtureResource };
const sites = (type: TownFixtureResource, count: number): Site[] =>
  Array.from({ length: count }, () => ({ type, level: 0, discovered: true }));

/** Replace just the test province's resources. Its neighbour provinces keep their ordinary land. */
function withResources(resources: Site[]) {
  const state = continent();
  const ids = state.provinces.find(p => p.id === northwest)!.tileIds;
  expect(ids.length).toBeGreaterThanOrEqual(resources.length);
  const tiles = state.map.tiles.map(row => row.map(tile => {
    if (tile.provinceId !== northwest) return tile;
    const resource = resources[ids.indexOf(tile.id)];
    return { ...tile, resource, terrain: resource ? terrains[resource.type] : TerrainType.DryPlains };
  }));
  return { ...state, map: { ...state.map, tiles } };
}

describe('FR-618 province resource census, installed factories and tier bundles', () => {
  const chains = [
    { chain: 'textile', factory: 'clothingFactory', mill: 'textileMill', resource: R.Wool, material: 'fabric', good: 'clothing' },
    { chain: 'wood', factory: 'furnitureFactory', mill: 'lumberMill', resource: R.Timber, material: 'lumber', good: 'furniture' },
    { chain: 'metal', factory: 'metalWorks', mill: 'steelMill', resource: R.Coal, material: 'steel', good: 'hardware' },
  ] as const;

  describe.each(chains)('$chain chain', ({ chain, factory, mill, resource, material, good }) => {
    it.each([
      { tier: 1, tiles: 2, capacity: 4, goods: 0 },
      { tier: 2, tiles: 4, capacity: 8, goods: 1 },
      { tier: 3, tiles: 6, capacity: 12, goods: 1 },
      { tier: 4, tiles: 8, capacity: 16, goods: 2 },
    ])('supports tier $tier at $tiles tiles and $capacity installed capacity', ({ tier, tiles, capacity, goods }) => {
      const supported = (count: number, size: number, iron = tiles) => {
        const resources = sites(resource, count);
        if (chain === 'metal') resources.push(...sites(R.IronOre, iron));
        const state = setBuilding(withResources(resources), N1, mill, { capacity: 32 });
        return town(setBuilding(state, N1, factory, { capacity: size, pendingCapacity: 4, orders: {} })).supported;
      };
      const tiers = supported(tiles, capacity);
      expect(tiers[chain]).toBe(tier);
      expect(townOutput(tiers, full)).toEqual({ [material]: tier, ...(goods ? { [good]: goods } : {}) });
      expect(supported(tiles - 1, capacity)[chain]).toBe(tier - 1);
      expect(supported(tiles, capacity - 1)[chain]).toBe(tier - 1);
      if (chain === 'metal') expect(supported(tiles, capacity, tiles - 1).metal).toBe(tier - 1);
    });
  });

  it('counts mixed fibres, hardwood and scrub timber throughout the province once, including unimproved land', () => {
    const base = withResources([
      { type: R.Cotton, level: 3 }, { type: R.Wool, level: 0 },
      { type: R.Timber, level: 3 }, { type: R.Timber, level: 0 },
      ...sites(R.Coal, 2), ...sites(R.IronOre, 2), ...sites(R.Oil, 2),
    ]);
    const scrub = base.provinces.find(p => p.id === northwest)!.tileIds[3];
    const cleared = setIndustry(setTile(base, scrub, { terrain: TerrainType.ScrubForest }), N1, { buildings: {} });
    const position = chains.reduce((s, { factory }) => setBuilding(s, N1, factory, { capacity: 16 }), cleared);
    const facts = town(deepFreeze(position));
    expect(facts.connected).toBe(false);
    expect(facts.resources).toEqual({ cotton: 1, wool: 1, timber: 2, coal: 2, ironOre: 2 });
    expect(town(cleared).supported).toEqual({ textile: 0, wood: 0, metal: 0 });
    expect(facts.supported).toEqual({ textile: 1, wood: 1, metal: 1 });
    expect(townOutput(facts.supported, full)).toEqual({ fabric: 1, lumber: 1, steel: 1 });
  });

  it('gives identical owner facts for empty or undiscovered deposits and for a private rival expansion', () => {
    const state = setBuilding(withResources([...sites(R.Coal, 1), ...sites(R.IronOre, 1)]), N1, 'metalWorks', { capacity: 8 });
    const ids = state.provinces.find(p => p.id === northwest)!.tileIds;
    const hidden = setTile(setTile(state, ids[2], { terrain: TerrainType.Mountains,
      resource: { type: R.IronOre, level: 0, discovered: false } }), ids[3], { terrain: TerrainType.BarrenHills,
      resource: { type: R.Coal, level: 0, discovered: false } });
    expect(townsOf(setBuilding(hidden, N2, 'metalWorks', { capacity: 16 }), N1)).toEqual(townsOf(state, N1));
    const known = setTile(setTile(hidden, ids[2], { resource: { type: R.IronOre, level: 0, discovered: true } }),
      ids[3], { resource: { type: R.Coal, level: 0, discovered: true } });
    expect(town(known).supported.metal).toBe(1);
  });

  it('stops at the final row and limits each commodity bundle to its own matured and supported tiers', () => {
    const state = setBuilding(withResources(sites(R.Timber, 12)), N1, 'furnitureFactory', { capacity: 32 });
    expect(town(state).supported.wood).toBe(4);
    expect(townOutput({ textile: 4, wood: 2, metal: 3 }, { textile: 0, wood: 4, metal: 1 }))
      .toEqual({ lumber: 2, furniture: 1, steel: 1 });
  });
});
