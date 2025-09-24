import { GameMap, MapStyle } from "@/types/Map";
import { ResourceType } from "@/types/Resource";
import { TerrainType, Tile } from "@/types/Tile";

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
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
          nationId: "nation-1",
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
          type: WorkerType.Prospector,
          assignedTileId: `${x}-${y}`,
          efficiency: 100
        }];
      }
<<<<<<< HEAD
      const tile: Tile = {
=======
<<<<<<< HEAD
      const tile: Tile = {
=======
<<<<<<< HEAD
      const tile: Tile = {
=======
      return {
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
        id: `${x}-${y}`,
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
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
      };

      if (x < 5 && y < 5) {
        tile.ownerNationId = 'red-empire';
      }

      return tile;
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
=======
      } as Tile;
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
    })
  ),
};
