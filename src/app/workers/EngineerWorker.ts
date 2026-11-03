import { areTilesAdjacent, canBuildRailAt } from "@/engine/map/mapHelpers";
import { tryApplyOrder } from "@/engine/orders/apply";
import { isPortSite } from "@/engine/orders/queries";
import { GameState } from "../types/GameState";
import { GameMap } from "../types/Map";
import { TerrainType, Tile } from "../types/Tile";
import { Worker, WorkerStatus, WorkerType } from "../types/Workers";
import { ConstructionKind } from "../types/jobs/ConstructionJob";
import { PossibleAction } from "../types/actions";
import { startEachWorker } from "./startEachWorker";

/** The pre-M1 automatic choice; a port is only picked where a port may stand (FR-009). */
function pickConstructionKind(state: GameState, worker: Worker, tile: Tile): ConstructionKind | undefined {
  if (tile.constructionJob) return undefined;
  if (!tile.depot) return "depot";
  if (!tile.port && isPortSite(state, tile)) return "port";
  if ((tile.fortLevel ?? 0) < 3) return "fort";
  if (canBuildRailAt(state.map, tile.x, tile.y, worker.nationId)) return "rail";
  return undefined;
}

/**
 * Starts construction for `workerId` only (without an id, for every available engineer),
 * picking the kind automatically. To build a chosen kind, use a startConstruction order.
 */
export function startEngineerWork(state: GameState, workerId?: string): GameState {
  return startEachWorker(state, WorkerType.Engineer, workerId, (s, worker, tile) => {
    const structure = pickConstructionKind(s, worker, tile);
    if (!structure) return undefined;
    return { kind: "startConstruction", nationId: worker.nationId, workerId: worker.id, tileId: tile.id, structure };
  });
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
 * Engineer rail-on-move, now a moveAndBuildRail order (FR-008, FR-017).
 * Returns null when the move is not a rail move, or when the rail is refused for a reason other
 * than money, so the caller falls back to the plain (also validated) move. A rail the nation
 * cannot afford refuses the whole move, as before: the unchanged state is returned.
 */
export function handleEngineerMovement(
  state: GameState,
  fromTile: Tile,
  toTile: Tile,
  worker: Worker
): GameState | null {
  const isAdjacent = areTilesAdjacent(state.map, fromTile.x, fromTile.y, toTile.x, toTile.y);
  const canBuildRail = canBuildRailAt(state.map, toTile.x, toTile.y, worker.nationId);
  if (!isAdjacent || !canBuildRail) return null;

  const { state: next, result } = tryApplyOrder(state, {
    kind: "moveAndBuildRail",
    nationId: worker.nationId,
    workerId: worker.id,
    toTileId: toTile.id,
  });
  if (result.ok) return next;
  return result.reason === "insufficient-funds" ? state : null;
}
