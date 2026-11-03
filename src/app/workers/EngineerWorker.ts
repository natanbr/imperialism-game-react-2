import { GameMap } from "../types/Map";
import { TerrainType, Tile } from "../types/Tile";
import { Worker, WorkerStatus } from "../types/Workers";
import { PossibleAction } from "../types/actions";

/**
 * The action an engineer offers on a tile (the map cursor and click). Rail is not offered here:
 * it is built by moving the engineer next to its network (see hooks/tileClickOrders.ts).
 */
export function getEngineerActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
  if (worker.status !== WorkerStatus.Available) return null;
  if (tile.ownerNationId !== worker.nationId) return null;
  if (!tile.constructionJob) {
    // Fort can only be built in capital or city
    if ((tile.terrain === TerrainType.Capital || tile.terrain === TerrainType.Town) && (tile.fortLevel ?? 0) < 3) {
      return { type: "construct", kind: "fort" };
    }
    // For depot and port, open modal to let user choose
    const isLand = tile.terrain !== TerrainType.Water;
    if (isLand && tile.terrain !== TerrainType.Capital && !tile.depot && !tile.port) {
      return { type: "open-construct-modal" };
    }
  }
  return null;
}
