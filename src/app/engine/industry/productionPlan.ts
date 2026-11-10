// What the production phase will make (FR-116): the one computation the phase, the labour count,
// the order validation and the capital dialog share, so none of them can show or allow more than the
// nation really makes. Pure: the nation is only read.
import type { ProductionOutput } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import { MaterialType } from "@/types/Resource";
import { BUILDING_ORDER, BUILDINGS } from "@/definisions/industryBuildings";
import { FREIGHT_CAR_COST, RECIPES } from "@/definisions/ResourceConversions";
import type { Recipe } from "@/definisions/RecipeTypes";
import { labourTotal } from "./labour";

type Stock = Record<string, number>;

export interface Labour {
  /** Labour of the healthy workers not in training. */
  total: number;
  /** Labour the production phase will use: this turn's freight cars and what the standing orders really make (FR-117). */
  committed: number;
  free: number;
}

export interface ProductionPlan {
  /** Freight cars built, of those ordered this turn (first, while the labour lasts). */
  cars: number;
  /** Units made per output. */
  made: Partial<Record<ProductionOutput, number>>;
  /** Labour the cars and the buildings use. */
  labourUsed: number;
  /** The warehouse once the inputs are taken and the unbuilt cars' lumber and steel are back; outputs not added. */
  stock: Stock;
}

/** How many batches the stock allows. */
const batchesInStock = (stock: Stock, recipe: Recipe): number =>
  Math.min(...recipe.inputs.map((input) => Math.floor(input.types.reduce((sum, t) => sum + (stock[t] ?? 0), 0) / input.amount)));

/** Takes the inputs of `batches` batches; a mixed input is taken from the larger stock first. */
function takeInputs(stock: Stock, recipe: Recipe, batches: number): void {
  for (const input of recipe.inputs) {
    let remaining = batches * input.amount;
    const byStock = [...input.types].sort((a, b) => (stock[b] ?? 0) - (stock[a] ?? 0));
    for (const type of byStock) {
      const take = Math.min(stock[type] ?? 0, remaining);
      stock[type] = (stock[type] ?? 0) - take;
      remaining -= take;
    }
  }
}

/**
 * The production phase on this nation (FR-037): the freight cars ordered are built first, then each
 * building in production order makes min(order, capacity left, what the stock allows, what the labour
 * left allows). A standing order whose inputs run short makes as much as they allow (FR-116).
 * `labour` replaces the nation's labour (validation asks with Infinity whether the stock alone is short).
 */
export function planProduction(nation: Nation, { labour: labourGiven }: { labour?: number } = {}): ProductionPlan {
  const industry = nation.industry;
  const stock: Stock = { ...(nation.warehouse as Stock) };
  let labour = labourGiven ?? labourTotal(industry);
  let used = 0;

  // Freight cars first: their lumber and steel were paid when ordered (FR-039).
  const ordered = Math.max(0, Math.floor(nation.transportCapacityPendingIncrease ?? 0));
  const cars = Math.min(ordered, Math.floor(labour / FREIGHT_CAR_COST.labour));
  labour -= cars * FREIGHT_CAR_COST.labour;
  used += cars * FREIGHT_CAR_COST.labour;
  const unbuilt = ordered - cars;
  stock[MaterialType.Lumber] = (stock[MaterialType.Lumber] ?? 0) + unbuilt * FREIGHT_CAR_COST.lumber;
  stock[MaterialType.Steel] = (stock[MaterialType.Steel] ?? 0) + unbuilt * FREIGHT_CAR_COST.steel;

  const made: Partial<Record<ProductionOutput, number>> = {};
  for (const name of BUILDING_ORDER) {
    const building = industry.buildings[name];
    if (!building) continue;
    const def = BUILDINGS[name];
    let room = def.unlimited ? Infinity : building.capacity;
    for (const output of def.outputs) {
      const recipe = RECIPES[output];
      const wanted = Math.min(building.orders[output] ?? 0, room);
      const batches = Math.min(Math.floor(wanted / recipe.batch), Math.floor(labour / recipe.labour), batchesInStock(stock, recipe));
      if (batches <= 0) continue;
      takeInputs(stock, recipe, batches);
      labour -= batches * recipe.labour;
      used += batches * recipe.labour;
      room -= batches * recipe.batch;
      made[output] = (made[output] ?? 0) + batches * recipe.batch;
    }
  }
  return { cars, made, labourUsed: used, stock };
}

/**
 * Total, committed and free labour (FR-035, FR-117). Committed is what the production plan uses, so
 * a standing order that cannot run for lack of inputs commits nothing and blocks no other order.
 */
export function labourOf(nation: Nation): Labour {
  const total = labourTotal(nation.industry);
  const committed = planProduction(nation).labourUsed;
  return { total, committed, free: total - committed };
}
