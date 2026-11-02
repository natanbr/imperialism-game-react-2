import { EngineerBuildDurationsTurns } from "../definisions/workerDurations";
import { areTilesAdjacent, canBuildRailAt } from "../store/helpers/mapHelpers";
import { CONSTRUCTION_COST } from "../definisions/workPrices";
import { createTreasuryLedger } from "../store/helpers/treasuryHelpers";
import { GameState } from "../types/GameState";
import { GameMap } from "../types/Map";
import { TerrainType, Tile } from "../types/Tile";
import { Worker, WorkerStatus } from "../types/Workers";
import { PossibleAction } from "../types/actions";

/**
 * Starts construction for `workerId` only (without an id, for every available engineer),
 * picking the kind automatically. To build a chosen kind, use startConstructionHelper.
 */
export function startEngineerWork(state: GameState, workerId?: string): GameState {
  let updated = false;
  const ledger = createTreasuryLedger(state);
  const newTiles = state.map.tiles.map(row =>
    row.map(tile => {
      if (!tile.workers) return tile;
      const worker = tile.workers.find(w =>
        w.type === "engineer" && w.status === WorkerStatus.Available && (workerId === undefined || w.id === workerId)
      );
      if (!worker) return tile;
      if (tile.constructionJob) return tile;
      let kind: "depot" | "port" | "fort" | "rail" | undefined;
      if (!tile.depot) kind = "depot";
      else if (!tile.port) kind = "port";
      else if ((tile.fortLevel ?? 0) < 3) kind = "fort";
      else if (canBuildRailAt(state.map, tile.x, tile.y, worker.nationId)) kind = "rail";
      if (!kind) return tile;
      if (!ledger.tryCharge(worker.nationId, CONSTRUCTION_COST[kind])) return tile;
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
  return updated ? { ...state, nations: ledger.nationsAfterCharges(), map: { ...state.map, tiles: newTiles } } : state;
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
 * If moving to an adjacent tile where rail can be built, automatically starts rail construction
 * and charges its price; if the nation cannot afford it, returns the unchanged state so the
 * move is refused rather than made for free.
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
    const ledger = createTreasuryLedger(state);
    if (!ledger.tryCharge(worker.nationId, CONSTRUCTION_COST.rail)) return state;

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

    return { ...state, nations: ledger.nationsAfterCharges(), map: { ...state.map, tiles: newTilesStep2 } };
  }

  // Return null to indicate normal movement should be used
  return null;
}
