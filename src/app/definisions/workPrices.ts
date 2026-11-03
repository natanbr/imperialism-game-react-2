// Job prices, charged when the job is ordered (FR-029). Sources: docs/rules/03 section 3 and
// docs/rules/04 section 2.
import { TerrainType } from "../types/Tile";

/** [NEEDS CLARIFICATION] gaps.md A4: the prospecting price is not documented; default $100. */
export const PROSPECT_COST = 100;

export const DEVELOPMENT_COST: Record<1 | 2 | 3, number> = {
  1: 100,
  2: 1000,
  3: 5000,
};

/** Base prices. Rail is the flat-land price (`constructionCost` adds the terrain); fort is level 1. */
export const CONSTRUCTION_COST: Record<"rail" | "depot" | "port" | "fort", number> = {
  rail: 100,
  depot: 2000,
  port: 3000,
  fort: 5000,
};

/** Fort levels 2 and 3 need technology (Bessemer Converter, Large Artillery) that v1 lacks. */
export const FORT_LEVEL_COST: Record<1 | 2 | 3, number> = { 1: 5000, 2: 7500, 3: 10000 };

/**
 * Rail by the terrain of the tile it is built on: $100 on flat land, $150 on tundra and either
 * forest, $200 on hills, $300 on swamp. [NEEDS CLARIFICATION] gaps.md B3: mountains are not
 * documented; default $300.
 */
const RAIL_COST_BY_TERRAIN: Partial<Record<TerrainType, number>> = {
  [TerrainType.Tundra]: 150,
  [TerrainType.HardwoodForest]: 150,
  [TerrainType.ScrubForest]: 150,
  [TerrainType.BarrenHills]: 200,
  [TerrainType.FertileHills]: 200,
  [TerrainType.Swamp]: 300,
  [TerrainType.Mountains]: 300,
};

/** What a construction job of this kind costs on a tile of this terrain. */
export function constructionCost(kind: keyof typeof CONSTRUCTION_COST, terrain: TerrainType): number {
  if (kind === "rail") return RAIL_COST_BY_TERRAIN[terrain] ?? CONSTRUCTION_COST.rail;
  return CONSTRUCTION_COST[kind];
}
