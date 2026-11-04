// The world a new game starts with (FR-080 to FR-082). Test fixtures live in src/app/testing and
// reuse the land and civilian helpers here.
import type { GameMap } from "@/types/Map";
import type { Nation } from "@/types/Nation";
import type { Technology } from "@/types/Technology";
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from "@/types/Resource";
import { TerrainType } from "@/types/Tile";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";
import { FARMING_TERRAINS } from "@/definisions/terrainDefinitions";
import { createIndustry, START_WORKERS } from "../industry/industryState";
import { getNeighborCoords } from "../map/mapHelpers";
import { CAPITAL_SITES, twoIslandsMap } from "./twoIslands";

export { CAPITAL_SITES };

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
 * Technologies every nation holds at the start (FR-059). The first two are the rules' own start
 * technologies (rules 01 section 3, rules 09). [NEEDS CLARIFICATION] decision Q8: the rules sell
 * the other three (rules 04 section 2), but v1 has no technology purchase, so without them rail
 * would stop at the first hill. When a purchase exists, those three leave this list.
 */
export const START_TECHNOLOGIES: readonly Technology[] = [
  {
    id: "highPressureSteamEngine",
    name: "High Pressure Steam Engine",
    approximateArrival: [1814, 1814],
    prerequisites: [],
    benefits: ["rail through farms, plains, deserts, forests and tundra"],
    purchased: true,
    cost: 0,
  },
  {
    id: "seedDrill",
    name: "Seed Drill",
    approximateArrival: [1814, 1814],
    prerequisites: [],
    benefits: ["farmers raise grain farms and orchards to level 1"],
    purchased: true,
    cost: 0,
  },
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

/** "x,y" of every land tile joined to (x, y) by neighbour steps over land: its island. */
function islandAt(map: GameMap, x: number, y: number): Set<string> {
  const island = new Set([`${x},${y}`]);
  const queue: [number, number][] = [[x, y]];
  while (queue.length) {
    const [cx, cy] = queue.shift()!;
    for (const [nx, ny] of getNeighborCoords(map, cx, cy)) {
      if (!isLandTile(map.tiles[ny][nx].terrain) || island.has(`${nx},${ny}`)) continue;
      island.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  return island;
}

/**
 * A nation settles an island (FR-081, FR-082): its capital goes on `site`, the farms, orchards and
 * plantations next to it start at level 1 (rules 02: farms and orchards next to the capital start
 * at level 1; the plantation too, as on the 40x40 map), and it owns every land tile of the island.
 * Returns a new map. M4 settles its second nation with this on `CAPITAL_SITES[1]`.
 */
export function settleIsland(map: GameMap, nationId: string, capitalCityId: string, site: { x: number; y: number }): GameMap {
  const island = islandAt(map, site.x, site.y);
  const nextToCapital = new Set(getNeighborCoords(map, site.x, site.y).map(([x, y]) => `${x},${y}`));
  const tiles = map.tiles.map((row) =>
    row.map((t) => {
      const k = `${t.x},${t.y}`;
      if (!island.has(k)) return t;
      if (t.x === site.x && t.y === site.y) {
        return { ...t, terrain: TerrainType.Capital, resource: undefined, cityId: capitalCityId, ownerNationId: nationId };
      }
      const raise = nextToCapital.has(k) && t.resource && FARMING_TERRAINS.includes(t.terrain);
      const resource = raise ? { ...t.resource!, level: Math.max(t.resource!.level, 1) } : t.resource;
      return { ...t, resource, ownerNationId: nationId };
    })
  );
  return { ...map, tiles };
}

/** The two-island map with the player's nation settled on island 1 and its civilians on the capital. */
export function startWorld(): { map: GameMap; nations: Nation[] } {
  const nations = [createStartNation()];
  const settled = settleIsland(twoIslandsMap(), START_NATION_ID, START_CAPITAL_ID, CAPITAL_SITES[0]);
  return { map: placeStartCivilians(settled, nations), nations };
}
