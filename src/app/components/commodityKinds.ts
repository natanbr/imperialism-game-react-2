// Commodities grouped by kind for the transport popup (FR-134, NR-025), derived from the rule tables so
// a new commodity lands in a group by itself: the foods the workers eat, the other resources a recipe
// takes, the remaining resources, then the materials and the goods.
import { RECIPES } from "@/definisions/ResourceConversions";
import { RAW_FOOD } from "@/engine/systems/foodSystem";
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from "@/types/Resource";

export interface CommodityKind {
  title: string;
  keys: readonly WarehouseCommodities[];
}

const RECIPE_INPUTS: ReadonlySet<string> = new Set(Object.values(RECIPES).flatMap((recipe) => recipe.inputs.flatMap((input) => input.types)));
const isFood = (r: ResourceType) => (RAW_FOOD as readonly ResourceType[]).includes(r);
const RESOURCES = Object.values(ResourceType);

/** Every resource, material and good in exactly one group, each group in the order of its type. */
export const COMMODITY_KINDS: readonly CommodityKind[] = [
  { title: "Food", keys: RESOURCES.filter(isFood) },
  { title: "Raw materials", keys: RESOURCES.filter((r) => !isFood(r) && RECIPE_INPUTS.has(r)) },
  { title: "Other resources", keys: RESOURCES.filter((r) => !isFood(r) && !RECIPE_INPUTS.has(r)) },
  { title: "Materials", keys: Object.values(MaterialType) },
  { title: "Goods", keys: Object.values(GoodsType) },
];
