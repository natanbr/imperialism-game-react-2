import { GameState } from "../types/GameState";
import { Tile } from "../types/Tile";
import { Worker, WorkerStatus } from "../types/Workers";
import { GameMap } from "../types/Map";
import { PossibleAction } from "../types/actions";
import { PROSPECTABLE_TERRAIN_TYPES } from "../definisions/terrainDefinitions";

export function startProspectorWork(state: GameState): GameState {
  let updated = false;
  const newTiles = state.map.tiles.map(row =>
    row.map(tile => {
      if (!tile.workers) return tile;
      const worker = tile.workers.find(w => w.type === "prospector" && w.status === WorkerStatus.Available);
      if (!worker) return tile;
      if (!tile.resource || tile.resource.discovered) return tile;
      if (tile.prospecting) return tile;
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

export function getProspectorActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
  if (worker.status !== WorkerStatus.Available) return null;
  if (tile.ownerNationId !== worker.nationId) return null;
  if (PROSPECTABLE_TERRAIN_TYPES.includes(tile.terrain) && !tile.resource?.discovered && !tile.prospecting) {
    return { type: "prospect" };
  }
  return null;
}
