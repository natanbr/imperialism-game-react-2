// Read-only transport planning for the scripted player (FR-122, FR-123): which tiles the capital and
// the depots gather from, which depot site pays most, and the shortest rail path from a depot to the
// capital's network. Pure: the state is only read; every choice is in map order, so it is deterministic.
import { ResourceDevelopmentTable } from "@/definisions/ResourceDevelopment";
import type { GameState } from "@/types/GameState";
import { TerrainType, type Tile } from "@/types/Tile";
import { getNeighborCoords } from "../map/mapHelpers";
import { hasJob, isDepotSite, isLand, railTerrainAllowed } from "../orders/queries";
import { isRailLinked } from "../systems/railroadSystem";
import { constructionCost } from "@/definisions/workPrices";

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

/** A tile the nation gathers from: its capital, a depot (built or being built) or a port. */
function isHub(tile: Tile, nationId: string): boolean {
  if (tile.ownerNationId !== nationId) return false;
  return (
    tile.terrain === TerrainType.Capital ||
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
    if (!isHub(tile, nationId)) continue;
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
  for (const tile of state.map.tiles.flat()) {
    if (tile.ownerNationId !== nationId || !tile.depot || component.has(keyOf(tile))) continue;
    const path = railPath(state, nationId, keyOf(tile), component);
    if (!path) continue;
    const missing = missingSteps(state, nationId, path);
    if (missing.length === 0) continue;
    const last = missing[missing.length - 1];
    sections.push({ fromTileId: id(path[last + 1]), toTileId: id(path[last]) });
    const first = missing[0];
    if (first !== last) sections.push({ fromTileId: id(path[first]), toTileId: id(path[first + 1]) });
  }
  return sections;
}

export interface DepotSite {
  tileId: string;
  /** Yield a turn of the tiles it newly covers (itself and its neighbours). */
  gain: number;
  /** Rail sections needed to join it to the capital's component, the one into the depot included (FR-138). */
  railNeeded: number;
  /** What those sections cost, each by the terrain of the tile it is built on, the one farther from the capital (FR-029). */
  railCost: number;
}

/** At least this much new yield a turn makes a depot worth its price. */
export const MIN_DEPOT_GAIN = 2;

/**
 * The depot site that newly covers the most yield (FR-122 (2)): a valid depot site (FR-030) free of
 * jobs and joinable by rail; ties go to the shorter rail path, then map order. Undefined when no site
 * gains at least MIN_DEPOT_GAIN.
 */
export function bestDepotSite(state: GameState, nationId: string): DepotSite | undefined {
  const component = capitalComponent(state, nationId);
  if (component.size === 0) return undefined;
  const covered = coveredTiles(state, nationId);
  let best: DepotSite | undefined;
  for (const tile of state.map.tiles.flat()) {
    if (tile.ownerNationId !== nationId || !isLand(tile) || hasJob(tile) || !isDepotSite(state, tile)) continue;
    const cell = [keyOf(tile), ...neighbourKeys(state, keyOf(tile))];
    const gain = cell
      .filter((k) => !covered.has(k))
      .map((k) => tileAtKey(state, k))
      .filter((t) => t.ownerNationId === nationId)
      .reduce((sum, t) => sum + yieldOf(t), 0);
    if (gain < MIN_DEPOT_GAIN) continue;
    const path = railPath(state, nationId, keyOf(tile), component);
    if (!path) continue;
    const builtOn = missingSteps(state, nationId, path).map((i) => tileAtKey(state, path[i]));
    const railNeeded = builtOn.length;
    if (!best || gain > best.gain || (gain === best.gain && railNeeded < best.railNeeded)) {
      best = { tileId: tile.id, gain, railNeeded, railCost: builtOn.reduce((sum, t) => sum + constructionCost("rail", t.terrain), 0) };
    }
  }
  return best;
}

/**
 * Own tiles in the order the prospector and developers try them (FR-123): first those on or next to
 * the capital or a depot, then the rest by their distance over land to the capital; map order within.
 */
export function tilesByReach(state: GameState, nationId: string): Tile[] {
  const own = state.map.tiles.flat().filter((t) => t.ownerNationId === nationId && isLand(t));
  const covered = coveredTiles(state, nationId);
  const capital = own.find((t) => t.terrain === TerrainType.Capital);
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
