// Display text for engine data: worker jobs, refused orders and turn events (FR-024).
import { seasonOf, type FoodForecast, type GameEvent, type Order, type OrderKind, type RejectReason, type Season } from "@/engine";
import { TerrainType, type Tile } from "@/types/Tile";
import type { BuildingType } from "@/types/Industry";
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from "@/types/Resource";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";

const ORDER_TEXT: Record<OrderKind, string> = {
  moveWorker: "Move",
  moveAndBuildRail: "Build rail",
  startProspecting: "Prospect",
  startDevelopment: "Develop",
  startConstruction: "Build",
  moveAndStartProspecting: "Move and prospect",
  moveAndStartDevelopment: "Move and develop",
  moveAndStartConstruction: "Move and build",
  cancelWorkerAction: "Cancel",
  setTransportAllocations: "Transport plan",
  changeTransportCapacity: "Freight cars",
  setProduction: "Production",
  expandBuilding: "Expansion",
  trainWorkers: "Training",
  recruitWorkers: "Migration",
  sellCommodity: "Sale",
  buyCommodity: "Purchase",
};

export const REFUSAL_TEXT: Record<RejectReason, string> = {
  "unknown-nation": "unknown nation",
  "unknown-worker": "that worker no longer exists",
  "not-owner": "that is not yours",
  "wrong-worker-type": "this worker cannot do that job",
  "worker-busy": "the worker is busy with a job",
  "worker-moved": "the worker already moved this turn",
  "invalid-target": "not possible on that tile",
  "tile-has-job": "another civilian is already working that tile",
  "invalid-site": "that tile is not a valid site",
  "insufficient-funds": "not enough money",
  "insufficient-resources": "not enough goods in the warehouse",
  "insufficient-labour": "not enough free labour",
  "limit-reached": "over the limit",
  "invalid-amount": "invalid amount",
  "game-over": "the game is over",
};

export function refusalText({ order, reason }: { order: Order; reason: RejectReason }): string {
  return `${ORDER_TEXT[order.kind]} refused: ${REFUSAL_TEXT[reason]}.`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Dollars with thousands separators: "$1,800". */
export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export const BUILDING_TEXT: Record<BuildingType, string> = {
  textileMill: "Textile mill",
  clothingFactory: "Clothing factory",
  lumberMill: "Lumber mill",
  furnitureFactory: "Furniture factory",
  steelMill: "Steel mill",
  metalWorks: "Metal works",
  refinery: "Refinery",
  foodProcessing: "Food processing",
};

/** Display names of the warehouse commodities (FR-050). */
export const COMMODITY_TEXT: Record<WarehouseCommodities, string> = {
  [ResourceType.Grain]: "Grain",
  [ResourceType.Livestock]: "Livestock",
  [ResourceType.Fruit]: "Fruit",
  [ResourceType.Fish]: "Fish",
  [ResourceType.Cotton]: "Cotton",
  [ResourceType.Wool]: "Wool",
  [ResourceType.Horses]: "Horses",
  [ResourceType.Timber]: "Timber",
  [ResourceType.Coal]: "Coal",
  [ResourceType.IronOre]: "Iron Ore",
  [ResourceType.Oil]: "Oil",
  [ResourceType.Gold]: "Gold",
  [ResourceType.Gems]: "Gems",
  [MaterialType.CannedFood]: "Canned Food",
  [MaterialType.Fabric]: "Fabric",
  [MaterialType.Paper]: "Paper",
  [MaterialType.Lumber]: "Lumber",
  [MaterialType.Steel]: "Steel",
  [MaterialType.Fuel]: "Fuel",
  [GoodsType.Clothing]: "Clothing",
  [GoodsType.Furniture]: "Furniture",
  [GoodsType.Hardware]: "Hardware",
  [GoodsType.Armaments]: "Armaments",
};

/** Display names of the terrain types (FR-095). */
export const TERRAIN_TEXT: Record<TerrainType, string> = {
  [TerrainType.DryPlains]: "Dry plains",
  [TerrainType.OpenRange]: "Open range",
  [TerrainType.HorseRanch]: "Horse ranch",
  [TerrainType.Plantation]: "Plantation",
  [TerrainType.Farm]: "Farm",
  [TerrainType.Orchard]: "Orchard",
  [TerrainType.FertileHills]: "Fertile hills",
  [TerrainType.BarrenHills]: "Barren hills",
  [TerrainType.Mountains]: "Mountains",
  [TerrainType.HardwoodForest]: "Hardwood forest",
  [TerrainType.ScrubForest]: "Scrub forest",
  [TerrainType.Swamp]: "Swamp",
  [TerrainType.Desert]: "Desert",
  [TerrainType.Tundra]: "Tundra",
  [TerrainType.Water]: "Sea",
  [TerrainType.River]: "River",
  [TerrainType.Town]: "Town",
  [TerrainType.Capital]: "Capital",
  [TerrainType.Coast]: "Coast",
};

/**
 * A tile's accessible name (FR-095): terrain, then the resource and its level when known, then the
 * owner. "Farm, grain, level 1, owned by Testland"; a hidden resource is left out; the sea is "Sea".
 */
export function tileLabel(tile: Pick<Tile, "terrain" | "resource" | "ownerNationId">, ownerName: string | undefined): string {
  if (tile.terrain === TerrainType.Water) return TERRAIN_TEXT[TerrainType.Water];
  const parts = [TERRAIN_TEXT[tile.terrain]];
  const { resource } = tile;
  if (resource && resource.discovered !== false) parts.push(commodityName(resource.type).toLowerCase(), `level ${resource.level}`);
  parts.push(tile.ownerNationId ? `owned by ${ownerName ?? tile.ownerNationId}` : "not owned");
  return parts.join(", ");
}

/** The display name of a commodity; an unknown key is shown as it is. */
export const commodityName = (key: string): string =>
  Object.hasOwn(COMMODITY_TEXT, key) ? COMMODITY_TEXT[key as WarehouseCommodities] : key;

/** Gold and gems are sold as found and never enter the warehouse (rules 05 section 2). */
const NEVER_STORED: readonly ResourceType[] = [ResourceType.Gold, ResourceType.Gems];

/** The warehouse dialog's groups, in the order the original game lists them (FR-056). */
export const COMMODITY_GROUPS: readonly { title: string; keys: readonly WarehouseCommodities[] }[] = [
  { title: "Resources", keys: Object.values(ResourceType).filter((r) => !NEVER_STORED.includes(r)) },
  { title: "Materials", keys: Object.values(MaterialType) },
  { title: "Goods", keys: Object.values(GoodsType) },
];

const SEASON_TEXT: Record<Season, string> = { spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter" };

/** The date of a turn: "Spring 1815" (FR-048). */
export const dateText = (turn: number, year: number): string => `${SEASON_TEXT[seasonOf(turn)]} ${year}`;

const workers = (n: number) => `${n} worker${n === 1 ? "" : "s"}`;

/** The HUD's warning for a short meal, or null when everyone would eat well (FR-049). */
export function foodWarningText(forecast: FoodForecast): string | null {
  if (!forecast.short) return null;
  const parts: string[] = [];
  if (forecast.sick > 0) parts.push(`${workers(forecast.sick)} will eat the wrong food and fall sick`);
  if (forecast.starved > 0) parts.push(`${workers(forecast.starved)} will starve`);
  return `Food is short: at the end of this turn ${parts.join("; ")}.`;
}

/** News of a meal: only bad news is news. */
function foodNews(sick: number, starved: number): string | null {
  const parts: string[] = [];
  if (sick > 0) parts.push(`${sick} worker${sick === 1 ? "" : "s"} ate the wrong food and fell sick`);
  if (starved > 0) parts.push(`${starved} worker${starved === 1 ? "" : "s"} starved`);
  return parts.length > 0 ? `${capitalize(parts.join("; "))}.` : null;
}

/** One line of news for the event, or null when it is not news (the end of the turn). */
export function eventText(event: GameEvent): string | null {
  switch (event.type) {
    case "order-rejected":
      return refusalText(event);
    case "resource-discovered":
      return `Prospectors found ${event.resource ? commodityName(event.resource).toLowerCase() : "nothing"} at ${event.tileId}.`;
    case "development-completed":
      return `Tile ${event.tileId} developed to level ${event.level}.`;
    case "construction-completed":
      return `${capitalize(event.structure)} finished at ${event.tileId}.`;
    case "goods-produced":
      return `Produced ${event.amount} ${commodityName(event.output)}.`;
    case "freight-cars-built":
      return `${event.count} freight car${event.count === 1 ? "" : "s"} built.`;
    case "building-expanded":
      return `${BUILDING_TEXT[event.building]} expanded to ${event.capacity}.`;
    case "workers-trained":
      return `${event.count} worker${event.count === 1 ? "" : "s"} trained to ${event.to}.`;
    case "workers-fed":
      return foodNews(event.sick, event.starved);
    case "workers-recruited":
      return `${event.count} migrant${event.count === 1 ? "" : "s"} joined the workforce.`;
    case "goods-sold":
      return `Sold ${event.amount} ${commodityName(event.commodity)} for ${money(event.income)}.`;
    case "goods-bought":
      return `Bought ${event.amount} ${commodityName(event.commodity)} for ${money(event.cost)}.`;
    case "turn-ended":
      return null;
    case "game-over":
      return `Game over at the end of ${dateText(event.turn, event.year)}.`;
  }
}

/**
 * The news of a turn as the player reads it (FR-107): the player's own lines first, as `eventText`
 * words them; then every other nation's lines, each starting with the nation's name ("Valdoria: Rail
 * finished at 15-8."); then the lines of no nation (game over). Each group keeps the event order.
 */
export function newsLines(events: readonly GameEvent[], playerId: string, nameOf: (nationId: string) => string): string[] {
  const own: string[] = [];
  const others: string[] = [];
  const general: string[] = [];
  for (const event of events) {
    const line = eventText(event);
    if (line === null) continue;
    const nationId = "nationId" in event ? event.nationId : undefined;
    if (nationId === undefined) general.push(line);
    else if (nationId === playerId) own.push(line);
    else others.push(`${nameOf(nationId)}: ${line}`);
  }
  return [...own, ...others, ...general];
}

/** Tiles whose development or construction finished in these events (the map's "done" mark). */
export function completedTileIds(events: readonly GameEvent[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const e of events) {
    if (e.type === "development-completed" || e.type === "construction-completed") ids.add(e.tileId);
  }
  return ids;
}

const DEVELOPMENT_JOB_PREFIX: Partial<Record<WorkerType, string>> = {
  [WorkerType.Farmer]: "Farming",
  [WorkerType.Rancher]: "Ranching",
  [WorkerType.Forester]: "Forestry",
  [WorkerType.Miner]: "Mining",
  [WorkerType.Driller]: "Drilling",
  [WorkerType.Developer]: "Developing",
};

/**
 * What the worker is doing, read from the job it holds on its tile ("Farming to level 2",
 * "Constructing depot", "Prospecting"), "Moved" for a worker that moved this turn, or nothing.
 */
export function workerJobLabel(tile: Tile, worker: Worker): string | undefined {
  if (worker.status === WorkerStatus.Moved) return "Moved";
  if (worker.status !== WorkerStatus.Working) return undefined;
  if (tile.prospecting?.workerId === worker.id) return "Prospecting";
  const development = tile.developmentJob;
  if (development && development.workerId === worker.id) {
    return `${DEVELOPMENT_JOB_PREFIX[development.workerType] ?? "Developing"} to level ${development.targetLevel}`;
  }
  const construction = tile.constructionJob;
  if (construction && construction.workerId === worker.id) {
    return `Constructing ${construction.kind}`;
  }
  return undefined;
}
