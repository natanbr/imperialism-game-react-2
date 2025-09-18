import { GameMap, MapStyle } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";

const width = 15;
const height = 15;

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

export const mockMap: GameMap = {
  config: { width, height, style: MapStyle.SquareGrid },
  tiles: Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const terrain = terrains[(x + y) % terrains.length];
      return {
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
        workers: [],
        explored: true,
        visible: true,
      } as Tile;
    })
  ),
};