// Read-only transport planning for the scripted player (FR-122, FR-123): which tiles the capital and
// the depots gather from, which depot site pays most, and the shortest rail path from a depot to the
// capital's network. Pure: the state is only read; every choice is in map order, so it is deterministic.
import { ResourceDevelopmentTable } from "@/definisions/ResourceDevelopment";
import type { GameState } from "@/types/GameState";
import { TerrainType, type Tile } from "@/types/Tile";
import { getNeighborCoords } from "../map/mapHelpers";
import { hasJob, isDepotSite, isGreatPowerCapital, isLand, nationById, railTerrainAllowed } from "../orders/queries";
import { isRailLinked } from "../systems/railroadSystem";
import { CONSTRUCTION_COST, constructionCost } from "@/definisions/workPrices";
import { MaterialType, ResourceType } from "@/types/Resource";
import { buildingOf } from "../industry/industryState";
import { mealNeeds } from "../systems/foodSystem";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
import { EngineerBuildDurationsTurns } from "@/definisions/workerDurations";

const key = (x: number, y: number) => `${x},${y}`;
const keyOf = (tile: Pick<Tile, "x" | "y">) => key(tile.x, tile.y);
const tileAtKey = (state: GameState, k: string): Tile => {
  const [x, y] = k.split(",").map(Number);
  return state.map.tiles[y][x];
};
const neighbourKeys = (state: GameState, k: string): string[] => {
  const [x, y] = k.split(",").map(Number);
  return getNeighborCoords(state.map, x, y).map(([nx, ny]) => key(nx, ny));
};

/** A tile the nation gathers from: its capital (not a minor's it was given), a depot (built or being built) or a port. */
function isHub(state: GameState, tile: Tile, nationId: string): boolean {
  if (tile.ownerNationId !== nationId) return false;
  return (
    isGreatPowerCapital(state, tile) ||
    !!tile.depot ||
    !!tile.port ||
    tile.constructionJob?.kind === "depot" ||
    tile.constructionJob?.kind === "port"
  );
}

/** Tiles on or next to a hub: what logistics collects once every planned depot is joined (rules 02). */
export function coveredTiles(state: GameState, nationId: string): Set<string> {
  const covered = new Set<string>();
  for (const tile of state.map.tiles.flat()) {
    if (!isHub(state, tile, nationId)) continue;
    covered.add(keyOf(tile));
    for (const n of neighbourKeys(state, keyOf(tile))) covered.add(n);
  }
  return covered;
}

/** Units a tile yields a turn at its level; a resource not yet found yields nothing. */
export function yieldOf(tile: Tile): number {
  const res = tile.resource;
  if (!res || res.discovered === false) return 0;
  return ResourceDevelopmentTable[res.type]?.[res.level] ?? 0;
}

/** The nodes of the nation's rail graph reachable from its capital (the capital's component). */
export function capitalComponent(state: GameState, nationId: string): Set<string> {
  const network = state.transportNetwork.railroadNetworks?.[nationId];
  const seen = new Set<string>();
  if (!network?.capital) return seen;
  const start = key(network.capital.x, network.capital.y);
  if (!network.graph[start]) return seen;
  const queue = [start];
  seen.add(start);
  while (queue.length) {
    const k = queue.shift()!;
    for (const n of network.graph[k] ?? []) {
      const nk = key(n.x, n.y);
      if (!seen.has(nk)) {
        seen.add(nk);
        queue.push(nk);
      }
    }
  }
  return seen;
}

/** A tile rail may run over: own land where rail is allowed, already rail or free of other jobs (FR-113). */
function isPassable(state: GameState, tile: Tile, nationId: string): boolean {
  if (tile.ownerNationId !== nationId || !isLand(tile)) return false;
  if (tile.connected || tile.depot || tile.terrain === TerrainType.Capital) return true;
  return railTerrainAllowed(state, tile) && !hasJob(tile);
}

/**
 * The shortest rail path (breadth-first, neighbours in map order) from tile `from` to any tile of
 * `targets`, both ends included; undefined when none exists.
 */
export function railPath(state: GameState, nationId: string, from: string, targets: Set<string>): string[] | undefined {
  if (targets.has(from)) return [from];
  const previous = new Map<string, string>([[from, from]]);
  const queue = [from];
  while (queue.length) {
    const k = queue.shift()!;
    for (const n of neighbourKeys(state, k)) {
      if (previous.has(n)) continue;
      if (!targets.has(n) && !isPassable(state, tileAtKey(state, n), nationId)) continue;
      previous.set(n, k);
      if (targets.has(n)) {
        const path = [n];
        while (path[0] !== from) path.unshift(previous.get(path[0])!);
        return path;
      }
      queue.push(n);
    }
  }
  return undefined;
}

/** A rail section to build: the job goes on `toTileId`, joining it to the rail node `fromTileId` (FR-137). */
export interface RailSection {
  fromTileId: string;
  toTileId: string;
}

/**
 * The steps of a path (depot first, a tile of the capital's component last) that no section joins yet,
 * by the index of their depot-side tile (FR-138).
 */
function missingSteps(state: GameState, nationId: string, path: string[]): number[] {
  const network = state.transportNetwork.railroadNetworks?.[nationId];
  const at = (k: string) => tileAtKey(state, k);
  return path.slice(0, -1).flatMap((k, i) => (isRailLinked(network, at(k), at(path[i + 1])) ? [] : [i]));
}

/** A built depot not in the capital's rail component, with its shortest path there and that path's missing steps. */
interface UnjoinedDepot {
  tile: Tile;
  /** Depot first, a tile of the capital's component last; undefined when no path exists. */
  path?: string[];
  missing: number[];
}

/** The built depots not joined to the capital, in map order (FR-122 (1), FR-138). */
function unjoinedDepots(state: GameState, nationId: string, component: Set<string>): UnjoinedDepot[] {
  return state.map.tiles
    .flat()
    .filter((tile) => tile.ownerNationId === nationId && !!tile.depot && !component.has(keyOf(tile)))
    .map((tile) => {
      const path = railPath(state, nationId, keyOf(tile), component);
      return { tile, path, missing: path ? missingSteps(state, nationId, path) : [] };
    });
}

/**
 * The rail sections to try next for each built depot not joined to the capital (FR-122 (1), FR-138), depots
 * in map order: per depot, the first missing section of its shortest path from the capital's end (built from
 * the component outward), then the first from the depot's end (built from the depot's side); the engine
 * checks which can be built now.
 */
export function nextRailSections(state: GameState, nationId: string): RailSection[] {
  const component = capitalComponent(state, nationId);
  if (component.size === 0) return [];
  const id = (k: string) => tileAtKey(state, k).id;
  const sections: RailSection[] = [];
  for (const { path, missing } of unjoinedDepots(state, nationId, component)) {
    if (!path || missing.length === 0) continue;
    const last = missing[missing.length - 1];
    sections.push({ fromTileId: id(path[last + 1]), toTileId: id(path[last]) });
    const first = missing[0];
    if (first !== last) sections.push({ fromTileId: id(path[first]), toTileId: id(path[first + 1]) });
  }
  return sections;
}

/**
 * FR-459: the tile ids the engineer's rail still needs, kept free of the other civilians' jobs until the rail joins:
 * every built depot not joined to the capital, and on its shortest path both ends of each missing section outside the
 * capital's component (a section's job goes on one of them, FR-138). One job on a tile refuses the section on it
 * ("tile-has-job", FR-113): before FR-459 a forester's job on a built depot's tile kept the depot unjoined 2 turns.
 */
export function pendingRailTiles(state: GameState, nationId: string): Set<string> {
  const component = capitalComponent(state, nationId);
  const tiles = new Set<string>();
  if (component.size === 0) return tiles;
  for (const { tile, path, missing } of unjoinedDepots(state, nationId, component)) {
    tiles.add(tile.id);
    for (const i of missing) {
      for (const k of [path![i], path![i + 1]]) if (!component.has(k)) tiles.add(tileAtKey(state, k).id);
    }
  }
  return tiles;
}

export interface DepotSite {
  tileId: string;
  /** Units a turn of the tiles it newly covers (itself and its neighbours) that the nation will use (FR-456). */
  gain: number;
  /** Rail sections needed to join it to the capital's component, the one into the depot included (FR-138). */
  railNeeded: number;
  /** What those sections cost, each by the terrain of the tile it is built on, the one farther from the capital (FR-029). */
  railCost: number;
}

/** At least this much new yield a turn makes a depot worth its price. */
export const MIN_DEPOT_GAIN = 2;

/** The use a gathered resource is counted against: the meal's three kinds, the mills' inputs, an ore not yet prospected. */
type Use = "grain" | "fruit" | "meat" | "fibre" | "timber" | "coal" | "iron" | "ore";
const USE_OF: Partial<Record<string, Use>> = {
  [ResourceType.Grain]: "grain",
  [ResourceType.Fruit]: "fruit",
  [ResourceType.Livestock]: "meat",
  [ResourceType.Fish]: "meat",
  [ResourceType.Cotton]: "fibre",
  [ResourceType.Wool]: "fibre",
  [ResourceType.Timber]: "timber",
  [ResourceType.Coal]: "coal",
  [ResourceType.IronOre]: "iron",
};

/**
 * What a tile will yield a turn once its first level is done (the developers work the gathered tiles first, FR-123),
 * and the use it counts against. A resource not yet prospected counts as a level-1 ore: the tile panel shows "Not yet
 * prospected", not which ore (coal and iron ore yield the same at level 1).
 */
function plannedOf(tile: Tile): { use: Use | string; units: number } | undefined {
  const res = tile.resource;
  if (!res) return undefined;
  if (res.discovered === false) return { use: "ore", units: ResourceDevelopmentTable[ResourceType.Coal][1] };
  return { use: USE_OF[res.type] ?? res.type, units: ResourceDevelopmentTable[res.type]?.[Math.max(1, res.level)] ?? 0 };
}

/** FR-456: a meal kind the hubs do not cover becomes urgent once the stock (with the canned food) lasts fewer turns. */
export const MEAL_HORIZON = 15;
type MealKind = "grain" | "fruit" | "meat";
interface Shortfall {
  /** Units a turn still usable, by use. */
  short: Record<string, number>;
  /** Units a turn of the meal itself the hubs do not cover, for the kinds whose stock runs out within MEAL_HORIZON. */
  urgentMeal: Record<MealKind, number>;
}

/**
 * Units a turn the nation can still use of each kind, beyond what its hubs (built or planned) gather once developed:
 * the meal and one canned-food batch (FR-127), two turns' input of the lumber and textile mills a turn (2 units each a
 * batch) and the steel mill's coal and iron. An ore not yet prospected fills the coal and iron still short. A kind with
 * no use listed (gold, horses ...) is not capped. Also the meal kinds that are urgent (see `Shortfall`).
 */
function shortfallOf(state: GameState, nationId: string, covered: Set<string>): Shortfall {
  const nation = nationById(state, nationId);
  if (!nation) return { short: {}, urgentMeal: { grain: 0, fruit: 0, meat: 0 } };
  const size = (b: "steelMill" | "lumberMill" | "textileMill") => buildingOf(nation, b).capacity;
  const { untrained, trained, expert } = nation.industry.workers;
  const needs = mealNeeds(untrained + trained + expert);
  const uses: Record<Use, number> = {
    grain: needs.grain + 2,
    fruit: needs.fruit + 1,
    meat: needs.meat + 1,
    fibre: 2 * size("textileMill"),
    timber: 2 * size("lumberMill"),
    coal: size("steelMill"),
    iron: size("steelMill"),
    ore: 0,
  };
  const supply: Record<string, number> = {};
  for (const k of covered) {
    const t = tileAtKey(state, k);
    const planned = t.ownerNationId === nationId ? plannedOf(t) : undefined;
    if (planned) supply[planned.use] = (supply[planned.use] ?? 0) + planned.units;
  }
  const short: Record<string, number> = {};
  for (const use of Object.keys(uses) as Use[]) short[use] = Math.max(0, uses[use] - (supply[use] ?? 0));
  short.ore = Math.max(0, short.coal + short.iron - (supply.ore ?? 0));
  const stock = nation.warehouse as Record<string, number>;
  const cans = stock[MaterialType.CannedFood] ?? 0;
  const inStock: Record<MealKind, number> = {
    grain: stock[ResourceType.Grain] ?? 0,
    fruit: stock[ResourceType.Fruit] ?? 0,
    meat: (stock[ResourceType.Livestock] ?? 0) + (stock[ResourceType.Fish] ?? 0),
  };
  const urgentMeal = { grain: 0, fruit: 0, meat: 0 };
  for (const kind of ["grain", "fruit", "meat"] as const) {
    const missing = Math.max(0, needs[kind] - (supply[kind] ?? 0));
    if (missing > 0 && inStock[kind] + cans < MEAL_HORIZON * missing) urgentMeal[kind] = missing;
  }
  return { short, urgentMeal };
}

/** The units a turn each use gets from `tiles` (their level-1 yield, `plannedOf`). */
function foundOf(tiles: Tile[]): Record<string, number> {
  const found: Record<string, number> = {};
  for (const t of tiles) {
    const planned = plannedOf(t);
    if (planned) found[planned.use] = (found[planned.use] ?? 0) + planned.units;
  }
  return found;
}

/**
 * FR-457: turns from the order until a depot's gathering has paid its price and rail, in FR-132's terms: it delivers
 * from two turns after the build starts plus one turn per rail section, `gain` units a turn at $100 each.
 */
export const paybackTurns = (site: DepotSite): number =>
  EngineerBuildDurationsTurns.depot - 1 + site.railNeeded + (CONSTRUCTION_COST.depot + site.railCost) / SCORE_WEIGHTS.dollarsPerPoint / site.gain;

/** FR-456: the units a turn of `found` that the nation will use (`short`); a kind with no use listed counts in full. */
const usefulGain = (found: Record<string, number>, short: Record<string, number>): number =>
  Object.entries(found).reduce((sum, [use, units]) => sum + (use in short ? Math.min(units, short[use]) : units), 0);

/** FR-456: the urgent meal units a turn (`Shortfall.urgentMeal`) that `found` covers. */
const mealFilled = (found: Record<string, number>, urgent: Record<MealKind, number>): number =>
  (["grain", "fruit", "meat"] as const).reduce((sum, kind) => sum + Math.min(found[kind] ?? 0, urgent[kind]), 0);

/**
 * The best depot site (FR-122 (2)): a valid depot site (FR-030) free of jobs and joinable by rail whose newly covered
 * tiles gain at least MIN_DEPOT_GAIN units a turn the nation will use (FR-456: `usefulGain`, at their level-1 yield).
 * FR-456: a site that covers more of an urgent meal comes first (the workers fall sick when the meal runs out); then
 * FR-457: the site that pays back first (`paybackTurns`), ties to the larger gain, then map order. Until FR-457 the
 * largest gain won, so a depot 8 rail sections away was joined only on turn 12. Undefined when no site gains enough.
 */
export function bestDepotSite(state: GameState, nationId: string): DepotSite | undefined {
  const component = capitalComponent(state, nationId);
  if (component.size === 0) return undefined;
  const covered = coveredTiles(state, nationId);
  const { short, urgentMeal } = shortfallOf(state, nationId, covered);
  let best: { site: DepotSite; meal: number; turns: number } | undefined;
  for (const tile of state.map.tiles.flat()) {
    if (tile.ownerNationId !== nationId || !isLand(tile) || hasJob(tile) || !isDepotSite(state, tile)) continue;
    const cell = [keyOf(tile), ...neighbourKeys(state, keyOf(tile))];
    const found = foundOf(
      cell
        .filter((k) => !covered.has(k))
        .map((k) => tileAtKey(state, k))
        .filter((t) => t.ownerNationId === nationId)
    );
    const gain = usefulGain(found, short);
    if (gain < MIN_DEPOT_GAIN) continue;
    const path = railPath(state, nationId, keyOf(tile), component);
    if (!path) continue;
    const builtOn = missingSteps(state, nationId, path).map((i) => tileAtKey(state, path[i]));
    const railCost = builtOn.reduce((sum, t) => sum + constructionCost("rail", t.terrain), 0);
    const site: DepotSite = { tileId: tile.id, gain, railNeeded: builtOn.length, railCost };
    const meal = mealFilled(found, urgentMeal);
    const turns = paybackTurns(site);
    const better =
      !best || meal > best.meal || (meal === best.meal && (turns < best.turns || (turns === best.turns && gain > best.site.gain)));
    if (better) best = { site, meal, turns };
  }
  return best?.site;
}

/**
 * Own tiles in the order the prospector and developers try them (FR-123): first those on or next to
 * the capital or a depot, then the rest by their distance over land to the capital; map order within.
 */
export function tilesByReach(state: GameState, nationId: string): Tile[] {
  const own = state.map.tiles.flat().filter((t) => t.ownerNationId === nationId && isLand(t));
  const covered = coveredTiles(state, nationId);
  const capital = own.find((t) => isGreatPowerCapital(state, t));
  const distance = new Map<string, number>();
  if (capital) {
    distance.set(keyOf(capital), 0);
    const queue = [keyOf(capital)];
    while (queue.length) {
      const k = queue.shift()!;
      for (const n of neighbourKeys(state, k)) {
        const t = tileAtKey(state, n);
        if (distance.has(n) || t.ownerNationId !== nationId || !isLand(t)) continue;
        distance.set(n, distance.get(k)! + 1);
        queue.push(n);
      }
    }
  }
  const rank = (t: Tile) => (covered.has(keyOf(t)) ? 0 : 1 + (distance.get(keyOf(t)) ?? Number.MAX_SAFE_INTEGER));
  // Array.prototype.sort is stable: equal ranks keep the map order of `own`
  return own.map((tile) => ({ tile, r: rank(tile) })).sort((a, b) => a.r - b.r).map(({ tile }) => tile);
}
