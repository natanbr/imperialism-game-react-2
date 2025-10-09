import { GameMap, MapStyle } from "@/types/Map";
import { ResourceType } from "@/types/Resource";
import { TerrainType, Tile } from "@/types/Tile";
import { createTileId } from "@/utils/tileIdUtils";

const cols = 15;
const rows = 15;

const terrains: TerrainType[] = [
  TerrainType.DryPlains,
  TerrainType.Mountains,
  TerrainType.HardwoodForest,
  TerrainType.Swamp,
  TerrainType.Desert,
  TerrainType.Tundra,
  TerrainType.Coast,
  TerrainType.River,
  TerrainType.Town,
  TerrainType.Capital,
];

import { WorkerType, Worker } from "@/types/Workers";

export const mockMap: GameMap = {
  config: { cols, rows, style: MapStyle.SquareGrid },
  tiles: Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const terrain = terrains[(x + y) % terrains.length];
      // Place Prospector on the first Capital tile found
      let workers: Worker[] = [];
      if (x === 7 && y === 7) {
        workers = [{
          id: "prospector-1",
          nationId: "nation-1",
          type: WorkerType.Prospector,
          assignedTileId: createTileId(x, y),
          efficiency: 100
        }];
      }
      return {
        id: createTileId(x, y),
        x,
        y,
        terrain,
        hasRiver: terrain === TerrainType.River,
        resource:
          terrain === TerrainType.DryPlains
            ? { type: ResourceType.Grain, level: 1 }
            : terrain === TerrainType.HardwoodForest
              ? { type: ResourceType.Timber, level: 1 }
              : undefined,
        workers,
        explored: true,
        visible: true,
      } as Tile;
    })
  ),
};
