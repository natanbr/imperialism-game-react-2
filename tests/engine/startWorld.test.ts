// FR-080 to FR-082 (NR-007): a new game opens on a small map of two islands. The islands are found
// here by walking neighbour steps over land, not read from the engine's template, so the test checks
// the map a player gets.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { applyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { getNeighborCoords } from '@/engine/map/mapHelpers';
import { computeLogisticsTransport } from '@/engine/systems/logisticsSystem';
import { CAPITAL_SITES, settleIsland } from '@/engine/world/startWorld';
import type { Order } from '@/engine';
import type { GameMap } from '@/types/Map';
import { ResourceType } from '@/types/Resource';
import { TerrainType, type Tile } from '@/types/Tile';
import { deepFreeze } from './fixtures';

const isLand = (t: Tile) => t.terrain !== TerrainType.Water;
const key = (t: Pick<Tile, 'x' | 'y'>) => `${t.x}-${t.y}`;
const neighbours = (map: GameMap, t: Pick<Tile, 'x' | 'y'>): Tile[] =>
  getNeighborCoords(map, t.x, t.y).map(([x, y]) => map.tiles[y][x]);
const isShore = (map: GameMap, t: Tile) => isLand(t) && neighbours(map, t).some(n => !isLand(n));

/** The groups of land tiles joined by neighbour steps, west to east. */
function islandsOf(map: GameMap): Tile[][] {
  const seen = new Set<string>();
  const islands: Tile[][] = [];
  for (const start of map.tiles.flat()) {
    if (!isLand(start) || seen.has(key(start))) continue;
    const island: Tile[] = [];
    const queue = [start];
    seen.add(key(start));
    while (queue.length) {
      const t = queue.shift()!;
      island.push(t);
      for (const n of neighbours(map, t)) {
        if (isLand(n) && !seen.has(key(n))) {
          seen.add(key(n));
          queue.push(n);
        }
      }
    }
    islands.push(island);
  }
  return islands.sort((a, b) => Math.min(...a.map(t => t.x)) - Math.min(...b.map(t => t.x)));
}

const SIX_TYPES = [
  TerrainType.Farm, TerrainType.Orchard, TerrainType.OpenRange, TerrainType.Plantation, TerrainType.HardwoodForest, TerrainType.BarrenHills,
].sort();
const RESOURCE_OF: Partial<Record<TerrainType, ResourceType[]>> = {
  [TerrainType.Farm]: [ResourceType.Grain],
  [TerrainType.Orchard]: [ResourceType.Fruit],
  [TerrainType.OpenRange]: [ResourceType.Livestock],
  [TerrainType.Plantation]: [ResourceType.Cotton],
  [TerrainType.HardwoodForest]: [ResourceType.Timber],
  [TerrainType.BarrenHills]: [ResourceType.Coal, ResourceType.IronOre],
};

const g = newGame({ seed: 7 });
const [island1, island2] = islandsOf(g.map);
const capital = g.map.tiles.flat().find(t => t.cityId === 'capital-1')!;
const typesOf = (island: Tile[]) => [...new Set(island.filter(t => t.terrain !== TerrainType.Capital).map(t => t.terrain))].sort();

describe('FR-080 a new game is a 24x16 sea with two islands', () => {
  it('FR-080 the map is 24 columns by 16 rows, every tile where its id says', () => {
    expect(g.map.config).toMatchObject({ cols: 24, rows: 16 });
    expect(g.map.tiles).toHaveLength(16);
    expect(g.map.tiles.every((row, y) => row.length === 24 && row.every((t, x) => t.x === x && t.y === y && t.id === `${x}-${y}`))).toBe(true);
  });

  it('FR-080 the land forms exactly two islands, and no land tile of one touches the other', () => {
    expect(islandsOf(g.map)).toHaveLength(2);
    const onIsland2 = new Set(island2.map(key));
    const touching = island1.filter(t => neighbours(g.map, t).some(n => onIsland2.has(key(n))));
    expect(touching).toEqual([]);
  });

  it('FR-080 the map border is sea, and island 1 lies west of column 12, island 2 east of it', () => {
    const border = g.map.tiles.flat().filter(t => t.x === 0 || t.y === 0 || t.x === 23 || t.y === 15);
    expect(border.filter(isLand)).toEqual([]);
    expect(island1.every(t => t.x < 12)).toBe(true);
    expect(island2.every(t => t.x >= 12)).toBe(true);
  });

  it('FR-080 each island holds the same six tile types and nothing else, each with its own resource', () => {
    expect(typesOf(island1)).toEqual(SIX_TYPES);
    expect(typesOf(island2)).toEqual(SIX_TYPES);
    for (const t of [...island1, ...island2].filter(t => t.terrain !== TerrainType.Capital)) {
      expect({ tile: t.id, resource: RESOURCE_OF[t.terrain]?.includes(t.resource!.type) }).toEqual({ tile: t.id, resource: true });
    }
  });

  it('FR-080 no coast, river, town, mountain, swamp or desert tile anywhere (decision Q16: the shore is land next to the sea)', () => {
    const terrains = new Set(g.map.tiles.flat().map(t => t.terrain));
    expect([...terrains].sort()).toEqual([...SIX_TYPES, TerrainType.Capital, TerrainType.Water].sort());
    expect(g.map.tiles.flat().filter(t => t.hasRiver)).toEqual([]);
  });

  it('FR-080 the hills hide coal or iron ore until prospected, and each island has both', () => {
    for (const island of [island1, island2]) {
      const hills = island.filter(t => t.terrain === TerrainType.BarrenHills);
      expect(hills.every(t => t.resource?.discovered === false && t.resource.level === 0)).toBe(true);
      expect([...new Set(hills.map(t => t.resource!.type))].sort()).toEqual([ResourceType.Coal, ResourceType.IronOre].sort());
    }
  });

  it('FR-080 every resource is at level 0 except on the capital\'s neighbours', () => {
    const nextToCapital = new Set(neighbours(g.map, capital).map(key));
    const raised = g.map.tiles.flat().filter(t => (t.resource?.level ?? 0) > 0).map(key);
    expect(raised.every(k => nextToCapital.has(k))).toBe(true);
  });

  it('FR-080 island 2 is island 1 shifted 12 columns east (terrain and resource), apart from the capital and its neighbours', () => {
    const settled = new Set([key(capital), ...neighbours(g.map, capital).map(key)]);
    const diffs = island1
      .filter(t => !settled.has(key(t)))
      .filter(t => {
        const twin = g.map.tiles[t.y][t.x + 12];
        return twin.terrain !== t.terrain || JSON.stringify(twin.resource) !== JSON.stringify(t.resource);
      })
      .map(key);
    expect(diffs).toEqual([]);
    expect(island2).toHaveLength(island1.length);
  });

  it('FR-080 the map is the same for every seed', () => {
    expect(newGame({ seed: 1 }).map).toEqual(newGame({ seed: 123456 }).map);
  });
});

describe('FR-081 the player starts on island 1', () => {
  it('FR-081 the capital stands on a shore tile of island 1, at CAPITAL_SITES[0], with the seven civilians', () => {
    expect(capital).toMatchObject({ terrain: TerrainType.Capital, ownerNationId: 'nation-1', x: CAPITAL_SITES[0].x, y: CAPITAL_SITES[0].y });
    expect(island1.map(key)).toContain(key(capital));
    expect(isShore(g.map, capital)).toBe(true);
    expect(capital.workers).toHaveLength(7);
    expect(g.map.tiles.flat().filter(t => t.workers.length > 0).map(key)).toEqual([key(capital)]);
  });

  it('FR-081 the nation owns every land tile of island 1 and no other tile', () => {
    expect(island1.filter(t => t.ownerNationId !== 'nation-1').map(key)).toEqual([]);
    const ownedElsewhere = g.map.tiles.flat().filter(t => t.ownerNationId && t.x >= 12);
    expect(ownedElsewhere.map(key)).toEqual([]);
    expect(g.map.tiles.flat().filter(t => !isLand(t) && t.ownerNationId).map(key)).toEqual([]);
  });

  it('FR-081 the capital\'s neighbours are the sea, two farms, two orchards and a plantation, the land ones at level 1', () => {
    const around = neighbours(g.map, capital);
    expect(around.map(t => t.terrain).sort()).toEqual(
      [TerrainType.Water, TerrainType.Farm, TerrainType.Farm, TerrainType.Orchard, TerrainType.Orchard, TerrainType.Plantation].sort()
    );
    expect(around.filter(isLand).map(t => t.resource?.level)).toEqual([1, 1, 1, 1, 1]);
  });

  it('FR-081 the capital ships 4 grain, 4 fruit and 2 cotton a turn, as on the 40x40 map', () => {
    const network = g.transportNetwork.railroadNetworks!['nation-1'];
    expect(network.capital).toMatchObject({ x: capital.x, y: capital.y });
    expect(computeLogisticsTransport(g.map, 'nation-1', network)).toEqual({ grain: 4, fruit: 4, cotton: 2 });
  });

  it('FR-081 FR-054 the economy loop runs: the first meal feeds all seven, and a canned-food order makes canned food', () => {
    const order: Order = { kind: 'setProduction', nationId: 'nation-1', building: 'foodProcessing', amount: 2 };
    expect(validateOrder(g, order)).toEqual({ ok: true });
    const { state, events } = resolveTurn(applyOrder(g, order), {}, g.seed);
    expect(events).toContainEqual({ type: 'workers-fed', nationId: 'nation-1', fed: 7, sick: 0, starved: 0 });
    expect(events).toContainEqual({ type: 'goods-produced', nationId: 'nation-1', output: 'cannedFood', amount: 2 });
    expect(events.filter(e => e.type === 'order-rejected')).toEqual([]);
    expect((state.nations[0].warehouse as Record<string, number>).cannedFood).toBe(12);
  });
});

describe('FR-082 island 2 is unclaimed, with a capital site for M4\'s second nation', () => {
  it('FR-082 no tile of island 2 has an owner, a city or a worker', () => {
    expect(island2.filter(t => t.ownerNationId || t.cityId || t.workers.length).map(key)).toEqual([]);
  });

  it('FR-082 CAPITAL_SITES[1] is a flat shore tile of island 2, at the same place on its island as the capital', () => {
    expect(CAPITAL_SITES).toHaveLength(2);
    expect(CAPITAL_SITES[1]).toEqual({ x: CAPITAL_SITES[0].x + 12, y: CAPITAL_SITES[0].y });
    const site = g.map.tiles[CAPITAL_SITES[1].y][CAPITAL_SITES[1].x];
    expect(island2.map(key)).toContain(key(site));
    expect(isShore(g.map, site)).toBe(true);
    expect([TerrainType.BarrenHills, TerrainType.HardwoodForest]).not.toContain(site.terrain);
  });

  it('FR-082 settling a second nation there gives it a twin of island 1 and leaves island 1 as it was', () => {
    const map = deepFreeze(structuredClone(g.map));
    const both = settleIsland(map, 'nation-2', 'capital-2', CAPITAL_SITES[1]);

    const twinOf = (t: Tile) => both.tiles[t.y][t.x + 12];
    const mismatches = island1.filter(t => {
      const twin = twinOf(t);
      return (
        twin.terrain !== t.terrain ||
        JSON.stringify(twin.resource) !== JSON.stringify(t.resource) ||
        twin.ownerNationId !== 'nation-2' ||
        (t.cityId === 'capital-1') !== (twin.cityId === 'capital-2')
      );
    });
    expect(mismatches.map(key)).toEqual([]);
    expect(both.tiles.map(row => row.filter(t => t.x < 12))).toEqual(g.map.tiles.map(row => row.filter(t => t.x < 12)));
  });
});
