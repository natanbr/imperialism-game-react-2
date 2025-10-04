import { AbstractWorker } from "./AbstractWorker";
import { GameState } from "../types/GameState";
import { Tile, TerrainType } from "../types/Tile";
import { Worker, WorkerType, WorkerStatus } from "../types/Workers";
import { GameMap } from "../types/Map";
import { PossibleAction } from "../types/actions";
import { FARMING_TERRAINS, RANCHING_TERRAINS, FORESTRY_TERRAINS, MINING_TERRAINS, DRILLING_TERRAINS } from "../definisions/terrainDefinitions";
import { WorkerLevelDurationsTurns } from "../definisions/workerDurations";

export class DeveloperWorker extends AbstractWorker {
  terrainMap: Record<WorkerType, TerrainType[]>;
  constructor() {
    super();
    this.terrainMap = {
      [WorkerType.Prospector]: [],
      [WorkerType.Engineer]: [],
      [WorkerType.Farmer]: FARMING_TERRAINS,
      [WorkerType.Rancher]: RANCHING_TERRAINS,
      [WorkerType.Forester]: FORESTRY_TERRAINS,
      [WorkerType.Miner]: MINING_TERRAINS,
      [WorkerType.Driller]: DRILLING_TERRAINS,
      [WorkerType.Developer]: [],
    };
  }

  startWork(state: GameState): GameState {
    // Find the developer worker and tile
    let updated = false;
    const newTiles = state.map.tiles.map(row =>
      row.map(tile => {
        if (!tile.workers) return tile;
        const worker = tile.workers.find(w => w.type === WorkerType.Developer && w.status === WorkerStatus.Available);
        if (!worker) return tile;
        if (!tile.resource) return tile;
        const targetLevel = (tile.resource.level || 0) + 1;
        if (targetLevel > 3) return tile;
        if (tile.developmentJob) return tile;
        // Get duration
  const durationTurns = WorkerLevelDurationsTurns[worker.type]?.[targetLevel as 1 | 2 | 3] || 1;
        // Assign job
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
              ? { ...w, status: WorkerStatus.Working, jobDescription: `Developing to level ${targetLevel}` }
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
    if (!tile.developmentJob) {
      const targetLevel = (tile.resource?.level || 0) + 1;
      if (targetLevel > 3) return null;
      if (this.terrainMap[worker.type]?.includes(tile.terrain)) {
        return { type: "develop", workerType: worker.type, level: targetLevel as 1 | 2 | 3 };
      }
    }
    return null;
  }
}
