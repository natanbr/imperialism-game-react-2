<<<<<<< HEAD
import { Nation } from '../types/Nation';
import { NationId } from '../types/Common';
=======
<<<<<<< HEAD
import { Nation } from '../types/Nation';
import { NationId } from '../types/Common';
=======
<<<<<<< HEAD
import { Nation } from '../types/Nation';
import { NationId } from '../types/Common';

export const mockNation: Nation = {
  id: 'red-empire' as NationId,
  name: 'Red Empire',
  treasury: 10000,
  relations: [],
  tradePolicies: [],
  grants: [],
  cities: [],
  provinces: [],
  armies: [],
  fleets: [],
  colonies: [],
  merchantMarine: {
    holds: 10,
    avgSpeed: 10,
  },
  warehouse: {},
};
=======
import { Nation } from "@/types/Nation";
import { GameMap, MapStyle } from "@/types/Map";
import { TerrainType, Tile } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { WorkerType } from "@/types/Workers";
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)

export const mockNation: Nation = {
  id: 'red-empire' as NationId,
  name: 'Red Empire',
  treasury: 10000,
  relations: [],
  tradePolicies: [],
  grants: [],
  cities: [],
  provinces: [],
  armies: [],
  fleets: [],
  colonies: [],
  merchantMarine: {
    holds: 10,
    avgSpeed: 10,
  },
<<<<<<< HEAD
  warehouse: {},
};
=======
<<<<<<< HEAD
  warehouse: {},
};
=======
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
        id: `${x}-${y}`,
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
          ? [{ id: "worker-1", type: WorkerType.Prospector, nationId: ownerNationId || "nation-1", assignedTileId: `${x}-${y}`, efficiency: 100 }]
          : [],
        explored: true,
        visible: true,
      } as Tile;
    })
  ),
};
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
