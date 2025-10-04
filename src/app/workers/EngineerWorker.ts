import { GameState } from "../types/GameState";
import { Tile, TerrainType } from "../types/Tile";
import { Worker, WorkerStatus } from "../types/Workers";
import { GameMap } from "../types/Map";
import { PossibleAction } from "../types/actions";
import { canBuildRailAt } from "../store/helpers/mapHelpers";
import { EngineerBuildDurationsTurns } from "../definisions/workerDurations";

export function startEngineerWork(state: GameState): GameState {
  let updated = false;
  const newTiles = state.map.tiles.map(row =>
    row.map(tile => {
      if (!tile.workers) return tile;
      const worker = tile.workers.find(w => w.type === "engineer" && w.status === WorkerStatus.Available);
      if (!worker) return tile;
      if (tile.constructionJob) return tile;
      let kind: "depot" | "port" | "fort" | "rail" | undefined;
      if (!tile.depot) kind = "depot";
      else if (!tile.port) kind = "port";
      else if ((tile.fortLevel ?? 0) < 3) kind = "fort";
      else if (canBuildRailAt(state.map, tile.x, tile.y, worker.nationId)) kind = "rail";
      if (!kind) return tile;
      const durationTurns = EngineerBuildDurationsTurns[kind] || 1;
      const startedOnTurn = state.turn;
      updated = true;
      return {
        ...tile,
        constructionJob: { workerId: worker.id, kind, startedOnTurn, durationTurns },
        workers: tile.workers.map(w =>
          w.id === worker.id
            ? { ...w, status: WorkerStatus.Working, jobDescription: `Constructing ${kind}` }
            : w
        ),
      };
    })
  );
  return updated ? { ...state, map: { ...state.map, tiles: newTiles } } : state;
}

export function getEngineerActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
  if (worker.status !== WorkerStatus.Available) return null;
  if (tile.ownerNationId !== worker.nationId) return null;
  if (!tile.constructionJob) {
    if ((tile.terrain === TerrainType.Capital || tile.terrain === TerrainType.Town) && (tile.fortLevel ?? 0) < 3) {
      return { type: "construct", kind: "fort" };
    }
    if (canBuildRailAt(map, tile.x, tile.y, worker.nationId)) {
      return { type: "construct", kind: "rail" };
    }
    const isLand = tile.terrain !== TerrainType.Water;
    if (isLand && !tile.depot && !tile.port) {
      return { type: "open-construct-modal" };
    }
  }
  return null;
}
