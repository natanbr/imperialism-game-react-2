import { WorkerAction } from "./WorkerAction";
import { WorkerStatus } from "../types/Workers";
import { GameState } from "../types/GameState";
import { Tile } from "../types/Tile";
import { Worker } from "../types/Workers";
import { GameMap } from "../types/Map";
import { PossibleAction } from "../types/actions";

export abstract class AbstractWorker implements WorkerAction {
  move(state: GameState, from: Tile, to: Tile, worker: Worker): GameState {
    // Remove worker from 'from' tile, add to 'to' tile, update worker state
    const newTiles = state.map.tiles.map((row, y) =>
      row.map((tile, x) => {
        if (tile.id === from.id) {
          return { ...tile, workers: tile.workers.filter(w => w.id !== worker.id) };
        }
        if (tile.id === to.id) {
          const movedWorker: Worker = {
            ...worker,
            assignedTileId: to.id,
            justMoved: true,
            status: WorkerStatus.Moved,
            jobDescription: "Moved",
            previousTileId: from.id,
          };
          return { ...tile, workers: [...tile.workers, movedWorker] };
        }
        return tile;
      })
    );
    return { ...state, map: { ...state.map, tiles: newTiles } };
  }

  cancel(state: GameState, tile: Tile, worker: Worker): GameState {
    // Common cancel logic
    // ...implementation here...
    return state;
  }

  getActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
    // Default implementation, can be overridden
    return null;
  }

  abstract startWork(state: GameState): GameState;
}
