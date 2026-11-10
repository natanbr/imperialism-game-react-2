import {TerrainType, Tile} from "@/types/Tile";
import {Worker, WorkerStatus, WorkerType} from "@/types/Workers";
import {GameMap} from "@/types/Map";
import {PossibleAction} from "@/types/actions";
import { hasJob } from "@/engine/orders/queries";

/**
 * Configuration for a development worker type
 */
export interface DevelopmentWorkerConfig {
  workerType: WorkerType;
  terrainTypes: TerrainType[];
}

/**
 * The action a development worker offers on a tile (the map cursor and click). Starting the job
 * is a startDevelopment or moveAndStartDevelopment order; the engine's validation decides.
 */
export function createGetDevelopmentActions(config: DevelopmentWorkerConfig) {
  const { workerType, terrainTypes } = config;

  return function getActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
    if (worker.status !== WorkerStatus.Available) return null;
    if (tile.ownerNationId !== worker.nationId) return null;
    if (!hasJob(tile) && terrainTypes.includes(tile.terrain)) {
      // Check if resource exists and is discovered (for minerals/oil)
      if (!tile.resource || tile.resource.discovered === false) return null;
      const targetLevel = (tile.resource.level || 0) + 1;
      if (targetLevel > 3) return null;
      return { type: "develop", workerType, level: targetLevel as 1 | 2 | 3 };
    }
    return null;
  };
}
