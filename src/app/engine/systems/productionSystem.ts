// Phase 3 of the turn, industrial production (rules 01 section 1, rules 05; FR-037 to FR-039,
// FR-041). Everything made here is usable next turn.
import type { GameState } from "@/types/GameState";
import type { BuildingType, IndustryBuilding, IndustryState, ProductionOutput, WorkerGrade } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import { MaterialType } from "@/types/Resource";
import { BUILDING_ORDER, BUILDINGS } from "@/definisions/industryBuildings";
import { FREIGHT_CAR_COST, RECIPES, TRAINED_TO } from "@/definisions/ResourceConversions";
import type { Recipe } from "@/definisions/RecipeTypes";
import { labourTotal } from "../industry/labour";
import type { TurnContext, TurnSystem } from "../turn/context";

type Stock = Record<string, number>;

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
 * One nation's production. The working copy of the warehouse (`stock`) loses inputs as each
 * building runs; outputs are added only at the end, so nothing made this turn is used this turn.
 */
function produceNation(nation: Nation, ctx: TurnContext): Nation {
  const industry = nation.industry;
  const stock: Stock = { ...(nation.warehouse as Stock) };
  let labour = labourTotal(industry);

  // Freight cars first: their lumber and steel were paid when ordered (FR-039).
  const ordered = Math.max(0, Math.floor(nation.transportCapacityPendingIncrease ?? 0));
  const cars = Math.min(ordered, Math.floor(labour / FREIGHT_CAR_COST.labour));
  labour -= cars * FREIGHT_CAR_COST.labour;
  const unbuilt = ordered - cars;
  stock[MaterialType.Lumber] = (stock[MaterialType.Lumber] ?? 0) + unbuilt * FREIGHT_CAR_COST.lumber;
  stock[MaterialType.Steel] = (stock[MaterialType.Steel] ?? 0) + unbuilt * FREIGHT_CAR_COST.steel;
  if (cars > 0) ctx.emit({ type: "freight-cars-built", nationId: nation.id, count: cars });

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
      room -= batches * recipe.batch;
      made[output] = (made[output] ?? 0) + batches * recipe.batch;
    }
  }

  for (const [output, amount] of Object.entries(made) as [ProductionOutput, number][]) {
    stock[output] = (stock[output] ?? 0) + amount;
    ctx.emit({ type: "goods-produced", nationId: nation.id, output, amount });
  }

  // The built cars wait in the pending count; promoteFreightCars puts them in service after every
  // phase, so this turn's shipping uses the old capacity (FR-101, NR-016).
  return {
    ...nation,
    warehouse: stock as Nation["warehouse"],
    transportCapacityPendingIncrease: cars,
    industry: promoteTrainees(nation.id, { ...industry, buildings: finishBuildings(nation.id, industry, ctx) }, ctx),
  };
}

/** Expansions ordered this turn take effect; food processing forgets its orders (FR-033, FR-038). */
function finishBuildings(nationId: string, industry: IndustryState, ctx: TurnContext): IndustryState["buildings"] {
  const buildings: Partial<Record<BuildingType, IndustryBuilding>> = {};
  for (const [name, building] of Object.entries(industry.buildings) as [BuildingType, IndustryBuilding | undefined][]) {
    if (!building) continue;
    const def = BUILDINGS[name];
    const capacity = building.capacity + building.pendingCapacity;
    if (building.pendingCapacity > 0) ctx.emit({ type: "building-expanded", nationId, building: name, capacity });
    buildings[name] = { capacity, pendingCapacity: 0, orders: def?.keepsOrders === false ? {} : building.orders };
  }
  return buildings;
}

/** Trainees finished their turn of training and move up one grade (FR-041). */
function promoteTrainees(nationId: string, industry: IndustryState, ctx: TurnContext): IndustryState {
  const workers = { ...industry.workers };
  for (const from of ["untrained", "trained"] as const) {
    const count = Math.min(industry.training[from], workers[from]);
    if (count <= 0) continue;
    const to: WorkerGrade = TRAINED_TO[from];
    workers[from] -= count;
    workers[to] += count;
    ctx.emit({ type: "workers-trained", nationId, to: TRAINED_TO[from], count });
  }
  return { ...industry, workers, training: { untrained: 0, trained: 0, expert: 0 } };
}

export const productionSystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState => ({
  ...state,
  nations: state.nations.map((nation) => produceNation(nation, ctx)),
});
