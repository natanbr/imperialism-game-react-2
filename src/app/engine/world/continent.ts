// The v2 world, "continent" (FR-145 to FR-147; plan "The v2 world"; decision Q22 option b, taken
// 2026-11-13): the two-island start with four minor nations added in the channel. Arvelia joins the
// two islands as the one land bridge; Sundmark, Lorran and Pellis are islands, reachable only by sea.
// The Great Powers are founded on the two-island map first, so their islands, start levels and
// civilians are exactly the v1 ones (settling floods an island over land, and Arvelia would join them).
import type { MinorNationId, TileId } from "@/types/Common";
import type { GameMap } from "@/types/Map";
import type { MinorNation } from "@/types/MinorNation";
import type { Nation } from "@/types/Nation";
import type { Province } from "@/types/Province";
import { ResourceType } from "@/types/Resource";
import { TerrainType, type Tile } from "@/types/Tile";
import { createTileId, parseTileIdToArray } from "@/utils/tileIdUtils";
import { startWorld } from "./startWorld";
import { HALF_WIDTH } from "./twoIslands";

/** The minor land's letters, as in twoIslands.ts; "cap" is the minor's capital (the Capital terrain). */
type MinorLetter = "T" | "c" | "i" | "P" | "cap";

const MINOR_LEGEND: Record<MinorLetter, { terrain: TerrainType; resource?: ResourceType }> = {
  T: { terrain: TerrainType.HardwoodForest, resource: ResourceType.Timber },
  c: { terrain: TerrainType.BarrenHills, resource: ResourceType.Coal },
  i: { terrain: TerrainType.BarrenHills, resource: ResourceType.IronOre },
  P: { terrain: TerrainType.Plantation, resource: ResourceType.Cotton },
  cap: { terrain: TerrainType.Capital },
};

interface MinorFounding {
  id: MinorNationId;
  /** The remake's own names, none from the original game (FR-146). */
  name: string;
  capitalTileId: TileId;
  /** Its land, every tile one province (FR-147, Q23). */
  land: Readonly<Record<TileId, MinorLetter>>;
}

/** FR-145, FR-146: the four minor nations in id order and their land. */
export const MINOR_FOUNDINGS: readonly MinorFounding[] = [
  {
    id: "minor-1",
    name: "Arvelia",
    capitalTileId: "11-4",
    land: {
      "10-3": "T", "11-3": "T", "12-3": "c", "13-3": "T",
      "10-4": "c", "11-4": "cap", "12-4": "i", "13-4": "T",
      "10-5": "P", "11-5": "i", "12-5": "c", "13-5": "P",
    },
  },
  { id: "minor-2", name: "Sundmark", capitalTileId: "12-9", land: { "12-7": "T", "12-8": "P", "12-9": "cap", "12-10": "c", "12-11": "i" } },
  { id: "minor-3", name: "Lorran", capitalTileId: "11-1", land: { "10-1": "T", "11-1": "cap", "12-1": "T", "13-1": "i" } },
  { id: "minor-4", name: "Pellis", capitalTileId: "12-13", land: { "11-13": "P", "12-13": "cap", "13-13": "P", "11-14": "c", "12-14": "T" } },
];

/** A Great Power island's four provinces (remake split, FR-147): north is y <= 6, west is lx <= 5. */
const LAST_NORTH_ROW = 6;
const LAST_WEST_COLUMN = 5;
const QUARTERS = [
  { suffix: "nw", name: "North-West", north: true, west: true },
  { suffix: "ne", name: "North-East", north: true, west: false },
  { suffix: "sw", name: "South-West", north: false, west: true },
  { suffix: "se", name: "South-East", north: false, west: false },
] as const;
type Quarter = (typeof QUARTERS)[number]["suffix"];

/** Province seats in island columns (lx, y); the South-West province is seated on the capital. */
const SEATS: Readonly<Record<Exclude<Quarter, "sw">, [number, number]>> = { nw: [4, 4], ne: [7, 3], se: [7, 10] };

const quarterOf = (tile: Pick<Tile, "x" | "y">): Quarter => {
  const north = tile.y <= LAST_NORTH_ROW;
  const west = tile.x % HALF_WIDTH <= LAST_WEST_COLUMN;
  return QUARTERS.find((q) => q.north === north && q.west === west)!.suffix;
};

/** The four provinces of a Great Power: its own tiles split by quarter, in map order (FR-147). */
function greatPowerProvinces(map: GameMap, nation: Nation): Province[] {
  const own = map.tiles.flat().filter((t) => t.ownerNationId === nation.id);
  const capital = own.find((t) => t.cityId === nation.cities[0])!;
  const islandStart = capital.x - (capital.x % HALF_WIDTH);
  return QUARTERS.map(({ suffix, name }) => {
    const seat = suffix === "sw" ? capital.id : createTileId(islandStart + SEATS[suffix][0], SEATS[suffix][1]);
    return {
      id: `province-${nation.id}-${suffix}`,
      name: `${nation.name} ${name}`,
      ownerId: nation.id,
      seatTileId: seat,
      tileIds: own.filter((t) => quarterOf(t) === suffix).map((t) => t.id),
    };
  });
}

/** A minor nation is one province, named after it and seated on its capital (FR-147, Q23). */
const minorProvince = ({ id, name, capitalTileId, land }: MinorFounding): Province => ({
  id: `province-${id}`,
  name,
  ownerId: id,
  seatTileId: capitalTileId,
  tileIds: Object.keys(land),
});

/** A minor's land tile: no owner (FR-149), its resource discovered at level 1 (FR-145). */
function minorTile(tileId: TileId, letter: MinorLetter): Tile {
  const [x, y] = parseTileIdToArray(tileId);
  const { terrain, resource } = MINOR_LEGEND[letter];
  return {
    id: createTileId(x, y),
    x,
    y,
    terrain,
    resource: resource ? { type: resource, level: 1, discovered: true } : undefined,
    workers: [],
    explored: true,
    visible: true,
  };
}

/** The continent: the map, the 2 Great Powers, the 4 minor nations and the 12 provinces. */
export function continentWorld(): { map: GameMap; nations: Nation[]; minorNations: MinorNation[]; provinces: Province[] } {
  const { map: settled, nations } = startWorld();
  const minorNations: MinorNation[] = MINOR_FOUNDINGS.map(({ id, name, capitalTileId }) => ({ id, name, capitalTileId }));
  const provinces = [...nations.flatMap((n) => greatPowerProvinces(settled, n)), ...MINOR_FOUNDINGS.map(minorProvince)];

  const minorLand = new Map(MINOR_FOUNDINGS.flatMap((m) => Object.entries(m.land)));
  const provinceOfTile = new Map(provinces.flatMap((p) => p.tileIds.map((tileId) => [tileId, p.id] as const)));
  const tiles = settled.tiles.map((row) =>
    row.map((t) => {
      const letter = minorLand.get(t.id);
      const tile = letter ? minorTile(t.id, letter) : t;
      const provinceId = provinceOfTile.get(t.id);
      return provinceId ? { ...tile, provinceId } : tile;
    })
  );
  return { map: { ...settled, tiles }, nations, minorNations, provinces };
}
