// M5 (plan "The v2 world", decision Q22 option b): the continent is the two-island map with four minor
// nations added in the channel. The minor land below is written out from FR-145, not read from the engine.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { getNeighborCoords } from '@/engine/map/mapHelpers';
import type { GameMap } from '@/types/Map';
import { ResourceType } from '@/types/Resource';
import { TerrainType, type Tile } from '@/types/Tile';

type Letter = 'T' | 'c' | 'i' | 'P' | 'cap';
const LETTER: Record<Letter, { terrain: TerrainType; resource?: ResourceType }> = {
  T: { terrain: TerrainType.HardwoodForest, resource: ResourceType.Timber },
  c: { terrain: TerrainType.BarrenHills, resource: ResourceType.Coal },
  i: { terrain: TerrainType.BarrenHills, resource: ResourceType.IronOre },
  P: { terrain: TerrainType.Plantation, resource: ResourceType.Cotton },
  cap: { terrain: TerrainType.Capital },
};

/** FR-145: the land added in the channel, by minor nation. */
const MINOR_LAND: Record<string, Record<string, Letter>> = {
  Arvelia: {
    '10-3': 'T', '11-3': 'T', '12-3': 'c', '13-3': 'T',
    '10-4': 'c', '11-4': 'cap', '12-4': 'i', '13-4': 'T',
    '10-5': 'P', '11-5': 'i', '12-5': 'c', '13-5': 'P',
  },
  Sundmark: { '12-7': 'T', '12-8': 'P', '12-9': 'cap', '12-10': 'c', '12-11': 'i' },
  Lorran: { '10-1': 'T', '11-1': 'cap', '12-1': 'T', '13-1': 'i' },
  Pellis: { '11-13': 'P', '12-13': 'cap', '13-13': 'P', '11-14': 'c', '12-14': 'T' },
};
const minorOf = new Map(Object.entries(MINOR_LAND).flatMap(([name, tiles]) => Object.keys(tiles).map(id => [id, name] as const)));

const twoIslands = newGame({ seed: 1, world: 'two-islands' });
const continent = newGame({ seed: 1, world: 'continent' });
const tiles = (map: GameMap) => map.tiles.flat();
const at = (map: GameMap, id: string): Tile => tiles(map).find(t => t.id === id)!;
const isLand = (t: Tile) => t.terrain !== TerrainType.Water;
const neighbours = (map: GameMap, t: Tile): Tile[] => getNeighborCoords(map, t.x, t.y).map(([x, y]) => map.tiles[y][x]);
/** The tile as the map draws it, without the province it belongs to (two-islands has none). */
const withoutProvince = (t: Tile): Tile => {
  const copy = { ...t };
  delete copy.provinceId;
  return copy;
};

/** The groups of land tiles joined by neighbour steps over the given tiles, as sorted id lists. */
function components(map: GameMap, keep: (t: Tile) => boolean): string[][] {
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const start of tiles(map)) {
    if (!keep(start) || seen.has(start.id)) continue;
    const group: string[] = [];
    const queue = [start];
    seen.add(start.id);
    while (queue.length) {
      const t = queue.shift()!;
      group.push(t.id);
      for (const n of neighbours(map, t)) {
        if (keep(n) && !seen.has(n.id)) {
          seen.add(n.id);
          queue.push(n);
        }
      }
    }
    groups.push(group.sort());
  }
  return groups.sort((a, b) => a[0].localeCompare(b[0]));
}

describe('FR-145 the continent map', () => {
  it('FR-145 FR-083 the map is 24 x 16, as two-islands, so the whole map still fits 1280 x 720', () => {
    expect(continent.map.config).toEqual(twoIslands.map.config);
    expect(continent.map.config).toMatchObject({ cols: 24, rows: 16 });
    expect(continent.map.tiles).toHaveLength(16);
    expect(continent.map.tiles.every(row => row.length === 24)).toBe(true);
  });

  it('FR-145 the capitals are at 2-9 (Testland) and 14-9 (Valdoria)', () => {
    const capitals = continent.nations.map(n => {
      const tile = tiles(continent.map).find(t => t.cityId === n.cities[0])!;
      return { name: n.name, tile: tile.id, terrain: tile.terrain, owner: tile.ownerNationId };
    });
    expect(capitals).toEqual([
      { name: 'Testland', tile: '2-9', terrain: TerrainType.Capital, owner: 'nation-1' },
      { name: 'Valdoria', tile: '14-9', terrain: TerrainType.Capital, owner: 'nation-2' },
    ]);
  });

  it('FR-145 every tile outside the minor land is the two-islands tile (terrain, resource, level, discovered flag, owner, workers, id)', () => {
    const outside = tiles(continent.map).filter(t => !minorOf.has(t.id));
    expect(outside).toHaveLength(24 * 16 - minorOf.size);
    expect(outside.map(withoutProvince)).toEqual(outside.map(t => at(twoIslands.map, t.id)));
  });

  it('FR-145 the minor land is sea on two-islands and the FR-145 terrain on the continent, each resource discovered at level 1, no owner, nobody on it', () => {
    for (const [id] of minorOf) expect(at(twoIslands.map, id).terrain).toBe(TerrainType.Water);
    const minorTiles = [...minorOf.keys()].map(id => {
      const t = at(continent.map, id);
      return { id, terrain: t.terrain, resource: t.resource, owner: t.ownerNationId, workers: t.workers.length };
    });
    const expected = Object.values(MINOR_LAND).flatMap(land => Object.entries(land)).map(([id, letter]) => {
      const { terrain, resource } = LETTER[letter];
      return { id, terrain, resource: resource ? { type: resource, level: 1, discovered: true } : undefined, owner: undefined, workers: 0 };
    });
    expect(minorTiles).toEqual(expected);
  });

  it('FR-145 row 0, row 15, column 0 and column 23 are sea', () => {
    const edge = tiles(continent.map).filter(t => t.y === 0 || t.y === 15 || t.x === 0 || t.x === 23);
    expect(edge.filter(isLand).map(t => t.id)).toEqual([]);
  });

  it('FR-145 the terrain set is the two-islands set', () => {
    const set = (map: GameMap) => [...new Set(tiles(map).map(t => t.terrain))].sort();
    expect(set(continent.map)).toEqual(set(twoIslands.map));
  });

  it('FR-145 Arvelia is the one land bridge: 10-4 touches island 1 at 9-4, 13-4 touches island 2 at 14-4, and without Arvelia the islands are apart', () => {
    const arvelia = (t: Tile) => minorOf.get(t.id) === 'Arvelia';
    const touches = (a: string, b: string) => neighbours(continent.map, at(continent.map, a)).some(n => n.id === b);
    expect({ west: touches('10-4', '9-4'), east: touches('13-4', '14-4') }).toEqual({ west: true, east: true });
    expect([at(continent.map, '9-4').ownerNationId, at(continent.map, '14-4').ownerNationId]).toEqual(['nation-1', 'nation-2']);

    // With Arvelia the two islands are one land mass; without it the land falls apart into the
    // two-islands islands plus the three island minors.
    const withBridge = components(continent.map, isLand);
    const island1 = tiles(twoIslands.map).filter(t => isLand(t) && t.x < 12).map(t => t.id);
    const island2 = tiles(twoIslands.map).filter(t => isLand(t) && t.x >= 12).map(t => t.id);
    const one = [...island1, ...island2, ...Object.keys(MINOR_LAND.Arvelia)].sort();
    expect(withBridge).toContainEqual(one);
    const withoutBridge = components(continent.map, t => isLand(t) && !arvelia(t));
    const expected = [island1, island2, ...['Sundmark', 'Lorran', 'Pellis'].map(name => Object.keys(MINOR_LAND[name]))]
      .map(g => [...g].sort())
      .sort((a, b) => a[0].localeCompare(b[0]));
    expect(withoutBridge).toEqual(expected);
  });

  it('FR-145 no Sundmark, Lorran or Pellis tile is a hex neighbour of another country\'s land (reachable only by sea)', () => {
    const contacts = ['Sundmark', 'Lorran', 'Pellis'].flatMap(name =>
      Object.keys(MINOR_LAND[name]).flatMap(id =>
        neighbours(continent.map, at(continent.map, id))
          .filter(n => isLand(n) && minorOf.get(n.id) !== name)
          .map(n => `${name} ${id} touches ${n.id}`)
      )
    );
    expect(contacts).toEqual([]);
  });
});
