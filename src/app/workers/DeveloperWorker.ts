import { Tile, TerrainType } from "../types/Tile";
import { Worker, WorkerType, WorkerStatus } from "../types/Workers";
import { GameMap } from "../types/Map";
import { PossibleAction } from "../types/actions";
import { FARMING_TERRAINS, RANCHING_TERRAINS, FORESTRY_TERRAINS, MINING_TERRAINS, DRILLING_TERRAINS } from "../definisions/terrainDefinitions";

const terrainMap: Record<WorkerType, TerrainType[]> = {
  [WorkerType.Prospector]: [],
  [WorkerType.Engineer]: [],
  [WorkerType.Farmer]: FARMING_TERRAINS,
  [WorkerType.Rancher]: RANCHING_TERRAINS,
  [WorkerType.Forester]: FORESTRY_TERRAINS,
  [WorkerType.Miner]: MINING_TERRAINS,
  [WorkerType.Driller]: DRILLING_TERRAINS,
  [WorkerType.Developer]: [],
};

export function getDeveloperActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null {
  if (worker.status !== WorkerStatus.Available) return null;
  if (tile.ownerNationId !== worker.nationId) return null;
  if (!tile.developmentJob) {
    const targetLevel = (tile.resource?.level || 0) + 1;
    if (targetLevel > 3) return null;
    if (terrainMap[worker.type]?.includes(tile.terrain)) {
      return { type: "develop", workerType: worker.type, level: targetLevel as 1 | 2 | 3 };
    }
  }
  return null;
}
