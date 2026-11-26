// The numbers of the M18j Developer rules (rules 03 section 5, rules 07 sections 3 and 7.1; gaps C3, F15, H15).
import { ResourceType } from "@/types/Resource";
import { TerrainType } from "@/types/Tile";

/**
 * FR-629 (inferred, owner to confirm): the relation level with an independent Minor Nation, holding an embassy there,
 * that brings a Great Power its one Developer. Level 6 is 60 points, the grey swatch, shown as "level 7 of 9".
 */
export const DEVELOPER_UNLOCK_LEVEL = 6;

/** FR-632: a tile costs this many times one unit of its commodity (rules 03 section 5, rules 07: "20 x the last price"). */
export const LAND_PRICE_MULTIPLE = 20;

/** FR-631: the resources a Developer may buy; never food (grain, fruit, livestock, fish) or horses. */
export const BUYABLE_LAND_RESOURCES: readonly ResourceType[] = [
  ResourceType.Gold,
  ResourceType.Gems,
  ResourceType.Coal,
  ResourceType.IronOre,
  ResourceType.Cotton,
  ResourceType.Wool,
  ResourceType.Timber,
  ResourceType.Oil,
];

/** FR-631: the terrains a Developer may buy. */
export const BUYABLE_LAND_TERRAINS: readonly TerrainType[] = [
  TerrainType.HardwoodForest,
  TerrainType.ScrubForest,
  TerrainType.FertileHills,
  TerrainType.BarrenHills,
  TerrainType.Mountains,
  TerrainType.Plantation,
  TerrainType.Desert,
  TerrainType.Tundra,
  TerrainType.Swamp,
];

/**
 * FR-636 (inferred, owner to confirm; gaps F15, H15): the percent of a developed unit's value the holder receives, by its
 * relation level 0 to 8 with the Minor Nation. 75% at the unlock level follows the ledger sums; the curve is inferred.
 */
export const OVERSEAS_SHARE_BY_LEVEL: readonly number[] = [15, 25, 35, 45, 55, 65, 75, 90, 100];

/** FR-636 (inferred, F15): the holder's own colony pays it all of the value. */
export const COLONY_OVERSEAS_SHARE = 100;
