import { Nation } from "@/types/Nation";
import { GameMap, MapStyle } from "@/types/Map";
import { TerrainType, Tile } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { WorkerType } from "@/types/Workers";
import { createTileId } from "@/utils/tileIdUtils";

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
    } as any,
    transportCapacity: 10,
    industry: {} as any
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
    } as any,
    transportCapacity: 8,
    industry: {} as any
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
    } as any,
    transportCapacity: 9,
    industry: {} as any
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