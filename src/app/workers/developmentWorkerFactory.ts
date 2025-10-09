import {GameState} from "@/types/GameState";
import {TerrainType, Tile} from "@/types/Tile";
import {Worker, WorkerStatus, WorkerType} from "@/types/Workers";
import {GameMap} from "@/types/Map";
import {PossibleAction} from "@/types/actions";
import {WorkerLevelDurationsTurns} from "@/definisions/workerDurations";

/**
 * Configuration for a development worker type
 */
export interface DevelopmentWorkerConfig {
  workerType: WorkerType;
  terrainTypes: TerrainType[];
  jobDescriptionPrefix: string;
}

/**
 * Generic function to start development work for any worker type
 */
export function createStartDevelopmentWork(config: DevelopmentWorkerConfig) {
  const { workerType, jobDescriptionPrefix } = config;

  return function startWork(state: GameState): GameState {
    let updated = false;
    const newTiles = state.map.tiles.map(row =>
      row.map(tile => {
        if (!tile.workers) return tile;
        const worker = tile.workers.find(w => w.type === workerType && w.status === WorkerStatus.Available);
        if (!worker) return tile;
        if (!tile.resource) return tile;
        const targetLevel = (tile.resource.level || 0) + 1;
        if (targetLevel > 3) return tile;
        if (tile.developmentJob) return tile;
        const durationTurns = WorkerLevelDurationsTurns[workerType]?.[targetLevel as 1 | 2 | 3] || 1;
        const newJob = {
          workerId: worker.id,
          workerType: worker.type,
          targetLevel: targetLevel as 1 | 2 | 3,
          startedOnTurn: state.turn,
          durationTurns,
        };
        updated = true;
        return {
          ...tile,
          developmentJob: newJob,
          workers: tile.workers.map(w =>
            w.id === worker.id
              ? { ...w, status: WorkerStatus.Working, jobDescription: `${jobDescriptionPrefix} to level ${targetLevel}` }
              : w
          ),
        };
      })
    );
    return updated ? { ...state, map: { ...state.map, tiles: newTiles } } : state;
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
      const targetLevel = (tile.resource?.level || 0) + 1;
      if (targetLevel > 3) return null;
      return { type: "develop", workerType, level: targetLevel as 1 | 2 | 3 };
    }
    return null;
  };
}
