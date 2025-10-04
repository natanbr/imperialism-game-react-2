import { AbstractWorker } from "./AbstractWorker";
import { GameState } from "../types/GameState";
import { Tile } from "../types/Tile";
import { Worker, WorkerStatus } from "../types/Workers";
import { GameMap } from "../types/Map";
import { PossibleAction } from "../types/actions";
import { PROSPECTABLE_TERRAIN_TYPES } from "../definisions/terrainDefinitions";

export class ProspectorWorker extends AbstractWorker {
  startWork(state: GameState): GameState {
    // Find the prospector worker and tile
    let updated = false;
    const newTiles = state.map.tiles.map(row =>
      row.map(tile => {
        if (!tile.workers) return tile;
        const worker = tile.workers.find(w => w.type === "prospector" && w.status === WorkerStatus.Available);
        if (!worker) return tile;
        if (!tile.resource || tile.resource.discovered) return tile;
        if (tile.prospecting) return tile;
        // Get duration
        // For now, use 1 turn (can be updated from workerDurations)
        const startedOnTurn = state.turn;
        updated = true;
        return {
          ...tile,
          prospecting: { startedOnTurn, workerId: worker.id },
          workers: tile.workers.map(w =>
            w.id === worker.id
              ? { ...w, status: WorkerStatus.Working, jobDescription: "Prospecting" }
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
    if (PROSPECTABLE_TERRAIN_TYPES.includes(tile.terrain) && !tile.resource?.discovered && !tile.prospecting) {
      return { type: "prospect" };
    }
    return null;
  }
}
