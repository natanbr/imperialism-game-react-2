import { Tile } from "../types/Tile";
import { Worker, WorkerStatus } from "../types/Workers";
import { GameMap } from "../types/Map";
import { PossibleAction } from "../types/actions";
import { hasJob } from "../engine/orders/queries";
import { PROSPECTABLE_TERRAIN_TYPES } from "../definisions/terrainDefinitions";

/** The action a prospector offers on a tile (the map cursor and click). */
export function getProspectorActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
  if (worker.status !== WorkerStatus.Available) return null;
  if (tile.ownerNationId !== worker.nationId) return null;
  if (PROSPECTABLE_TERRAIN_TYPES.includes(tile.terrain) && !tile.resource?.discovered && !hasJob(tile)) {
    return { type: "prospect" };
  }
  return null;
}
