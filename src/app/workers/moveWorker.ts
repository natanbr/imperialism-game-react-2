import { GameState } from "../types/GameState";
import { Tile } from "../types/Tile";
import { Worker, WorkerStatus } from "../types/Workers";

/**
 * Moves a worker from one tile to another, updating their state.
 * Returns the new GameState.
 */
export function moveWorker(state: GameState, from: Tile, to: Tile, worker: Worker): GameState {
  const newTiles = state.map.tiles.map((row) =>
    row.map((tile) => {
      if (tile.id === from.id) {
        return { ...tile, workers: tile.workers.filter((w) => w.id !== worker.id) };
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
