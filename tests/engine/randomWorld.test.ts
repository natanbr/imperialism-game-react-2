import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ResourceDevelopmentTable } from '@/definisions/ResourceDevelopment';
import { hasLandRoute } from '@/engine/diplomacy/queries';
import { getAdjacentTiles, isAdjacentToOcean } from '@/engine/map/mapHelpers';
import { homeApproach, portApproach } from '@/engine/navy/approaches';
import { newGame } from '@/engine/newGame';
import { isPortSite } from '@/engine/orders/queries';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import { parseMapSeed } from '@/engine/world/mapSeed';
import { randomWorldPlan } from '@/engine/world/randomWorld';
import type { GameState } from '@/types/GameState';
import type { GameMap } from '@/types/Map';
import type { Province } from '@/types/Province';
import { ResourceType as R } from '@/types/Resource';
import { TerrainType as T, type Tile } from '@/types/Tile';
import type { RandomMapSize } from '@/types/World';

const sizes = ['standard', 'large'] as const;
const seeds = [0, ...Array.from({ length: 64 }, (_, i) => i + 1), 4294967295, 2813929771];
const resources = [R.Grain, R.Fruit, R.Livestock, R.Cotton, R.Timber, R.IronOre, R.Coal] as const;
const food: readonly R[] = [R.Grain, R.Fruit, R.Livestock];
const terrainFor = new Map<R, T>([
  [R.Grain, T.Farm], [R.Fruit, T.Orchard], [R.Livestock, T.OpenRange], [R.Cotton, T.Plantation],
  [R.Timber, T.HardwoodForest], [R.IronOre, T.BarrenHills], [R.Coal, T.BarrenHills],
]);
const random = (seed: number, randomMapSize: RandomMapSize) => newGame({ world: 'random', seed, randomMapSize });
const neighbours = (map: GameMap, tile: Tile) => getAdjacentTiles(map, tile.x, tile.y);
const context = (g: GameState) => `seed ${g.seed}, ${g.randomMapSize ?? 'standard'}`;
const worldOf = (g: GameState) => ({ map: g.map, provinces: g.provinces, nations: g.nations, minorNations: g.minorNations });

function connected(map: GameMap, province: Province, byId: Map<string, Tile>): boolean {
  const members = new Set(province.tileIds);
  const seat = byId.get(province.seatTileId);
  if (!seat || !members.has(seat.id)) return false;
  const seen = new Set([seat.id]);
  const queue = [seat];
  for (let i = 0; i < queue.length; i++) {
    for (const next of neighbours(map, queue[i])) {
      if (!members.has(next.id) || seen.has(next.id)) continue;
      seen.add(next.id);
      queue.push(next);
    }
  }
  return seen.size === members.size;
}

function seaRoute(g: GameState, power: string, minor: string): boolean {
  const home = homeApproach(g, power);
  if (!home) return false;
  const provinces = new Set(g.provinces.filter(p => p.ownerId === minor).map(p => p.id));
  return g.map.tiles.flat().some(t => t.provinceId && provinces.has(t.provinceId) &&
    t.terrain !== T.Capital && isPortSite(g, t) && portApproach(g, t)?.seaId === home.seaId);
}

function landByCountry(g: GameState): Map<string, Tile[]> {
  const countries = [...g.nations, ...g.minorNations];
  const land = new Map(countries.map(country => [country.id, [] as Tile[]]));
  const byId = new Map(g.map.tiles.flat().map(tile => [tile.id, tile]));
  for (const province of g.provinces) {
    const tiles = land.get(province.ownerId)!;
    for (const id of province.tileIds) tiles.push(byId.get(id)!);
  }
  return land;
}

function resourceFairness(g: GameState, resource: R, land: Map<string, Tile[]>): void {
  const counts = Array.from(land, ([id, tiles]) => [id, tiles.filter(t => t.resource?.type === resource).length] as const);
  const numbers = counts.map(([, count]) => count);
  const minimum = Math.min(...numbers);
  if (minimum < 1 || Math.max(...numbers) - minimum > 1) {
    throw new Error(`${context(g)}, ${resource} sites: ${counts.map(([id, count]) => `${id}=${count}`).join(', ')}`);
  }
}

function foodParity(g: GameState): void {
  for (const resource of food) {
    const units = g.nations.map(nation => {
      const capital = g.map.tiles.flat().find(t => t.cityId === nation.cities[0])!;
      return neighbours(g.map, capital).reduce((sum, t) => {
        if (t.resource?.type !== resource || collectingHub(g, nation.id, t.id)?.tileId !== capital.id) return sum;
        return sum + ResourceDevelopmentTable[resource][t.resource.level];
      }, 0);
    });
    if (!units[0] || units[0] !== units[1]) {
      throw new Error(`${context(g)}, ${resource} capital yield: ${g.nations.map((n, i) => `${n.id}=${units[i]}`).join(', ')}`);
    }
  }
}

function checkWorld(g: GameState, size: RandomMapSize) {
  const label = context(g);
  const { map, provinces } = g;
  const [cols, rows] = size === 'large' ? [32, 20] : [24, 16];
  expect(map.config, label).toMatchObject({ cols, rows });
  expect(map.tiles.map(row => row.length), label).toEqual(Array(rows).fill(cols));
  expect(neighbours(map, map.tiles[0][0]).map(t => [t.x, t.y]), label).toEqual([[1, 0], [0, 1]]);
  expect(neighbours(map, map.tiles[1][1]).length, label).toBe(6);
  const byId = new Map(map.tiles.flat().map(t => [t.id, t]));
  expect(byId.size, label).toBe(cols * rows);
  expect(g.market?.mode, label).toBe('partners');
  expect(g.nations.map(n => [n.id, n.name, n.controller]), label).toEqual([
    ['nation-1', 'Testland', 'human'], ['nation-2', 'Valdoria', 'scripted'],
  ]);
  expect(g.minorNations.map(n => [n.id, n.name]), label).toEqual([
    ['minor-1', 'Arvelia'], ['minor-2', 'Sundmark'], ['minor-3', 'Lorran'], ['minor-4', 'Pellis'],
  ]);
  expect(provinces.length, label).toBe(12);
  expect(new Set(provinces.map(p => p.id)).size, label).toBe(12);
  const owner = new Map(provinces.map(p => [p.id, p.ownerId]));
  const members = new Set<string>();
  for (const province of provinces) {
    expect(connected(map, province, byId), `${label}, ${province.id} split or missing seat`).toBe(true);
    for (const id of province.tileIds) {
      if (members.has(id) || byId.get(id)?.provinceId !== province.id) throw new Error(`${label}, bad province membership at ${id}`);
      members.add(id);
    }
  }
  const powers = new Set(g.nations.map(n => n.id));
  for (const t of byId.values()) {
    if (t.terrain === T.Water) {
      if (members.has(t.id) || t.resource || t.provinceId || t.ownerNationId) throw new Error(`${label}, claimed or productive water ${t.id}`);
      continue;
    }
    if (!members.has(t.id) || !t.provinceId) throw new Error(`${label}, unclaimed land ${t.id}`);
    const country = owner.get(t.provinceId)!;
    if (t.ownerNationId !== (powers.has(country) ? country : undefined)) throw new Error(`${label}, bad owner at ${t.id}`);
    if (t.terrain === T.Capital ? !!t.resource :
      !t.resource || terrainFor.get(t.resource.type) !== t.terrain || ResourceDevelopmentTable[t.resource.type]?.[t.resource.level] === undefined) {
      throw new Error(`${label}, invalid terrain/resource at ${t.id}`);
    }
  }
  const capitals = [
    ...g.nations.map(n => [n.id, map.tiles.flat().find(t => t.cityId === n.cities[0])!] as const),
    ...g.minorNations.map(n => [n.id, byId.get(n.capitalTileId)!] as const),
  ];
  expect(new Set(capitals.map(([, t]) => t.id)).size, label).toBe(6);
  expect(map.tiles.flat().filter(t => t.terrain === T.Capital).length, label).toBe(6);
  const plan = randomWorldPlan(g.seed, size);
  const seats = new Set(provinces.map(p => p.seatTileId));
  for (const [country, capital] of capitals) {
    const own = provinces.filter(p => p.ownerId === country);
    expect(own.length, label).toBe(powers.has(country) ? 4 : 1);
    expect(own.some(p => p.seatTileId === capital.id), `${label}, ${country} capital seat`).toBe(true);
    expect(capital.terrain, label).toBe(T.Capital);
    expect(plan.capitals[country], label).toBe(capital.id);
    expect(plan.map.tiles[capital.y][capital.x].terrain, label).toBe(T.Farm);
    expect(isAdjacentToOcean(plan.map, capital.x, capital.y), label).toBe(true);
    expect(isAdjacentToOcean(map, capital.x, capital.y), label).toBe(true);
    const improvable = neighbours(map, capital).filter(t => t.provinceId && owner.get(t.provinceId) === country &&
      !seats.has(t.id) && t.resource && ResourceDevelopmentTable[t.resource.type][t.resource.level + 1] !== undefined);
    expect(improvable.length, `${label}, ${country} development sites`).toBeGreaterThanOrEqual(2);
    expect(improvable.some(t => food.includes(t.resource!.type)), `${label}, ${country} food site`).toBe(true);
    if (!powers.has(country)) continue;
    expect(capital.workers.map(w => w.type).sort(), label).toEqual(['driller', 'engineer', 'farmer', 'forester', 'miner', 'prospector', 'rancher']);
    const landRoutes = g.minorNations.map(n => hasLandRoute(g, country, n.id));
    expect(landRoutes.some(Boolean), `${label}, ${country} land route`).toBe(true);
    for (const [i, minor] of g.minorNations.entries()) {
      expect(landRoutes[i] || seaRoute(g, country, minor.id), `${label}, ${country} to ${minor.name}`).toBe(true);
    }
  }
  const land = landByCountry(g);
  for (const resource of resources) resourceFairness(g, resource, land);
  foodParity(g);
  return land;
}

describe('FR-588 replayable keys and worlds', () => {
  it('trims keys, distinguishes empty and invalid, and accepts the full unsigned range', () => {
    expect(parseMapSeed(' \t ')).toEqual({ kind: 'empty' });
    for (const [text, seed] of [['  Brete ', 2813929771], ['002813929771', 2813929771], ['0', 0], ['4294967295', 4294967295]] as const) {
      expect(parseMapSeed(text)).toEqual({ kind: 'seed', seed });
    }
    for (const text of ['A'.repeat(64), 'North Sea-12']) expect(parseMapSeed(text).kind).toBe('seed');
    expect(parseMapSeed('brete')).not.toEqual(parseMapSeed('Brete'));
    for (const text of ['4294967296', '-1', '+1', '1.0', '123 456', '---', 'A'.repeat(65), 'A_B', 'A\nB', 'é']) {
      expect(parseMapSeed(text), text).toEqual({ kind: 'invalid' });
    }
  });
  it.each(sizes)('word, decimal and independent starts recreate the same %s world', size => {
    const key = parseMapSeed('Brete');
    const decimal = parseMapSeed('2813929771');
    if (key.kind !== 'seed' || decimal.kind !== 'seed') throw new Error('Valid map seed rejected');
    const first = random(key.seed, size);
    expect(worldOf(random(decimal.seed, size))).toEqual(worldOf(first));
    expect(worldOf(random(key.seed, size))).toEqual(worldOf(first));
    expect(worldOf(newGame({ seed: key.seed, world: 'random', randomMapSize: size, turnLimit: 400 }))).toEqual(worldOf(first));
  });
  it('defaults to Standard and varies both coast and province membership by seed', () => {
    const a = random(1, 'standard');
    const b = random(2, 'standard');
    expect(worldOf(newGame({ seed: 1, world: 'random' }))).toEqual(worldOf(a));
    expect(a.map.tiles.flat().map(t => t.terrain === T.Water)).not.toEqual(b.map.tiles.flat().map(t => t.terrain === T.Water));
    expect(a.provinces.map(p => p.tileIds)).not.toEqual(b.provinces.map(p => p.tileIds));
  });
  it.each(sizes)('pins the Brete %s geography and deposits', size => {
    const g = random(2813929771, size);
    const fingerprint = createHash('sha256').update(JSON.stringify(worldOf(g))).digest('hex');
    expect(fingerprint).toBe(({ standard: 'STANDARD_FINGERPRINT', large: 'LARGE_FINGERPRINT' })[size]);
  });
});

describe('FR-589 to FR-592 both sizes at founding', () => {
  it.each(seeds)('seed %i has a playable, contiguous and resource-fair world on both sizes', seed => {
    const [standard, large] = sizes.map(size => checkWorld(random(seed, size), size));
    for (const [id, own] of standard) {
      const developable = (tiles: Tile[]) => tiles.filter(t => t.resource && ResourceDevelopmentTable[t.resource.type][t.resource.level + 1] !== undefined).length;
      expect(developable(large.get(id)!), `seed ${seed} Large, ${id} developable land`).toBeGreaterThan(developable(own));
    }
  });
  it.each(['normal', 'demo'] as const)('preserves the %s start kit, controllers, field forces and Demo overlay', difficulty => {
    const fixed = newGame({ seed: 8, world: 'continent', difficulty });
    const g = newGame({ seed: 8, world: 'random', difficulty });
    const normal = random(8, 'standard');
    expect(g.map).toEqual(normal.map);
    expect(g.provinces).toEqual(normal.provinces);
    expect(g.minorNations).toEqual(normal.minorNations);
    expect(g.nations).toEqual(fixed.nations);
    const forces = (s: GameState) => s.armies.flatMap(a => a.regiments.map(r => a.ownerId + '/' + r.type)).sort();
    expect(forces(g)).toEqual(forces(fixed));
    expect(g.fleets).toEqual(fixed.fleets);
  });
});

describe('FR-591 / FR-592 negative controls', () => {
  it('detects two separated members even when the province lists both IDs', () => {
    const g = random(1, 'standard');
    const byId = new Map(g.map.tiles.flat().map(t => [t.id, t]));
    const p = g.provinces.find(p => p.tileIds.some(id => id !== p.seatTileId &&
      !neighbours(g.map, byId.get(p.seatTileId)!).some(n => n.id === id)))!;
    const far = p.tileIds.find(id => id !== p.seatTileId &&
      !neighbours(g.map, byId.get(p.seatTileId)!).some(n => n.id === id))!;
    expect(connected(g.map, { ...p, tileIds: [p.seatTileId, far] }, byId)).toBe(false);
  });
  it('rejects a legal minor port when the two outlets belong to different seas', () => {
    const g = random(1, 'standard');
    const [power] = g.nations;
    const [minor] = g.minorNations;
    const province = (ownerId: string) => g.provinces.find(p => p.ownerId === ownerId)!;
    const shore = (x: number, y: number, terrain: T, extra: Partial<Tile> = {}): Tile => ({
      x, y, id: `${x}-${y}`, terrain, explored: true, visible: true, workers: [], ...extra,
    });
    const make = (barrier: T): GameState => {
      const top = [
        shore(0, 0, T.Capital, { ownerNationId: power.id, cityId: power.cities[0], provinceId: province(power.id).id }),
        shore(1, 0, T.Water), shore(2, 0, barrier), shore(3, 0, T.Water),
        shore(4, 0, T.Farm, { provinceId: province(minor.id).id }),
        shore(5, 0, T.Capital, { provinceId: province(minor.id).id }),
      ];
      return { ...g, map: { config: { ...g.map.config, cols: top.length, rows: 1 }, tiles: [top] },
        provinces: [
          { ...province(power.id), seatTileId: '0-0', tileIds: ['0-0'] },
          { ...province(minor.id), seatTileId: '5-0', tileIds: ['4-0', '5-0'] },
        ] };
    };
    const split = make(T.Farm);
    expect(hasLandRoute(split, power.id, minor.id)).toBe(false);
    expect(isPortSite(split, split.map.tiles[0][4])).toBe(true);
    expect(seaRoute(make(T.Water), power.id, minor.id)).toBe(true);
    expect(seaRoute(split, power.id, minor.id)).toBe(false);
  });
  it('detects shifting an iron ore site from the least supplied country to the best supplied one', () => {
    const g = random(1, 'standard');
    const land = landByCountry(g);
    const ores = (tiles: Tile[]) => tiles.filter(t => t.resource?.type === R.IronOre);
    const ranked = [...land.values()].sort((a, b) => ores(a).length - ores(b).length);
    const from = ores(ranked[0])[0];
    const to = ranked.at(-1)!.find(t => t.resource && t.resource.type !== R.IronOre)!;
    [from.resource, to.resource] = [to.resource, from.resource];
    [from.terrain, to.terrain] = [to.terrain, from.terrain];
    expect(() => resourceFairness(g, R.IronOre, land)).toThrow(/ironOre sites.*nation-1=.*minor-4=/);
  });
  it('detects moving productive grain outside the capital ring while keeping national resource counts intact', () => {
    const g = random(1, 'standard');
    const [nation] = g.nations;
    const capital = g.map.tiles.flat().find(t => t.cityId === nation.cities[0])!;
    const from = neighbours(g.map, capital).find(t => t.ownerNationId === nation.id && t.resource?.type === R.Grain)!;
    const to = g.map.tiles.flat().find(t => t.ownerNationId === nation.id && t.resource &&
      !food.includes(t.resource.type) && !collectingHub(g, nation.id, t.id))!;
    [from.resource, to.resource] = [to.resource, from.resource];
    [from.terrain, to.terrain] = [to.terrain, from.terrain];
    resourceFairness(g, R.Grain, landByCountry(g));
    expect(() => foodParity(g)).toThrow(/grain capital yield/);
  });
});
