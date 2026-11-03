import {GameState} from "@/types/GameState";
import {TerrainType, Tile} from "@/types/Tile";
import {Worker, WorkerStatus, WorkerType} from "@/types/Workers";
import {GameMap} from "@/types/Map";
import {PossibleAction} from "@/types/actions";
import {startEachWorker} from "./startEachWorker";

/**
 * Configuration for a development worker type
 */
export interface DevelopmentWorkerConfig {
  workerType: WorkerType;
  terrainTypes: TerrainType[];
  jobDescriptionPrefix: string;
}

/**
 * Generic function to start development work for any worker type.
 * The returned function starts `workerId` only; without an id, every available worker of the type.
 * Rules, prices and job text come from the engine's startDevelopment order.
 */
export function createStartDevelopmentWork(config: DevelopmentWorkerConfig) {
  const { workerType } = config;

  return function startWork(state: GameState, workerId?: string): GameState {
    return startEachWorker(state, workerType, workerId, (_s, worker, tile) => ({
      kind: "startDevelopment",
      nationId: worker.nationId,
      workerId: worker.id,
      tileId: tile.id,
    }));
  };
}

/**
 * Generic function to get actions for any development worker type
 */
export function createGetDevelopmentActions(config: DevelopmentWorkerConfig) {
  const { workerType, terrainTypes } = config;

  return function getActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
    if (worker.status !== WorkerStatus.Available) return null;
    if (tile.ownerNationId !== worker.nationId) return null;
    if (!tile.developmentJob && terrainTypes.includes(tile.terrain)) {
      // Check if resource exists and is discovered (for minerals/oil)
      if (!tile.resource || tile.resource.discovered === false) return null;
      const targetLevel = (tile.resource.level || 0) + 1;
      if (targetLevel > 3) return null;
      return { type: "develop", workerType, level: targetLevel as 1 | 2 | 3 };
    }
    return null;
  };
}
