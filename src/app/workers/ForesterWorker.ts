import { AbstractWorker } from "./AbstractWorker";
import { GameState } from "../types/GameState";
import { Tile } from "../types/Tile";
import { Worker, WorkerType, WorkerStatus } from "../types/Workers";
import { GameMap } from "../types/Map";
import { PossibleAction } from "../types/actions";
import { FORESTRY_TERRAINS } from "../definisions/terrainDefinitions";
import { WorkerLevelDurationsTurns } from "../definisions/workerDurations";

export class ForesterWorker extends AbstractWorker {
  startWork(state: GameState): GameState {
    let updated = false;
    const newTiles = state.map.tiles.map(row =>
      row.map(tile => {
        if (!tile.workers) return tile;
        const worker = tile.workers.find(w => w.type === WorkerType.Forester && w.status === WorkerStatus.Available);
        if (!worker) return tile;
        if (!tile.resource) return tile;
        const targetLevel = (tile.resource.level || 0) + 1;
        if (targetLevel > 3) return tile;
        if (tile.developmentJob) return tile;
        const durationTurns = WorkerLevelDurationsTurns[WorkerType.Forester]?.[targetLevel as 1 | 2 | 3] || 1;
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
              ? { ...w, status: WorkerStatus.Working, jobDescription: `Forestry to level ${targetLevel}` }
              : w
          ),
        };
      })
    );
    return updated ? { ...state, map: { ...state.map, tiles: newTiles } } : state;
  }

  getActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
    if (worker.status !== WorkerStatus.Available) return null;
    if (tile.ownerNationId !== worker.nationId) return null;
    if (!tile.developmentJob && FORESTRY_TERRAINS.includes(tile.terrain)) {
      const targetLevel = (tile.resource?.level || 0) + 1;
      if (targetLevel > 3) return null;
      return { type: "develop", workerType: WorkerType.Forester, level: targetLevel as 1 | 2 | 3 };
    }
    return null;
  }
}
