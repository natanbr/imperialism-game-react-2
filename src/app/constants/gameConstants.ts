/**
 * Game configuration constants
 * Single source of truth for all game values
 */

import { ResourceType } from "@/types/Resource";
import { WorkerType } from "@/types/Workers";
import { TerrainType } from "@/types/Tile";

/**
 * Tile rendering configuration
 */
export const TILE_CONFIG = {
  SIZE: 100,
  ROW_SHIFT: 50,
  BORDER_NORMAL: 1,
  BORDER_SELECTED: 3,
} as const;

/**
 * Time configuration
 */
export const TIME_CONFIG = {
  TURNS_PER_YEAR: 4,
  STARTING_YEAR: 1900,
  STARTING_TURN: 1,
} as const;

/**
 * Resource monetary values
 */
export const RESOURCE_VALUES: Record<ResourceType, number> = {
  [ResourceType.Grain]: 10,
  [ResourceType.Livestock]: 20,
  [ResourceType.Fish]: 15,
  [ResourceType.Fruit]: 12,
  [ResourceType.Timber]: 25,
  [ResourceType.Cotton]: 30,
  [ResourceType.Wool]: 35,
  [ResourceType.Horses]: 40,
  [ResourceType.Coal]: 40,
  [ResourceType.IronOre]: 50,
  [ResourceType.Gold]: 100,
  [ResourceType.Gems]: 1000,
  [ResourceType.Oil]: 75,
} as const;

/**
 * Worker type icons
 */
export const WORKER_ICONS: Record<WorkerType, string> = {
  [WorkerType.Prospector]: "👁️",
  [WorkerType.Farmer]: "🚜",
  [WorkerType.Miner]: "⛏️",
  [WorkerType.Rancher]: "🐄",
  [WorkerType.Forester]: "🌲",
  [WorkerType.Driller]: "🛢️",
  [WorkerType.Engineer]: "🔧",
  [WorkerType.Developer]: "👷",
} as const;

/**
 * Terrain type colors
 */
export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.Capital]: "#8B4513",
  [TerrainType.Town]: "#A0522D",
  [TerrainType.DryPlains]: "#F0E68C",
  [TerrainType.Farm]: "#90EE90",
  [TerrainType.Plantation]: "#9ACD32",
  [TerrainType.Orchard]: "#FFB6C1",
  [TerrainType.OpenRange]: "#F5DEB3",
  [TerrainType.HorseRanch]: "#DEB887",
  [TerrainType.FertileHills]: "#BDB76B",
  [TerrainType.HardwoodForest]: "#228B22",
  [TerrainType.ScrubForest]: "#556B2F",
  [TerrainType.BarrenHills]: "#A0522D",
  [TerrainType.Mountains]: "#696969",
  [TerrainType.Swamp]: "#556B2F",
  [TerrainType.Desert]: "#F4A460",
  [TerrainType.Tundra]: "#E0E0E0",
  [TerrainType.Water]: "#4682B4",
  [TerrainType.River]: "#5F9EA0",
  [TerrainType.Coast]: "#87CEEB",
} as const;

/**
 * Resource type icons
 */
export const RESOURCE_ICONS: Record<ResourceType, string> = {
  [ResourceType.Grain]: "🌾",
  [ResourceType.Livestock]: "🐄",
  [ResourceType.Fish]: "🐟",
  [ResourceType.Fruit]: "🍎",
  [ResourceType.Timber]: "🪵",
  [ResourceType.Cotton]: "🌿",
  [ResourceType.Wool]: "🐑",
  [ResourceType.Horses]: "🐴",
  [ResourceType.Coal]: "⚫",
  [ResourceType.IronOre]: "🪨",
  [ResourceType.Gold]: "🟡",
  [ResourceType.Gems]: "💎",
  [ResourceType.Oil]: "🛢️",
} as const;

/**
 * Development configuration
 */
export const DEVELOPMENT_CONFIG = {
  MAX_RESOURCE_LEVEL: 3,
  MIN_RESOURCE_LEVEL: 0,
  PROSPECT_TURNS: 2,
  DEVELOP_TURNS_BASE: 3,
} as const;

/**
 * Construction configuration
 */
export const CONSTRUCTION_CONFIG = {
  DEPOT_BUILD_TURNS: 4,
  PORT_BUILD_TURNS: 6,
  FORT_BUILD_TURNS: 5,
  RAILROAD_BUILD_TURNS: 3,
  MAX_FORT_LEVEL: 3,
} as const;
