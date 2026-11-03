// Types of the industry rule tables (`ResourceConversions.ts`, `industryBuildings.ts`).
import type { BuildingType, ProductionOutput } from "../types/Industry";
import type { WarehouseCommodities } from "../types/Resource";

/** `amount` units of any mix of `types` (cotton or wool; livestock or fish). */
export interface RecipeInput {
  types: readonly WarehouseCommodities[];
  amount: number;
}

/** One batch: the inputs and labour that make `batch` units of the output (FR-034). */
export interface Recipe {
  building: BuildingType;
  batch: number;
  labour: number;
  inputs: readonly RecipeInput[];
}

export type BuildingKind = "mill" | "factory";

export interface BuildingDefinition {
  /** Mills grow 2, 4, 8, 16, 24 then +8; factories 1, 2, 4, 8, 12 then +4. */
  kind: BuildingKind;
  /** What it makes; the first is the default output of a production order. */
  outputs: readonly ProductionOutput[];
  /** No capacity limit (food processing). */
  unlimited: boolean;
  /** Standing orders are kept between turns (all but food processing). */
  keepsOrders: boolean;
  /** Can only be built after Oil Drilling (the refinery). */
  needsOilDrilling: boolean;
  /** Built at its first size in a new game (the six mills and factories, gaps.md A6). */
  builtAtStart: boolean;
}
