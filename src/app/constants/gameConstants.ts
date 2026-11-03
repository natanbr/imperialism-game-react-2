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
 * Time configuration: a random world starts in Spring 1815, one turn per season (FR-027). A v1
 * game lasts TURN_LIMIT turns, to Winter 1824 (FR-068; decision Q12, the original runs to 1915).
 */
export const TIME_CONFIG = {
  TURNS_PER_YEAR: 4,
  STARTING_YEAR: 1815,
  STARTING_TURN: 1,
  TURN_LIMIT: 40,
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
  [TerrainType.Capital]: "#ffffffff",
  [TerrainType.Town]: "#ffffffff",
  [TerrainType.DryPlains]: "#F0E68C",
  [TerrainType.Farm]: "#9fff0fff",
  [TerrainType.Plantation]: "#32cd44ff",
  [TerrainType.Orchard]: "#ff4c4cff",
  [TerrainType.OpenRange]: "#ad9a76ff",
  [TerrainType.HorseRanch]: "#5f4019ff",
  [TerrainType.FertileHills]: "#b29db9ff",
  [TerrainType.HardwoodForest]: "#228B22",
  [TerrainType.ScrubForest]: "#426b2fff",
  [TerrainType.BarrenHills]: "#8b653bff",
  [TerrainType.Mountains]: "#60472dff",
  [TerrainType.Swamp]: "#585b52ff",
  [TerrainType.Desert]: "#e6e15cff",
  [TerrainType.Tundra]: "#dbfbbfff",
  [TerrainType.Water]: "#0c538dff",
  [TerrainType.River]: "#28e9f0ff",
  [TerrainType.Coast]: "#7daabcff",
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
 * Development configuration. Job durations live only in `definisions/workerDurations.ts` (FR-028).
 */
export const DEVELOPMENT_CONFIG = {
  MAX_RESOURCE_LEVEL: 3,
  MIN_RESOURCE_LEVEL: 0,
} as const;

/**
 * Construction configuration. Job durations live only in `definisions/workerDurations.ts` (FR-028).
 */
export const CONSTRUCTION_CONFIG = {
  MAX_FORT_LEVEL: 3,
} as const;
