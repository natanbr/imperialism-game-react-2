import { EngineerBuildDurationsTurns } from "../definisions/workerDurations";
import { areTilesAdjacent, canBuildRailAt } from "../store/helpers/mapHelpers";
import { GameState } from "../types/GameState";
import { GameMap } from "../types/Map";
import { TerrainType, Tile } from "../types/Tile";
import { Worker, WorkerStatus } from "../types/Workers";
import { PossibleAction } from "../types/actions";

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
    // Fort can only be built in capital or city
    if ((tile.terrain === TerrainType.Capital || tile.terrain === TerrainType.Town) && (tile.fortLevel ?? 0) < 3) {
      return { type: "construct", kind: "fort" };
    }
    // For depot and port, open modal to let user choose
    // (Rails are built automatically when engineer moves to adjacent tile)
    const isLand = tile.terrain !== TerrainType.Water;
    if (isLand && tile.terrain !== TerrainType.Capital && !tile.depot && !tile.port) {
      return { type: "open-construct-modal" };
    }
  }
  return null;
}

/**
 * Handles engineer-specific movement logic.
 * If moving to an adjacent tile where rail can be built, automatically starts rail construction.
 * Otherwise, returns null to indicate normal movement should be used.
 */
export function handleEngineerMovement(
  state: GameState,
  fromTile: Tile,
  toTile: Tile,
  worker: Worker
): GameState | null {
  const isAdjacent = areTilesAdjacent(state.map, fromTile.x, fromTile.y, toTile.x, toTile.y);
  const canBuildRail = canBuildRailAt(state.map, toTile.x, toTile.y, worker.nationId);

  // If moving to adjacent tile and can build rail, handle it specially
  if (isAdjacent && canBuildRail) {
    const durationTurns = EngineerBuildDurationsTurns.rail || 1;
    const startedOnTurn = state.turn;

    // Remove worker from source tile
    const newTilesStep1 = state.map.tiles.map((row, y) =>
      row.map((t, x) => {
        if (x === fromTile.x && y === fromTile.y) {
          return { ...t, workers: t.workers.filter(w => w.id !== worker.id) };
        }
        return t;
      })
    );

    // Add worker to destination tile with rail construction job
    const newTilesStep2 = newTilesStep1.map((row, y) =>
      row.map((t, x) => {
        if (x === toTile.x && y === toTile.y) {
          const movedWorker: Worker = {
            ...worker,
            status: WorkerStatus.Working,
            jobDescription: 'Constructing rail',
            assignedTileId: toTile.id,
            previousTileId: fromTile.id,
            justMoved: true,
          };
          return {
            ...t,
            constructionJob: { workerId: worker.id, kind: 'rail' as const, startedOnTurn, durationTurns },
            workers: [...t.workers, movedWorker],
          };
        }
        return t;
      })
    );

    return { ...state, map: { ...state.map, tiles: newTilesStep2 } };
  }

  // Return null to indicate normal movement should be used
  return null;
}
