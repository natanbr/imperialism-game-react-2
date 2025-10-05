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
  console.log("Evaluating prospector actions for worker:", worker.id, "on tile:", tile.id);
  console.log("worker.status:", worker.status);
  console.log("worker.status !== WorkerStatus.Available:", worker.status !== WorkerStatus.Available);
  console.log("tile.ownerNationId:", tile.ownerNationId);
  console.log("worker.nationId:", worker.nationId);
  console.log("PROSPECTABLE_TERRAIN_TYPES.includes(tile.terrain):", PROSPECTABLE_TERRAIN_TYPES.includes(tile.terrain));
  console.log("!tile.resource?.discovered:", !tile.resource?.discovered, "!tile.prospecting:", !tile.prospecting);

  if (worker.status !== WorkerStatus.Available) return null;
  if (tile.ownerNationId !== worker.nationId) return null;
  console.log("Checking prospector actions for tile:", tile.id, "with terrain:", tile.terrain, "and resource:", tile.resource);
  if (PROSPECTABLE_TERRAIN_TYPES.includes(tile.terrain) && !tile.resource?.discovered && !tile.prospecting) {
    console.log("Returning prospect action");
    
    return { type: "prospect" };
  }
  return null;
}
