// Test fixture: a small one-nation world for the system and order tests. The game's own start
// lives in the engine (engine/world/startWorld.ts, FR-043); this file reuses its land and
// civilian helpers and keeps only the test map and the test nation.
import { GameMap, MapStyle } from "@/types/Map";
import { Nation } from "@/types/Nation";
import { ResourceType } from "@/types/Resource";
import { TerrainType, Tile } from "@/types/Tile";
import { createTileId } from "@/utils/tileIdUtils";
import { createIndustry } from "@/engine/industry/industryState";
import { claimLand, placeStartCivilians, START_CAPITAL_ID, START_NATION_ID } from "@/engine/world/startWorld";

export interface WorldInitOptions {
  cols: number;
  rows: number;
}

// Build a static square map (5x5) for testing
export function generateStaticOneNationMap(cols: number, rows: number): GameMap {
  const terrains: TerrainType[] = [
    TerrainType.Capital, TerrainType.Farm, TerrainType.DryPlains, TerrainType.OpenRange, TerrainType.HorseRanch,
    TerrainType.Plantation, TerrainType.Orchard, TerrainType.FertileHills, TerrainType.BarrenHills, TerrainType.Mountains,
    TerrainType.HardwoodForest, TerrainType.ScrubForest, TerrainType.Swamp, TerrainType.Desert, TerrainType.Tundra,
    TerrainType.Water, TerrainType.River, TerrainType.Town, TerrainType.Coast, TerrainType.BarrenHills,
    TerrainType.Mountains, TerrainType.Water, TerrainType.Farm, TerrainType.OpenRange, TerrainType.HardwoodForest,
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
        const resourceType = options[(x + y) % options.length];
        resource = { type: resourceType, level: 0, discovered: false }; // hidden until prospected
        break;
      }
      case TerrainType.Mountains: {
        const options = [ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems];
        const resourceType = options[(x + y + 1) % options.length];
        resource = { type: resourceType, level: 0, discovered: false }; // hidden until prospected
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
      id: createTileId(x, y),
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

/** The test nation: $10,000, 10 freight cars, grain, coal and iron in the warehouse, 4/2/1 workers. */
export function testNation(): Nation {
  return {
    id: START_NATION_ID,
    name: "Testland",
    color: "#FF0000",
    treasury: 10000,
    debt: 0,
    creditLimit: 5000,
    relations: [],
    tradePolicies: [],
    grants: [],
    cities: [START_CAPITAL_ID],
    provinces: [],
    armies: [],
    fleets: [],
    colonies: [],
    merchantMarine: { holds: 5, avgSpeed: 10 },
    transportCapacity: 10,
    transportCapacityPendingIncrease: 0,
    warehouse: { grain: 50, coal: 100, ironOre: 100 } as Record<string, number>,
    industry: createIndustry(),
  };
}

/** The generated `cols` x `rows` test map, owned by the test nation, its civilians on the capital. */
export function initWorld(opts: WorldInitOptions): { map: GameMap; nations: Nation[] } {
  const nations = [testNation()];
  const owned = claimLand(generateStaticOneNationMap(opts.cols, opts.rows), START_NATION_ID, START_CAPITAL_ID);
  return { map: placeStartCivilians(owned, nations), nations };
}
