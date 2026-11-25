import type { CountryId, TileId } from "@/types/Common";
import { MapStyle, type GameMap } from "@/types/Map";
import type { Province } from "@/types/Province";
import { ResourceType } from "@/types/Resource";
import { TerrainType, type Tile } from "@/types/Tile";
import type { RandomMapSize } from "@/types/World";
import { createTileId, parseTileIdToArray } from "@/utils/tileIdUtils";
import { getAdjacentTiles } from "../map/mapHelpers";
import { createMulberry32, type Rng } from "../rng";
import { MINOR_FOUNDINGS } from "./continent";
import { withOwner } from "./provinces";
import { placeStartCivilians, startNation, START_FOUNDINGS } from "./startWorld";
import type { World } from "./worlds";

const dimensions = {
  standard: { cols: 24, rows: 16, width: 6, depth: 4 },
  large: { cols: 32, rows: 20, width: 9, depth: 6 },
} as const;

const terrain = {
  [ResourceType.Grain]: TerrainType.Farm,
  [ResourceType.Fruit]: TerrainType.Orchard,
  [ResourceType.Livestock]: TerrainType.OpenRange,
  [ResourceType.Cotton]: TerrainType.Plantation,
  [ResourceType.Timber]: TerrainType.HardwoodForest,
  [ResourceType.Coal]: TerrainType.BarrenHills,
  [ResourceType.IronOre]: TerrainType.BarrenHills,
};
type SiteResource = keyof typeof terrain;
const palette = Object.keys(terrain) as SiteResource[];

const draw = (rng: Rng, count: number) => Math.floor(rng.next() * count);

function shuffled<T>(values: readonly T[], rng: Rng): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = draw(rng, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** A landmass joining both powers to one minor, and three minor islands sharing its sea. */
function countryOrigins(cols: number, rows: number, width: number, rng: Rng) {
  const powers = shuffled(START_FOUNDINGS, rng);
  const minors = shuffled(MINOR_FOUNDINGS, rng);
  const mainland = [powers[0], minors[0], powers[1]];
  const bands = shuffled([mainland, minors.slice(1)], rng);
  const origins = new Map<CountryId, { x: number; y: number }>();
  bands.forEach((countries, band) => {
    const gap = countries === mainland ? 0 : 1;
    const span = 3 * width + 2 * gap;
    const left = 1 + draw(rng, cols - span - 1);
    countries.forEach((country, i) => origins.set(country.id, { x: left + i * (width + gap), y: 1 + band * rows / 2 }));
  });
  return origins;
}

interface Footprint {
  land: Set<Tile>;
  capital: Tile;
  ring: Tile[];
}

/** Shuffling the same offsets onto the far shore keeps the area exactly width × depth.
 * Every column contains the middle two rows, including at the two mainland borders. */
function footprint(map: GameMap, origin: { x: number; y: number }, width: number, depth: number, rng: Rng): Footprint {
  const column = 1 + draw(rng, width - 2);
  const capitalY = origin.y + 1;
  const coast = Array.from({ length: width }, () => draw(rng, 3));
  coast[column - 1] = coast[column] = coast[column + 1] = 1;
  // The diagonal above the Farm is land; the hex directly above it stays open to the sea.
  coast[column + (capitalY % 2 === 0 ? -1 : 1)] = 0;
  const farCoast = shuffled(coast, rng);
  const land = new Set<Tile>();
  for (let dx = 0; dx < width; dx++) {
    for (let dy = coast[dx]; dy < depth + farCoast[dx]; dy++) {
      land.add(map.tiles[origin.y + dy][origin.x + dx]);
    }
  }
  const capital = map.tiles[capitalY][origin.x + column];
  return { land, capital, ring: getAdjacentTiles(map, capital.x, capital.y).filter(t => land.has(t)) };
}

function plant(tile: Tile, type: SiteResource, level: number, discovered: boolean): void {
  tile.terrain = terrain[type];
  tile.resource = { type, level, discovered };
}

function placeResources({ land, capital, ring }: Footprint, minor: boolean, rng: Rng): void {
  const types = shuffled(palette, rng);
  const budget = Array.from({ length: land.size - 1 }, (_, i) => types[i % types.length]);
  const industry = draw(rng, 2) === 0 ? ResourceType.Timber : ResourceType.Cotton;
  const ringTypes = shuffled([ResourceType.Grain, ResourceType.Grain, ResourceType.Fruit, ResourceType.Livestock, industry] as const, rng);
  plant(capital, ResourceType.Grain, 0, true);
  ring.forEach((tile, i) => {
    plant(tile, ringTypes[i], 1, true);
    budget.splice(budget.indexOf(ringTypes[i]), 1);
  });
  const remaining = shuffled(budget, rng);
  const exposed = new Set<SiteResource>();
  for (const tile of land) {
    if (tile === capital || ring.includes(tile)) continue;
    const type = remaining.pop()!;
    const seam = type === ResourceType.Coal || type === ResourceType.IronOre;
    // A minor can sell one working seam of each metal/fuel; the others await prospecting.
    const discovered = !seam || (minor && !exposed.has(type));
    plant(tile, type, minor && discovered ? 1 : 0, discovered);
    exposed.add(type);
  }
}

/** Spread seats over the footprint; the shuffled candidates break distance ties by seed. */
function seatsOf({ capital, ring, land }: Footprint, minor: boolean, rng: Rng): Tile[] {
  const seats = [capital];
  if (minor) return seats;
  const candidates = shuffled([...land].filter(t => t !== capital && !ring.includes(t)), rng);
  while (seats.length < 4) {
    const distance = (t: Tile) => Math.min(...seats.map(s => (s.x - t.x) ** 2 + (s.y - t.y) ** 2));
    seats.push(candidates.reduce((best, t) => distance(t) > distance(best) ? t : best));
  }
  return seats;
}

function partition(map: GameMap, country: { id: CountryId; name: string }, area: Footprint, minor: boolean, rng: Rng): Province[] {
  const seats = seatsOf(area, minor, rng);
  const provinces = seats.map((seat, i): Province => ({
    id: minor ? `province-${country.id}` : `province-${country.id}-${i + 1}`,
    name: minor ? country.name : `${country.name} Province ${i + 1}`,
    ownerId: country.id, startOwnerId: country.id, seatTileId: seat.id, tileIds: [],
  }));
  // Each tile enters the queue once, via a neighbour already in its province.
  const queue = seats.map((tile, i) => ({ tile, province: provinces[i] }));
  for (const { tile, province } of queue) tile.provinceId = province.id;
  for (let i = 0; i < queue.length; i++) {
    const { tile, province } = queue[i];
    province.tileIds.push(tile.id);
    for (const next of getAdjacentTiles(map, tile.x, tile.y)) {
      if (!area.land.has(next) || next.provinceId) continue;
      next.provinceId = province.id;
      queue.push({ tile: next, province });
    }
  }
  // Keep tile identities stable while the flood-fill uses the footprint set.
  if (!minor) {
    for (const tile of area.land) map.tiles[tile.y][tile.x] = withOwner(tile, country.id);
  }
  return provinces;
}

/** FR-588–592. This is the map immediately before the selected coastal Farms become capitals. */
export function randomWorldPlan(seed: number, size: RandomMapSize = "standard") {
  const rng = createMulberry32(seed);
  const { cols, rows, width, depth } = dimensions[size];
  const map: GameMap = {
    config: { cols, rows, style: MapStyle.HexGrid },
    tiles: Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => ({
      id: createTileId(x, y), x, y, terrain: TerrainType.Water, workers: [], explored: true, visible: true,
    }))),
  };
  const origins = countryOrigins(cols, rows, width, rng);
  const capitals: Record<CountryId, TileId> = {};
  const provinces = [...START_FOUNDINGS, ...MINOR_FOUNDINGS].flatMap(country => {
    const minor = "capitalTileId" in country;
    const area = footprint(map, origins.get(country.id)!, width, depth, rng);
    placeResources(area, minor, rng);
    capitals[country.id] = area.capital.id;
    return partition(map, country, area, minor, rng);
  });
  return { map, capitals, provinces };
}

export function randomWorld(seed = 0, size: RandomMapSize = "standard"): World {
  const { map, capitals, provinces } = randomWorldPlan(seed, size);
  const nations = START_FOUNDINGS.map(startNation);
  const minorNations = MINOR_FOUNDINGS.map(({ id, name }) => ({ id, name, capitalTileId: capitals[id] }));
  for (const [countryId, site] of Object.entries(capitals)) {
    const [x, y] = parseTileIdToArray(site);
    const tile = map.tiles[y][x];
    tile.terrain = TerrainType.Capital;
    delete tile.resource;
    const power = nations.find(n => n.id === countryId);
    if (power) tile.cityId = power.cities[0];
  }
  return { map: placeStartCivilians(map, nations), nations, minorNations, provinces };
}
