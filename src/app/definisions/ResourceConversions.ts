// Industry recipes and worker costs from docs/rules/05 (FR-034, FR-039, FR-041, FR-042).
import type { ProductionOutput, Workers } from "../types/Industry";
import { GoodsType, MaterialType, ResourceType } from "../types/Resource";
import type { Recipe } from "./RecipeTypes";

const one = (type: ResourceType | MaterialType, amount: number) => ({ types: [type], amount });

/**
 * Per batch. "2 labour + 2 input -> 1 product" everywhere, except steel (1 coal + 1 iron) and
 * canned food (4 raw food -> 2 cans). [NEEDS CLARIFICATION] gaps.md B6: a single can for one odd
 * labour unit is not modelled, so canned food runs in batches of 2.
 */
export const RECIPES: Readonly<Record<ProductionOutput, Recipe>> = {
  [MaterialType.Fabric]: { building: "textileMill", batch: 1, labour: 2, inputs: [{ types: [ResourceType.Cotton, ResourceType.Wool], amount: 2 }] },
  [GoodsType.Clothing]: { building: "clothingFactory", batch: 1, labour: 2, inputs: [one(MaterialType.Fabric, 2)] },
  [MaterialType.Lumber]: { building: "lumberMill", batch: 1, labour: 2, inputs: [one(ResourceType.Timber, 2)] },
  [MaterialType.Paper]: { building: "lumberMill", batch: 1, labour: 2, inputs: [one(ResourceType.Timber, 2)] },
  [GoodsType.Furniture]: { building: "furnitureFactory", batch: 1, labour: 2, inputs: [one(MaterialType.Lumber, 2)] },
  [MaterialType.Steel]: { building: "steelMill", batch: 1, labour: 2, inputs: [one(ResourceType.Coal, 1), one(ResourceType.IronOre, 1)] },
  [GoodsType.Hardware]: { building: "metalWorks", batch: 1, labour: 2, inputs: [one(MaterialType.Steel, 2)] },
  [GoodsType.Armaments]: { building: "metalWorks", batch: 1, labour: 2, inputs: [one(MaterialType.Steel, 2)] },
  [MaterialType.Fuel]: { building: "refinery", batch: 1, labour: 2, inputs: [one(ResourceType.Oil, 2)] },
  [MaterialType.CannedFood]: {
    building: "foodProcessing",
    batch: 2,
    labour: 2,
    inputs: [one(ResourceType.Grain, 2), one(ResourceType.Fruit, 1), { types: [ResourceType.Livestock, ResourceType.Fish], amount: 1 }],
  },
};

/** Labour per worker by grade (rules 05 section 4). */
export const LABOUR_PER_WORKER: Readonly<Workers> = { untrained: 1, trained: 2, expert: 4 };

/** Railyard: one freight car (1 unit of transport capacity) costs 1 lumber + 1 steel + 2 labour. */
export const FREIGHT_CAR_COST = { lumber: 1, steel: 1, labour: 2 } as const;

/** Trade School: cash and paper per trainee, by the grade trained from (rules 05 section 4). */
export const TRAINING_COST: Readonly<Record<"untrained" | "trained", { cash: number; paper: number }>> = {
  untrained: { cash: 100, paper: 1 },
  trained: { cash: 1000, paper: 2 },
};

/** The grade a trainee reaches. */
export const TRAINED_TO = { untrained: "trained", trained: "expert" } as const;

/** Capitol: one migrant costs 1 canned food + 1 clothing + 1 furniture, no cash, no labour. */
export const MIGRANT_COST: Readonly<Partial<Record<MaterialType | GoodsType, number>>> = {
  [MaterialType.CannedFood]: 1,
  [GoodsType.Clothing]: 1,
  [GoodsType.Furniture]: 1,
};

/** Expansion: 1 lumber + 1 steel per capacity point added, no labour (rules 05 section 3). */
export const EXPANSION_COST_PER_POINT = { lumber: 1, steel: 1 } as const;
