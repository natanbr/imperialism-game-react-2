// Read-only lookups and rule predicates shared by validate, apply and AI players.
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import { TerrainType, type Tile } from "@/types/Tile";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";
import {
  DRILLING_TERRAINS,
  FARMING_TERRAINS,
  FORESTRY_TERRAINS,
  MINING_TERRAINS,
  RANCHING_TERRAINS,
} from "@/definisions/terrainDefinitions";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { areTilesAdjacent, canBuildRailAt, getAdjacentTiles, isAdjacentToOcean } from "../map/mapHelpers";
import { hasRailLink, isRailLinked } from "../systems/railroadSystem";

export interface WorkerLocation {
  worker: Worker;
  tile: Tile;
}

export function findWorker(state: GameState, workerId: string): WorkerLocation | undefined {
  for (const row of state.map.tiles) {
    for (const tile of row) {
      const worker = tile.workers.find((w) => w.id === workerId);
      if (worker) return { worker, tile };
    }
  }
  return undefined;
}

/** All workers of a nation in map order (row by row). */
export function workersOf(state: GameState, nationId: string): WorkerLocation[] {
  return state.map.tiles.flat().flatMap((tile) =>
    tile.workers.filter((w) => w.nationId === nationId).map((worker) => ({ worker, tile }))
  );
}

export function tileById(state: GameState, tileId: string): Tile | undefined {
  const [x, y] = parseTileIdToArray(tileId);
  const tile = state.map.tiles[y]?.[x];
  return tile && tile.id === tileId ? tile : undefined;
}

export function nationById(state: GameState, nationId: string): Nation | undefined {
  return state.nations.find((n) => n.id === nationId);
}

export const treasuryOf = (state: GameState, nationId: string): number =>
  nationById(state, nationId)?.treasury ?? 0;

/** True if one of the tile's jobs belongs to the worker (a finished job leaves its tile, FR-032). */
export function holdsJob(tile: Tile, workerId: string): boolean {
  return (
    tile.prospecting?.workerId === workerId ||
    tile.developmentJob?.workerId === workerId ||
    tile.constructionJob?.workerId === workerId
  );
}

/**
 * One job per tile (FR-113, NR-019): any number of civilians may stand on a tile, but only one of
 * them works it at a time (rules 02 and 03: one civilian works a tile at a time).
 */
export const hasJob = (tile: Tile): boolean => !!(tile.prospecting || tile.developmentJob || tile.constructionJob);

export const isWorkerBusy = (tile: Tile, worker: Worker): boolean =>
  worker.status === WorkerStatus.Working || holdsJob(tile, worker.id);

export const hasMovedThisTurn = (worker: Worker): boolean =>
  worker.justMoved || worker.status === WorkerStatus.Moved;

/** Workers can stand on any tile except open water and river tiles. */
export const isLand = (tile: Tile): boolean =>
  tile.terrain !== TerrainType.Water && tile.terrain !== TerrainType.River;

// --- construction sites (FR-030, rules 04 sections 1 and 2) ---------------------------------

/** Technology ids the site rules read. */
export const TECH = {
  compoundSteamEngine: "compoundSteamEngine",
  ironRailroadBridge: "ironRailroadBridge",
  dynamite: "dynamite",
} as const;

export const hasTechnology = (state: GameState, id: string): boolean =>
  state.technologyState.technologies.some((t) => t.id === id && t.purchased);

const HILLS: readonly TerrainType[] = [TerrainType.BarrenHills, TerrainType.FertileHills];
const isHills = (tile: Tile): boolean => HILLS.includes(tile.terrain);
const isCapital = (tile: Tile): boolean => tile.terrain === TerrainType.Capital;

/**
 * A Great Power's own capital: a Capital tile that is not a minor nation's capital (FR-146). A minor's
 * capital keeps the Capital terrain when `transferProvince` gives it to a Great Power (FR-148), but it
 * gathers nothing for it: the Great Power's rail network and logistics know only its own capital.
 */
export const isGreatPowerCapital = (state: GameState, tile: Tile): boolean =>
  isCapital(tile) && !state.minorNations.some((m) => m.capitalTileId === tile.id);

/** Hills need Compound Steam Engine, swamp Iron Railroad Bridge, mountains Dynamite. */
export function railTerrainAllowed(state: GameState, tile: Tile): boolean {
  if (isHills(tile)) return hasTechnology(state, TECH.compoundSteamEngine);
  if (tile.terrain === TerrainType.Swamp) return hasTechnology(state, TECH.ironRailroadBridge);
  if (tile.terrain === TerrainType.Mountains) return hasTechnology(state, TECH.dynamite);
  return true;
}

export const isRailSite = (state: GameState, tile: Tile, nationId: string): boolean =>
  canBuildRailAt(state.map, tile.x, tile.y, nationId) && railTerrainAllowed(state, tile);

/** A tile a rail section may start from: the nation's own land with rail on it, its capital, a depot or a port. */
export const isRailNode = (tile: Tile, nationId: string): boolean =>
  tile.ownerNationId === nationId && isLand(tile) && !!(tile.connected || isCapital(tile) || tile.depot || tile.port);

/**
 * The tile a rail section onto `to` starts from (FR-137): `named` when it is a rail node of the nation
 * next to `to` and no section joins the two yet; with no name, and only while no section ends on `to`,
 * the first neighbour of `to` in map neighbour order that is a rail node. Undefined when there is none.
 */
export function railSectionStart(state: GameState, nationId: string, to: Tile, named?: Tile): Tile | undefined {
  const network = state.transportNetwork.railroadNetworks?.[nationId];
  if (named) {
    const joinable = isRailNode(named, nationId) && areTilesAdjacent(state.map, named.x, named.y, to.x, to.y);
    return joinable && !isRailLinked(network, named, to) ? named : undefined;
  }
  if (hasRailLink(network, to)) return undefined;
  return getAdjacentTiles(state.map, to.x, to.y).find((n) => isRailNode(n, nationId));
}

/**
 * The start of the section a rail construction order builds on `tile` (FR-137), or undefined when it
 * may build none. With `fromTileId` the tile may already have rail; without it the tile must be a rail
 * site (`isRailSite`) and the section starts from its first rail neighbour.
 */
export function railConstructionStart(state: GameState, nationId: string, tile: Tile, fromTileId?: string): Tile | undefined {
  if (fromTileId === undefined) return isRailSite(state, tile, nationId) ? railSectionStart(state, nationId, tile) : undefined;
  const named = tileById(state, fromTileId);
  if (!named || tile.ownerNationId !== nationId || !isLand(tile) || !railTerrainAllowed(state, tile)) return undefined;
  return railSectionStart(state, nationId, tile, named);
}

/**
 * The start of the section rail-on-move builds (FR-137): from the engineer's tile `from` when it is a
 * rail node, else from the target's first rail neighbour; the target must be a rail site.
 */
export function railOnMoveStart(state: GameState, nationId: string, from: Tile, to: Tile): Tile | undefined {
  if (!isRailSite(state, to, nationId)) return undefined;
  return railSectionStart(state, nationId, to, isRailNode(from, nationId) ? from : undefined);
}

/** A Great Power's capital, a depot or a port, built or under construction. */
const gathers = (state: GameState, tile: Tile): boolean =>
  isGreatPowerCapital(state, tile) ||
  !!tile.depot ||
  !!tile.port ||
  tile.constructionJob?.kind === "depot" ||
  tile.constructionJob?.kind === "port";

/**
 * A depot needs a tile without one, not next to its own country's capital, depot or port (gaps.md F6:
 * "not adjacent"; the capital already is a depot; a neighbour's gathers only the neighbour's land), and
 * not on hills before Compound Steam Engine. A port on the same tile is allowed: the manual tells you to
 * put the depot on a distant port.
 */
export const isDepotSite = (state: GameState, tile: Tile): boolean =>
  !tile.depot &&
  !isCapital(tile) &&
  !getAdjacentTiles(state.map, tile.x, tile.y).some((n) => n.ownerNationId === tile.ownerNationId && gathers(state, n)) &&
  (!isHills(tile) || hasTechnology(state, TECH.compoundSteamEngine));

/**
 * A port needs a river on the tile or an ocean (coast or water) tile next to it, no port yet (the
 * capital is one), and no hills or mountains.
 */
export const isPortSite = (state: GameState, tile: Tile): boolean =>
  !tile.port &&
  !isCapital(tile) &&
  !isHills(tile) &&
  tile.terrain !== TerrainType.Mountains &&
  (tile.hasRiver === true || isAdjacentToOcean(state.map, tile.x, tile.y));

/** The capital starts with a level 1 fort. */
export const fortLevelOf = (tile: Tile): number => Math.max(tile.fortLevel ?? 0, isCapital(tile) ? 1 : 0);

/** Only level 1 can be built: levels 2 and 3 need technology v1 does not have. */
export const isFortSite = (tile: Tile): boolean => fortLevelOf(tile) === 0;

export function isConstructionSite(state: GameState, tile: Tile, structure: ConstructionKind, nationId: string): boolean {
  switch (structure) {
    case "rail":
      return isRailSite(state, tile, nationId);
    case "depot":
      return isDepotSite(state, tile);
    case "port":
      return isPortSite(state, tile);
    case "fort":
      return isFortSite(tile);
  }
}

/** Terrains each development worker may improve; the generic developer may improve any. */
export const DEVELOPMENT_TERRAINS: Partial<Record<WorkerType, readonly TerrainType[]>> = {
  [WorkerType.Farmer]: FARMING_TERRAINS,
  [WorkerType.Rancher]: RANCHING_TERRAINS,
  [WorkerType.Forester]: FORESTRY_TERRAINS,
  [WorkerType.Miner]: MINING_TERRAINS,
  [WorkerType.Driller]: DRILLING_TERRAINS,
};

export const DEVELOPMENT_WORKER_TYPES: readonly WorkerType[] = [
  WorkerType.Farmer,
  WorkerType.Rancher,
  WorkerType.Forester,
  WorkerType.Miner,
  WorkerType.Driller,
  WorkerType.Developer,
];

/** The level a development job on this tile would reach. */
export const nextResourceLevel = (tile: Tile): number => (tile.resource?.level || 0) + 1;
