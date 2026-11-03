import { Nation } from "@/types/Nation";
import { GameMap, MapStyle } from "@/types/Map";
import { GameState } from "@/types/GameState";
import { TerrainType, Tile } from "@/types/Tile";
import { GoodsType, MaterialType, ResourceType } from "@/types/Resource";
import { Worker, WorkerStatus, WorkerType } from "@/types/Workers";
import { createTileId } from "@/utils/tileIdUtils";
import { initializeRailroadNetworks } from "@/engine/systems/railroadSystem";

const cols = 5;
const rows = 5;

// Mock nations with different colors and names
export const mockNations: Nation[] = [
  {
    id: "nation-1",
    name: "Britannia",
    color: "#FF0000", // Red
    treasury: 1000,
    debt: 0,
    creditLimit: 5000,
    relations: [],
    tradePolicies: [],
    grants: [],
    cities: ["capital-1"],
    provinces: ["province-1", "province-2"],
    armies: [],
    fleets: [],
    colonies: [],
    merchantMarine: {
      holds: 5,
      avgSpeed: 10
    },
    warehouse: {
      grain: 100,
      timber: 50
    } as Record<string, number>,
    transportCapacity: 10,
    industry: {
      buildings: [],
      workers: { untrained: 0, trained: 0, expert: 0 },
      power: { total: 0, available: 0, electricity: 0 }
    }
  },
  {
    id: "nation-2",
    name: "Germania",
    color: "#0000FF", // Blue
    treasury: 800,
    debt: 0,
    creditLimit: 4000,
    relations: [],
    tradePolicies: [],
    grants: [],
    cities: [],
    provinces: ["province-3"],
    armies: [],
    fleets: [],
    colonies: [],
    merchantMarine: {
      holds: 3,
      avgSpeed: 8
    },
    warehouse: {
      grain: 80,
      coal: 30
    } as Record<string, number>,
    transportCapacity: 8,
    industry: {
      buildings: [],
      workers: { untrained: 0, trained: 0, expert: 0 },
      power: { total: 0, available: 0, electricity: 0 }
    }
  },
  {
    id: "nation-3",
    name: "Francia",
    color: "#00FF00", // Green
    treasury: 900,
    debt: 0,
    creditLimit: 4500,
    relations: [],
    tradePolicies: [],
    grants: [],
    cities: [],
    provinces: ["province-4"],
    armies: [],
    fleets: [],
    colonies: [],
    merchantMarine: {
      holds: 4,
      avgSpeed: 9
    },
    warehouse: {
      grain: 90,
      wool: 40
    } as Record<string, number>,
    transportCapacity: 9,
    industry: {
      buildings: [],
      workers: { untrained: 0, trained: 0, expert: 0 },
      power: { total: 0, available: 0, electricity: 0 }
    }
  }
];

// 5x5 mock map with single capital and territories owned by different nations
export const mockMap5x5: GameMap = {
  config: { cols, rows, style: MapStyle.SquareGrid },
  tiles: Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      let terrain: TerrainType;
      let ownerNationId: string | undefined;
      
      // Place single capital at center (2,2)
      if (x === 2 && y === 2) {
        terrain = TerrainType.Capital;
        ownerNationId = "nation-1";
      }
      // Assign territories to different nations
      else if (x <= 1 && y <= 1) {
        terrain = TerrainType.DryPlains;
        ownerNationId = "nation-1"; // Britannia (Red) - top-left
      }
      else if (x >= 3 && y <= 1) {
        terrain = TerrainType.HardwoodForest;
        ownerNationId = "nation-2"; // Germania (Blue) - top-right
      }
      else if (x <= 1 && y >= 3) {
        terrain = TerrainType.Mountains;
        ownerNationId = "nation-3"; // Francia (Green) - bottom-left
      }
      else if (x >= 3 && y >= 3) {
        terrain = TerrainType.Desert;
        ownerNationId = "nation-1"; // Britannia (Red) - bottom-right
      }
      else {
        // Neutral/unowned territories
        terrain = TerrainType.OpenRange;
        ownerNationId = undefined;
      }

      const isCapital = x === 2 && y === 2;

      return {
        id: createTileId(x, y),
        x,
        y,
        terrain,
        hasRiver: false,
        resource: terrain === TerrainType.DryPlains
          ? { type: ResourceType.Grain, level: 1 }
          : terrain === TerrainType.HardwoodForest
          ? { type: ResourceType.Timber, level: 1 }
          : terrain === TerrainType.Mountains
          ? { type: ResourceType.IronOre, level: 1, discovered: true }
          : undefined,
        ownerNationId,
        cityId: isCapital ? "capital-1" : undefined,
        workers: isCapital
          ? [{ id: "worker-1", type: WorkerType.Prospector, nationId: ownerNationId || "nation-1", assignedTileId: createTileId(x, y), efficiency: 100 }]
          : [],
        explored: true,
        visible: true,
      } as Tile;
    })
  ),
};

// ---------------------------------------------------------------------------
// Two-nation headless fixture (M1). Nations 1 and 2 above on an 8x6 map: nation-1 owns
// columns 0-3, nation-2 owns columns 4-7 (mirrored), row 5 is open water. Each capital starts
// with one worker of every field type.
// ---------------------------------------------------------------------------

export const TWO_NATION_IDS = ["nation-1", "nation-2"] as const;

const TWO_NATION_COLS = 8;
const TWO_NATION_ROWS = 6;

// Terrain by (local column, row); nation-2 mirrors the columns (local = 7 - x).
const HALF_MAP: TerrainType[][] = [
  [TerrainType.Farm, TerrainType.OpenRange, TerrainType.HardwoodForest, TerrainType.Plantation],
  [TerrainType.Mountains, TerrainType.Capital, TerrainType.Farm, TerrainType.Orchard],
  [TerrainType.BarrenHills, TerrainType.FertileHills, TerrainType.DryPlains, TerrainType.Town],
  [TerrainType.Desert, TerrainType.Swamp, TerrainType.Mountains, TerrainType.HardwoodForest],
  [TerrainType.Tundra, TerrainType.Farm, TerrainType.BarrenHills, TerrainType.OpenRange],
];

const FIELD_WORKERS = [
  WorkerType.Prospector,
  WorkerType.Farmer,
  WorkerType.Rancher,
  WorkerType.Forester,
  WorkerType.Miner,
  WorkerType.Driller,
  WorkerType.Engineer,
];

// `x` is the nation's local column, so both halves hold the same deposits; the mountain next
// to each capital hides gold, which gives the scripted players an income.
function fixtureResource(terrain: TerrainType, x: number, y: number): Tile["resource"] {
  const minerals = [ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems];
  switch (terrain) {
    case TerrainType.Farm: return { type: ResourceType.Grain, level: 0 };
    case TerrainType.DryPlains: return { type: ResourceType.Grain, level: 1 };
    case TerrainType.Plantation: return { type: ResourceType.Cotton, level: 0 };
    case TerrainType.Orchard: return { type: ResourceType.Fruit, level: 0 };
    case TerrainType.OpenRange: return { type: ResourceType.Livestock, level: 0 };
    case TerrainType.FertileHills: return { type: ResourceType.Wool, level: 0 };
    case TerrainType.HardwoodForest: return { type: ResourceType.Timber, level: 0 };
    case TerrainType.Mountains:
    case TerrainType.BarrenHills:
      return { type: minerals[(x + y + 1) % minerals.length], level: 0, discovered: false };
    case TerrainType.Desert:
    case TerrainType.Swamp:
    case TerrainType.Tundra:
      return { type: ResourceType.Oil, level: 0, discovered: false };
    default: return undefined;
  }
}

function emptyWarehouse(): Record<string, number> {
  const warehouse: Record<string, number> = {};
  for (const key of [...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType)]) {
    warehouse[key] = 0;
  }
  return warehouse;
}

/** A fresh two-nation game at turn 1; every call returns new objects. */
export function createTwoNationGame(seed = 1): GameState {
  const nations: Nation[] = TWO_NATION_IDS.map((id, i) => {
    const mock = mockNations.find(n => n.id === id)!;
    return {
      ...structuredClone(mock),
      cities: [`capital-${i + 1}`],
      warehouse: { ...emptyWarehouse(), ...mock.warehouse },
      transportCapacityPendingIncrease: 0,
    };
  });

  const tiles: Tile[][] = Array.from({ length: TWO_NATION_ROWS }, (_, y) =>
    Array.from({ length: TWO_NATION_COLS }, (_, x): Tile => {
      const id = createTileId(x, y);
      if (y >= HALF_MAP.length) {
        return { id, x, y, terrain: TerrainType.Water, workers: [], explored: true, visible: true };
      }
      const nationIndex = x < TWO_NATION_COLS / 2 ? 0 : 1;
      const local = nationIndex === 0 ? x : TWO_NATION_COLS - 1 - x;
      const terrain = HALF_MAP[y][local];
      const nationId = TWO_NATION_IDS[nationIndex];
      const isCapital = terrain === TerrainType.Capital;
      const workers: Worker[] = isCapital
        ? FIELD_WORKERS.map(type => ({
            id: `${nationId}-${type}`,
            type,
            nationId,
            assignedTileId: id,
            efficiency: 100,
            status: WorkerStatus.Available,
            justMoved: false,
          }))
        : [];
      return {
        id, x, y, terrain,
        hasRiver: isCapital,
        resource: fixtureResource(terrain, local, y),
        ownerNationId: nationId,
        cityId: isCapital ? `capital-${nationIndex + 1}` : undefined,
        workers,
        explored: true,
        visible: true,
      };
    })
  );

  const map: GameMap = { config: { cols: TWO_NATION_COLS, rows: TWO_NATION_ROWS, style: MapStyle.SquareGrid }, tiles };

  return {
    turn: 1,
    year: 1900,
    seed,
    activeNationId: TWO_NATION_IDS[0],
    nations,
    cities: [],
    armies: [],
    fleets: [],
    relations: [],
    treaties: [],
    tradePolicies: [],
    grants: [],
    map,
    transportNetwork: { shippingLanes: [], capacity: 0, railroadNetworks: initializeRailroadNetworks(map, nations) },
    tradeRoutes: [],
    technologyState: { technologies: [], oilDrillingTechUnlocked: false },
    newsLog: [],
    turnOrder: { phases: ["diplomacy", "trade", "production", "combat", "interceptions", "logistics"] },
    difficulty: "normal",
  };
}