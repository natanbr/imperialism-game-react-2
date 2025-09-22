import { TerrainType } from "@/types/Tile";

export const PROSPECTABLE_TERRAIN_TYPES = [
  TerrainType.BarrenHills,
  TerrainType.Mountains,
  TerrainType.Swamp,
  TerrainType.Desert,
  TerrainType.Tundra,
];

export const FARMING_TERRAINS = [
  TerrainType.Farm,
  TerrainType.Plantation,
  TerrainType.Orchard,
];

export const RANCHING_TERRAINS = [
  TerrainType.OpenRange,
  TerrainType.FertileHills,
];

export const FORESTRY_TERRAINS = [TerrainType.HardwoodForest];

export const MINING_TERRAINS = [
  TerrainType.BarrenHills,
  TerrainType.Mountains,
];

export const DRILLING_TERRAINS = [
  TerrainType.Swamp,
  TerrainType.Desert,
  TerrainType.Tundra,
];
