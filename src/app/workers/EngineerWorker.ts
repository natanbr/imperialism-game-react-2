import { GameMap } from "../types/Map";
import { TerrainType, Tile } from "../types/Tile";
import { Worker, WorkerStatus } from "../types/Workers";
import { PossibleAction } from "../types/actions";
import { hasJob, isFortSite } from "../engine/orders/queries";

/**
 * The action an engineer offers on a tile (the map cursor and click). Rail is not offered here:
 * it is built by moving the engineer next to its network (see hooks/tileClickOrders.ts).
 */
export function getEngineerActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
  if (worker.status !== WorkerStatus.Available) return null;
  if (tile.ownerNationId !== worker.nationId) return null;
  if (!hasJob(tile)) {
    // A fort only in a capital or a town, and only where one can be built (FR-378): a capital holds its level-1 fort
    // (fortLevelOf) and only level 1 can be built, so a click on the capital reaches the rail orders (moveOrders)
    if ((tile.terrain === TerrainType.Capital || tile.terrain === TerrainType.Town) && isFortSite(tile)) {
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
