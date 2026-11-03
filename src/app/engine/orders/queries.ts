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
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { isAdjacentToOcean } from "../map/mapHelpers";

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

/** True if one of the tile's unfinished jobs belongs to the worker. */
export function holdsJob(tile: Tile, workerId: string): boolean {
  return (
    tile.prospecting?.workerId === workerId ||
    (!!tile.developmentJob && !tile.developmentJob.completed && tile.developmentJob.workerId === workerId) ||
    (!!tile.constructionJob && !tile.constructionJob.completed && tile.constructionJob.workerId === workerId)
  );
}

export const isWorkerBusy = (tile: Tile, worker: Worker): boolean =>
  worker.status === WorkerStatus.Working || holdsJob(tile, worker.id);

export const hasMovedThisTurn = (worker: Worker): boolean =>
  worker.justMoved || worker.status === WorkerStatus.Moved;

/** Workers can stand on any tile except open water and river tiles. */
export const isLand = (tile: Tile): boolean =>
  tile.terrain !== TerrainType.Water && tile.terrain !== TerrainType.River;

/** A port needs a river on the tile or an ocean (coast or water) tile next to it. */
export const isPortSite = (state: GameState, tile: Tile): boolean =>
  tile.hasRiver === true || isAdjacentToOcean(state.map, tile.x, tile.y);

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

/** Job text shown on the worker, e.g. "Farming to level 2". */
export const DEVELOPMENT_JOB_PREFIX: Partial<Record<WorkerType, string>> = {
  [WorkerType.Farmer]: "Farming",
  [WorkerType.Rancher]: "Ranching",
  [WorkerType.Forester]: "Forestry",
  [WorkerType.Miner]: "Mining",
  [WorkerType.Driller]: "Drilling",
  [WorkerType.Developer]: "Developing",
};

/** The level a development job on this tile would reach. */
export const nextResourceLevel = (tile: Tile): number => (tile.resource?.level || 0) + 1;
