// The world a new game starts with (FR-043). Test fixtures live in src/app/testing and reuse the
// land and civilian helpers here.
import type { GameMap } from "@/types/Map";
import type { Nation } from "@/types/Nation";
import type { Technology } from "@/types/Technology";
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from "@/types/Resource";
import { TerrainType } from "@/types/Tile";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";
import { createIndustry, START_WORKERS } from "../industry/industryState";
import { defaultMap } from "./defaultMap";

export const START_NATION_ID = "nation-1";
export const START_CAPITAL_ID = "capital-1";

/** Rules 01 section 3: $10,000 and about 15 freight cars on Normal. */
export const START_TREASURY = 10000;
export const START_FREIGHT_CARS = 15;

/** [NEEDS CLARIFICATION] gaps.md A6: the start warehouse is not documented ("limited stock"). */
const START_STOCK: Partial<Record<WarehouseCommodities, number>> = {
  [ResourceType.Grain]: 20,
  [ResourceType.Fruit]: 10,
  [ResourceType.Livestock]: 10,
  [ResourceType.Timber]: 10,
  [ResourceType.Cotton]: 10,
  [ResourceType.Wool]: 10,
  [ResourceType.Coal]: 10,
  [ResourceType.IronOre]: 10,
  [MaterialType.Lumber]: 10,
  [MaterialType.Steel]: 10,
  [MaterialType.CannedFood]: 10,
};

/**
 * Technologies every nation holds at the start (FR-051). [NEEDS CLARIFICATION] decision Q8: the
 * rules sell these (rules 04 section 2), but v1 has no technology purchase, so without them rail
 * would stop at the first hill. When a purchase exists, this list becomes empty.
 */
export const START_TECHNOLOGIES: readonly Technology[] = [
  {
    id: "compoundSteamEngine",
    name: "Compound Steam Engine",
    approximateArrival: [1815, 1815],
    prerequisites: [],
    benefits: ["rail and depots on hills"],
    purchased: true,
    cost: 0,
  },
  {
    id: "ironRailroadBridge",
    name: "Iron Railroad Bridge",
    approximateArrival: [1815, 1815],
    prerequisites: [],
    benefits: ["rail on swamp"],
    purchased: true,
    cost: 0,
  },
  {
    id: "dynamite",
    name: "Dynamite",
    approximateArrival: [1815, 1815],
    prerequisites: [],
    benefits: ["rail on mountains"],
    purchased: true,
    cost: 0,
  },
];

/** Every warehouse commodity at 0, then the given amounts. */
export function warehouseWith(stock: Partial<Record<WarehouseCommodities, number>> = {}): Record<WarehouseCommodities, number> {
  const warehouse = {} as Record<WarehouseCommodities, number>;
  for (const key of [...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType)]) {
    warehouse[key] = stock[key] ?? 0;
  }
  return warehouse;
}

/** The player's nation at the start of a game (rules 01 section 3 and 05 section 4). */
export function createStartNation(): Nation {
  return {
    id: START_NATION_ID,
    name: "Testland",
    color: "#FF0000",
    treasury: START_TREASURY,
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
    merchantMarine: { holds: 4, avgSpeed: 10 },
    transportCapacity: START_FREIGHT_CARS,
    transportCapacityPendingIncrease: 0,
    warehouse: warehouseWith(START_STOCK),
    industry: createIndustry(START_WORKERS),
  };
}

const isLandTile = (terrain: TerrainType) => terrain !== TerrainType.Water && terrain !== TerrainType.River;

/** Gives every land tile to the nation and names its capital tile; returns a new map. */
export function claimLand(map: GameMap, nationId: string, capitalCityId: string): GameMap {
  const tiles = map.tiles.map((row) =>
    row.map((t) => {
      if (!isLandTile(t.terrain)) return t;
      const capital = t.terrain === TerrainType.Capital ? { cityId: capitalCityId } : {};
      return { ...t, ...capital, ownerNationId: nationId };
    })
  );
  return { ...map, tiles };
}

/** One civilian of each field type, the ones a nation starts with. */
export const START_CIVILIANS: readonly WorkerType[] = [
  WorkerType.Prospector,
  WorkerType.Farmer,
  WorkerType.Rancher,
  WorkerType.Forester,
  WorkerType.Miner,
  WorkerType.Driller,
  WorkerType.Engineer,
];

/** Puts the start civilians of every nation on its capital (the tile with its first city id). */
export function placeStartCivilians(map: GameMap, nations: readonly Nation[]): GameMap {
  let tiles = map.tiles;
  for (const nation of nations) {
    const capitalCityId = nation.cities[0];
    if (!capitalCityId) continue;
    const civilians: Worker[] = START_CIVILIANS.map((type, i) => ({
      id: `worker-${nation.id}-${i + 1}`,
      type,
      nationId: nation.id,
      assignedTileId: "",
      efficiency: 100,
      status: WorkerStatus.Available,
      justMoved: false,
    }));
    tiles = tiles.map((row) =>
      row.map((t) =>
        t.cityId === capitalCityId
          ? { ...t, workers: [...t.workers, ...civilians.map((w) => ({ ...w, assignedTileId: t.id }))] }
          : t
      )
    );
  }
  return { ...map, tiles };
}

/** The default 40x40 map with one nation owning the land and its civilians on the capital. */
export function startWorld(): { map: GameMap; nations: Nation[] } {
  const nations = [createStartNation()];
  const owned = claimLand(defaultMap, START_NATION_ID, START_CAPITAL_ID);
  return { map: placeStartCivilians(owned, nations), nations };
}
