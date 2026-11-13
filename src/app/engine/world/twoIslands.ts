// The map every new game starts on (FR-080, NR-007): two islands in a sea. Island 2 is island 1
// shifted HALF_WIDTH columns east, so a second nation settled there (M4) starts as the player does.
// A shift along a row keeps the hex neighbours (odd rows are offset), a shift across rows would not.
import { MapStyle, type GameMap } from "@/types/Map";
import { ResourceType } from "@/types/Resource";
import { TerrainType, type Resource, type Tile } from "@/types/Tile";
import { createTileId } from "@/utils/tileIdUtils";

/**
 * One island's half of the map, one character per tile; odd rows are drawn half a tile right.
 *   ~ sea              F farm (grain)          O orchard (fruit)       R open range (livestock)
 *   P plantation       T hardwood forest       c barren hills, coal    i barren hills, iron ore
 *   @ the capital site: a farm until a nation settles it (startWorld.ts `settleIsland`)
 * No coast tiles (decision Q16): the shore is the land next to the sea, and ports go there.
 */
const HALF: readonly string[] = [
  "~~~~~~~~~~~~",
  "~~~TTTTT~~~~",
  "~~~RTciTT~~~",
  "~~RRTicTiT~~",
  "~~RRRciRcT~~",
  "~~FRRRcRRT~~",
  "~~FFRRRRRT~~",
  "~~FOFRRORRT~",
  "~~FOFFOFRRT~",
  "~~@FOFFORRT~",
  "~~OPFOFFPPT~",
  "~~FOPFOFPPP~",
  "~~~FOPFPPT~~",
  "~~~~TTTTT~~~",
  "~~~~~~~~~~~~",
  "~~~~~~~~~~~~",
];

/** Columns of one island's half; island 2 starts at this column (the continent's provinces use it, FR-147). */
export const HALF_WIDTH = HALF[0].length;
const COLS = 2 * HALF_WIDTH;
const ROWS = HALF.length;

const hidden = (type: ResourceType): Resource => ({ type, level: 0, discovered: false });
const visible = (type: ResourceType): Resource => ({ type, level: 0 });

const LEGEND: Record<string, { terrain: TerrainType; resource?: () => Resource }> = {
  "~": { terrain: TerrainType.Water },
  F: { terrain: TerrainType.Farm, resource: () => visible(ResourceType.Grain) },
  "@": { terrain: TerrainType.Farm, resource: () => visible(ResourceType.Grain) },
  O: { terrain: TerrainType.Orchard, resource: () => visible(ResourceType.Fruit) },
  R: { terrain: TerrainType.OpenRange, resource: () => visible(ResourceType.Livestock) },
  P: { terrain: TerrainType.Plantation, resource: () => visible(ResourceType.Cotton) },
  T: { terrain: TerrainType.HardwoodForest, resource: () => visible(ResourceType.Timber) },
  c: { terrain: TerrainType.BarrenHills, resource: () => hidden(ResourceType.Coal) },
  i: { terrain: TerrainType.BarrenHills, resource: () => hidden(ResourceType.IronOre) },
};

const charAt = (x: number, y: number): string => HALF[y][x % HALF_WIDTH];

/** Where the capitals go, one per island: [0] the player's, [1] the second nation's (M4). */
export const CAPITAL_SITES: readonly { x: number; y: number }[] = (() => {
  const y = HALF.findIndex((row) => row.includes("@"));
  const x = HALF[y].indexOf("@");
  return [{ x, y }, { x: x + HALF_WIDTH, y }];
})();

function tileAt(x: number, y: number): Tile {
  const { terrain, resource } = LEGEND[charAt(x, y)];
  return {
    id: createTileId(x, y),
    x,
    y,
    terrain,
    resource: resource?.(),
    workers: [],
    explored: true,
    visible: true,
  };
}

/** The 24x16 two-island map with nobody on it: no owner, city or worker anywhere. */
export function twoIslandsMap(): GameMap {
  return {
    config: { cols: COLS, rows: ROWS, style: MapStyle.SquareGrid },
    tiles: Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => tileAt(x, y))),
  };
}
