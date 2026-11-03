import { GameMap, MapStyle } from "@/types/Map";
import { ResourceType } from "@/types/Resource";
import { TerrainType, Tile } from "@/types/Tile";
import { createTileId } from "@/utils/tileIdUtils";

const cols = 40;
const rows = 40;

/**
 * defaultMap - the 40x40 map every new game uses until a map generator exists (was testing/testMap1)
 *
 * Features:
 * - Ocean border (1 tile thick)
 * - Capital in center (20, 20) with 6 surrounding resource tiles (level 1)
 * - Second city 4 tiles east from capital
 * - Mountain range (linear, 1-3 tiles thick, surrounded by hills)
 * - River from ocean to capital (straight path from north)
 * - Forest clusters (~6 tiles each)
 * - Mixed agricultural and terrain tiles
 */

// Define special tile positions
const CAPITAL_X = 20;
const CAPITAL_Y = 20;
const CITY_X = 24; // 4 tiles east of capital
const CITY_Y = 20;

// Define ocean border (1 tile thick)
const isOceanBorder = (x: number, y: number): boolean => {
  return x === 0 || x === cols - 1 || y === 0 || y === rows - 1;
};

// Define river path (straight from north ocean to capital)
const isRiver = (x: number, y: number): boolean => {
  return x === CAPITAL_X && y < CAPITAL_Y;
};

// Define mountain range (vertical range on west side, 10-25 tiles from top)
const mountainRangePositions = new Set<string>();
const hillPositions = new Set<string>();

// Create a vertical mountain range on the western side
for (let y = 10; y <= 25; y++) {
  // Core mountains (2-3 tiles thick)
  mountainRangePositions.add(`${8},${y}`);
  mountainRangePositions.add(`${9},${y}`);
  if (y >= 12 && y <= 23) {
    mountainRangePositions.add(`${10},${y}`);
  }

  // Surrounding hills
  hillPositions.add(`${7},${y}`);
  hillPositions.add(`${11},${y}`);
  if (y >= 12 && y <= 23) {
    hillPositions.add(`${12},${y}`);
  }
  // Hills at edges
  if (y === 10 || y === 25) {
    hillPositions.add(`${8},${y - 1}`);
    hillPositions.add(`${9},${y - 1}`);
    hillPositions.add(`${8},${y + 1}`);
    hillPositions.add(`${9},${y + 1}`);
  }
}

// Define forest clusters
const forestClusters = [
  // Cluster 1: Northwest
  [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
  // Cluster 2: Northeast
  [{ x: 32, y: 6 }, { x: 33, y: 6 }, { x: 34, y: 6 }, { x: 32, y: 7 }, { x: 33, y: 7 }, { x: 34, y: 7 }],
  // Cluster 3: Southeast
  [{ x: 30, y: 32 }, { x: 31, y: 32 }, { x: 32, y: 32 }, { x: 30, y: 33 }, { x: 31, y: 33 }, { x: 32, y: 33 }],
  // Cluster 4: Southwest
  [{ x: 5, y: 30 }, { x: 6, y: 30 }, { x: 7, y: 30 }, { x: 5, y: 31 }, { x: 6, y: 31 }, { x: 7, y: 31 }],
];

const forestPositions = new Set<string>();
forestClusters.forEach(cluster => {
  cluster.forEach(pos => {
    forestPositions.add(`${pos.x},${pos.y}`);
  });
});

// Define tiles around capital (resources at level 1). The capital's row is even, so its neighbours
// are (x-1, y-1), (x, y-1), (x-1, y), (x+1, y), (x-1, y+1), (x, y+1); (x, y-1) is the river.
// Two orchards next to the capital ship the fruit its seven workers eat (FR-052).
const capitalSurroundingTiles: { x: number; y: number; terrain: TerrainType; resource: ResourceType }[] = [
  { x: CAPITAL_X - 1, y: CAPITAL_Y, terrain: TerrainType.Farm, resource: ResourceType.Grain },
  { x: CAPITAL_X + 1, y: CAPITAL_Y, terrain: TerrainType.Farm, resource: ResourceType.Grain },
  { x: CAPITAL_X - 1, y: CAPITAL_Y + 1, terrain: TerrainType.Orchard, resource: ResourceType.Fruit },
  { x: CAPITAL_X, y: CAPITAL_Y + 1, terrain: TerrainType.Orchard, resource: ResourceType.Fruit },
  { x: CAPITAL_X - 1, y: CAPITAL_Y - 1, terrain: TerrainType.Plantation, resource: ResourceType.Cotton },
  { x: CAPITAL_X + 1, y: CAPITAL_Y - 1, terrain: TerrainType.BarrenHills, resource: ResourceType.IronOre },
];

const capitalSurroundingMap = new Map<string, { terrain: TerrainType; resource: ResourceType }>();
capitalSurroundingTiles.forEach(tile => {
  capitalSurroundingMap.set(`${tile.x},${tile.y}`, { terrain: tile.terrain, resource: tile.resource });
});

// Define tiles around second city
const citySurroundingTiles: { x: number; y: number; terrain: TerrainType; resource: ResourceType }[] = [
  { x: CITY_X - 1, y: CITY_Y, terrain: TerrainType.Orchard, resource: ResourceType.Fruit },
  { x: CITY_X + 1, y: CITY_Y, terrain: TerrainType.Farm, resource: ResourceType.Grain },
  { x: CITY_X, y: CITY_Y - 1, terrain: TerrainType.OpenRange, resource: ResourceType.Livestock },
  { x: CITY_X, y: CITY_Y + 1, terrain: TerrainType.Plantation, resource: ResourceType.Cotton },
  { x: CITY_X - 1, y: CITY_Y + 1, terrain: TerrainType.FertileHills, resource: ResourceType.Wool },
  { x: CITY_X + 1, y: CITY_Y + 1, terrain: TerrainType.HardwoodForest, resource: ResourceType.Timber },
];

const citySurroundingMap = new Map<string, { terrain: TerrainType; resource: ResourceType }>();
citySurroundingTiles.forEach(tile => {
  citySurroundingMap.set(`${tile.x},${tile.y}`, { terrain: tile.terrain, resource: tile.resource });
});

// Helper to determine terrain and resource for a given tile
const getTileData = (x: number, y: number): { terrain: TerrainType; resource?: { type: ResourceType; level: number; discovered?: boolean } } => {
  const key = `${x},${y}`;

  // Ocean border
  if (isOceanBorder(x, y)) {
    return { terrain: TerrainType.Water };
  }

  // Capital
  if (x === CAPITAL_X && y === CAPITAL_Y) {
    return { terrain: TerrainType.Capital };
  }

  // Second city
  if (x === CITY_X && y === CITY_Y) {
    return { terrain: TerrainType.Town };
  }

  // River
  if (isRiver(x, y)) {
    return { terrain: TerrainType.River };
  }

  // Capital surrounding tiles (level 1 resources)
  if (capitalSurroundingMap.has(key)) {
    const data = capitalSurroundingMap.get(key)!;
    return {
      terrain: data.terrain,
      resource: { type: data.resource, level: 1 }
    };
  }

  // City surrounding tiles (level 0 resources - not yet developed)
  if (citySurroundingMap.has(key)) {
    const data = citySurroundingMap.get(key)!;
    return {
      terrain: data.terrain,
      resource: { type: data.resource, level: 0 }
    };
  }

  // Mountains
  if (mountainRangePositions.has(key)) {
    return {
      terrain: TerrainType.Mountains,
      resource: { type: ResourceType.IronOre, level: 0, discovered: false }
    };
  }

  // Hills around mountains
  if (hillPositions.has(key)) {
    return {
      terrain: TerrainType.BarrenHills,
      resource: { type: ResourceType.IronOre, level: 0, discovered: false }
    };
  }

  // Forest clusters
  if (forestPositions.has(key)) {
    return {
      terrain: TerrainType.HardwoodForest,
      resource: { type: ResourceType.Timber, level: 0 }
    };
  }

  // Fill remaining tiles with varied terrain
  // Use deterministic pattern based on position
  const pattern = (x * 7 + y * 13) % 12;

  switch (pattern) {
    case 0:
    case 1:
      return {
        terrain: TerrainType.Farm,
        resource: { type: ResourceType.Grain, level: 0 }
      };
    case 2:
      return {
        terrain: TerrainType.Orchard,
        resource: { type: ResourceType.Fruit, level: 0 }
      };
    case 3:
      return {
        terrain: TerrainType.OpenRange,
        resource: { type: ResourceType.Livestock, level: 0 }
      };
    case 4:
      return {
        terrain: TerrainType.Plantation,
        resource: { type: ResourceType.Cotton, level: 0 }
      };
    case 5:
      return {
        terrain: TerrainType.FertileHills,
        resource: { type: ResourceType.Wool, level: 0 }
      };
    case 6:
      return {
        terrain: TerrainType.DryPlains,
        resource: { type: ResourceType.Grain, level: 0 }
      };
    case 7:
      return {
        terrain: TerrainType.ScrubForest,
        resource: { type: ResourceType.Timber, level: 0 }
      };
    case 8:
      return {
        terrain: TerrainType.Swamp,
        resource: { type: ResourceType.Oil, level: 0, discovered: false }
      };
    case 9:
      return {
        terrain: TerrainType.Desert,
        resource: { type: ResourceType.Oil, level: 0, discovered: false }
      };
    case 10:
      return {
        terrain: TerrainType.Coast
      };
    default:
      return {
        terrain: TerrainType.DryPlains,
        resource: { type: ResourceType.Grain, level: 0 }
      };
  }
};

export const defaultMap: GameMap = {
  config: { cols, rows, style: MapStyle.SquareGrid },
  tiles: Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const tileData = getTileData(x, y);

      return {
        id: createTileId(x, y),
        x,
        y,
        terrain: tileData.terrain,
        hasRiver: tileData.terrain === TerrainType.River,
        resource: tileData.resource,
        workers: [],
        explored: true,
        visible: true,
        ownerNationId: (tileData.terrain === TerrainType.Capital || tileData.terrain === TerrainType.Town) ? "nation-1" : undefined,
        cityId: tileData.terrain === TerrainType.Capital ? "capital-1" : tileData.terrain === TerrainType.Town ? "city-1" : undefined,
      } as Tile;
    })
  ),
};
