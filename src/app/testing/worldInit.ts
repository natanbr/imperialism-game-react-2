import { GameMap, MapStyle } from "@/types/Map";
import { TerrainType, Tile } from "@/types/Tile";
import { Nation } from "@/types/Nation";
import { Worker, WorkerType } from "@/types/Workers";
import { ResourceType } from "@/types/Resource";

export interface WorldInitOptions {
  cols: number;
  rows: number;
}

// Build a static square map (5x4) with one of each terrain type exactly once
export function generateStaticOneNationMap(cols: number, rows: number): GameMap {
  const terrains: TerrainType[] = [
    TerrainType.Capital,
    TerrainType.Farm,
    TerrainType.DryPlains,
    TerrainType.OpenRange,
    TerrainType.HorseRanch,
    TerrainType.Plantation,
    TerrainType.Orchard,
    TerrainType.FertileHills,
    TerrainType.BarrenHills,
    TerrainType.Mountains,
    TerrainType.HardwoodForest,
    TerrainType.ScrubForest,
    TerrainType.Swamp,
    TerrainType.Desert,
    TerrainType.Tundra,
    TerrainType.Water,
    TerrainType.River,
    TerrainType.Town,
    TerrainType.Coast,
    // Add more here only if you also expand cols*rows accordingly
  ];

  const makeTile = (x: number, y: number, terrain: TerrainType): Tile => {
    // Assign a default resource by terrain so development visibly upgrades levels
    let resource: Tile["resource"] = undefined;
    switch (terrain) {
      case TerrainType.Farm: resource = { type: ResourceType.Grain, level: 0 }; break;
      case TerrainType.Plantation: resource = { type: ResourceType.Cotton, level: 0 }; break;
      case TerrainType.Orchard: resource = { type: ResourceType.Fruit, level: 0 }; break;
      case TerrainType.OpenRange: resource = { type: ResourceType.Livestock, level: 0 }; break;
      case TerrainType.FertileHills: resource = { type: ResourceType.Wool, level: 0 }; break;
      case TerrainType.HardwoodForest: resource = { type: ResourceType.Timber, level: 0 }; break;
      case TerrainType.BarrenHills: {
        const options = [ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems];
        const idx = Math.floor(Math.random() * options.length);
        resource = { type: options[idx], level: 0, discovered: false }; // hidden until prospected
        break;
      }
      case TerrainType.Mountains: {
        const options = [ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems];
        const idx = Math.floor(Math.random() * options.length);
        resource = { type: options[idx], level: 0, discovered: false }; // hidden until prospected
        break;
      }
      case TerrainType.Swamp:
      case TerrainType.Desert:
      case TerrainType.Tundra:
        resource = { type: ResourceType.Oil, level: 0, discovered: false }; // hidden until prospected/drilled
        break;
      default:
        resource = undefined;
    }
    return {
      id: `${x}-${y}`,
      x,
      y,
      terrain,
      hasRiver: terrain === TerrainType.River || terrain === TerrainType.Capital,
      resource,
      workers: [],
      explored: true,
      visible: true,
    };
  };

  const tiles: Tile[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const idx = y * cols + x;
      const terrain = terrains[idx];
      return makeTile(x, y, terrain);
    })
  );

  return {
    config: { cols, rows, style: MapStyle.SquareGrid },
    tiles,
  };
}

export function setupSingleNation(map: GameMap): Nation[] {
  const nations: Nation[] = [
    {
      id: "nation-1",
      name: "Testland",
      color: "#FF0000",
      treasury: 1000,
      debt: 0,
      creditLimit: 5000,
      relations: [],
      tradePolicies: [],
      grants: [],
      cities: ["capital-1"],
      provinces: [],
      armies: [],
      fleets: [],
      colonies: [],
      merchantMarine: { holds: 5, avgSpeed: 10 },
      transportCapacity: 10,
      transportCapacityPendingIncrease: 0,
      warehouse: { grain: 50, coal: 100, ironOre: 100 },
      industry: {
        buildings: [],
        workers: { untrained: 0, trained: 0, expert: 0 },
        power: { total: 0, available: 0, electricity: 0 },
      }
    },
  ];

  // Assign ownership: all non-water/river tiles belong to nation-1
  map.tiles = map.tiles.map((row) =>
    row.map((t) => {
      if (t.terrain === TerrainType.Water || t.terrain === TerrainType.River) return t;
      return { ...t, ownerNationId: "nation-1" };
    })
  );

  // Set capital cityId at the tile with terrain Capital
  const capitalTile = map.tiles.flat().find((tt) => tt.terrain === TerrainType.Capital);
  if (capitalTile) {
    const [cx, cy] = capitalTile.id.split("-").map(Number);
    map.tiles[cy][cx] = { ...capitalTile, cityId: "capital-1", ownerNationId: "nation-1" };
  }

  return nations;
}

export function initWorkers(map: GameMap, nations: Nation[]): GameMap {
  const withWorkers = map.tiles.map((row) => row.map((t) => ({ ...t })));

  const addWorkerAtCapital = (nationId: string, capitalCityId: string, type: WorkerType, index: number) => {
    // Find capital tile by cityId
    const tile = withWorkers.flat().find((tt) => tt.cityId === capitalCityId);
    if (!tile) return;
    const worker: Worker = {
      id: `worker-${nationId}-${index}`,
      type,
      nationId,
      assignedTileId: tile.id,
      efficiency: 100,
    };
    const [x, y] = tile.id.split("-").map(Number);
    withWorkers[y][x] = { ...tile, workers: [...tile.workers, worker] };
  };

  // Add one of each worker type at each nation's capital for quick testing
  nations.forEach((n) => {
    const capitalCityId = n.cities?.[0];
    if (!capitalCityId) return;
    let idx = 1;
    addWorkerAtCapital(n.id, capitalCityId, WorkerType.Prospector, idx++);
    addWorkerAtCapital(n.id, capitalCityId, WorkerType.Farmer, idx++);
    addWorkerAtCapital(n.id, capitalCityId, WorkerType.Rancher, idx++);
    addWorkerAtCapital(n.id, capitalCityId, WorkerType.Forester, idx++);
    addWorkerAtCapital(n.id, capitalCityId, WorkerType.Miner, idx++);
    addWorkerAtCapital(n.id, capitalCityId, WorkerType.Driller, idx++);
    addWorkerAtCapital(n.id, capitalCityId, WorkerType.Engineer, idx++);
  });

  return { ...map, tiles: withWorkers };
}

export function initWorld(opts: WorldInitOptions): { map: GameMap; nations: Nation[] } {
  const map = generateStaticOneNationMap(opts.cols, opts.rows);
  const nations = setupSingleNation(map);
  const mapWithWorkers = initWorkers(map, nations);
  return { map: mapWithWorkers, nations };
}