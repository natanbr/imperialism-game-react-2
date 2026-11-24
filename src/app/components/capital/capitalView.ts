// What the capital dialog shows, derived from the game (FR-046, FR-047). No React, no store: the
// dialog's components render these views and send orders; the engine stays the judge of every order.
import { labourOf, largestOrder, migrantCap, planProduction, type Labour, type ProductionPlan } from "@/engine";
import { BUILDING_ORDER, BUILDINGS, nextCapacity } from "@/definisions/industryBuildings";
import { owns } from "@/engine/orders/queries";
import { acceptsProductionInputs } from "@/engine/industry/productionPlan";
import { EXPANSION_COST_PER_POINT, MIGRANT_COST, RECIPES, TRAINING_COST } from "@/definisions/ResourceConversions";
import type { GameState } from "@/types/GameState";
import type { BuildingType, ProductionOutput, WorkerGrade, Workers } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import { MaterialType, type WarehouseCommodities } from "@/types/Resource";
import { commodityName, money } from "../gameText";

export interface InputView {
  /** The first commodity of the input, used as its id ("cotton" for cotton-or-wool). */
  key: string;
  /** The commodities it may be made from, for their icons (FR-121). */
  types: readonly WarehouseCommodities[];
  /** "2 Cotton or Wool" */
  label: string;
  /** In the warehouse, all its types together. */
  stock: number;
  /** Not enough for one batch. */
  missing: boolean;
}

export interface OutputView {
  output: ProductionOutput;
  name: string;
  acceptsInputs: boolean;
  /** Units per step of the amount control (2 for canned food). */
  batch: number;
  /** The standing order. */
  order: number;
  /** What the production phase will really make of it next (FR-119). */
  planned: number;
  /** The largest order the engine accepts now as a fresh order, never below `planned` (FR-119). */
  max: number;
  /** Why the standing order is above the plan, or null when the plan makes all of it. */
  short: "inputs" | "labour" | null;
  inputs: InputView[];
}

export interface ExpansionView {
  to: number;
  lumber: number;
  steel: number;
}

export interface BuildingCardView {
  building: BuildingType;
  unlimited: boolean;
  capacity: number;
  pendingCapacity: number;
  outputs: OutputView[];
  expansion: ExpansionView | null;
}

type Stock = Record<string, number>;

interface Plans {
  /** The production phase as ordered. */
  real: ProductionPlan;
  /** The same with unlimited labour: only the stock and the capacity limit it. */
  stockOnly: ProductionPlan;
}

function outputView(nation: Nation, plans: Plans, building: BuildingType, output: ProductionOutput): OutputView {
  const recipe = RECIPES[output];
  const acceptsInputs = acceptsProductionInputs(nation, building);
  const stock = nation.warehouse as Stock;
  const order = nation.industry.buildings[building]?.orders[output] ?? 0;
  const planned = plans.real.made[output] ?? 0;
  const max = Math.max(planned, largestOrder(nation, building, output));
  const short = order <= planned ? null : (plans.stockOnly.made[output] ?? 0) < order ? "inputs" : "labour";
  const inputs = recipe.inputs.map((input): InputView => {
    const inStock = input.types.reduce((sum, type) => sum + (stock[type] ?? 0), 0);
    return {
      key: input.types[0],
      types: input.types as readonly WarehouseCommodities[],
      label: `${input.amount} ${input.types.map(commodityName).join(" or ")}`,
      stock: inStock,
      missing: !acceptsInputs || inStock < input.amount,
    };
  });
  return {
    output,
    name: commodityName(output),
    acceptsInputs,
    batch: recipe.batch,
    order,
    planned,
    max,
    short,
    inputs,
  };
}

function expansionView(building: BuildingType, capacity: number, pending: number): ExpansionView | null {
  const def = BUILDINGS[building];
  if (def.unlimited) return null;
  const from = capacity + pending;
  const to = nextCapacity(def.kind, from);
  const points = to - from;
  return { to, lumber: points * EXPANSION_COST_PER_POINT.lumber, steel: points * EXPANSION_COST_PER_POINT.steel };
}

const isShown = (state: GameState, nationId: string, building: BuildingType, size: number): boolean => {
  const def = BUILDINGS[building];
  if (def.needsOilDrilling) return owns(state, nationId, "oilDrilling");
  return def.unlimited || size > 0;
};

/** One card per built production building, in production order. */
export function productionCards(state: GameState, nation: Nation): BuildingCardView[] {
  const plans: Plans = { real: planProduction(nation), stockOnly: planProduction(nation, { labour: Infinity }) };
  return BUILDING_ORDER.flatMap((building) => {
    const { capacity = 0, pendingCapacity = 0 } = nation.industry.buildings[building] ?? {};
    if (!isShown(state, nation.id, building, capacity + pendingCapacity)) return [];
    const def = BUILDINGS[building];
    return [{
      building,
      unlimited: def.unlimited,
      capacity,
      pendingCapacity,
      outputs: def.outputs.map((output) => outputView(nation, plans, building, output)),
      expansion: expansionView(building, capacity, pendingCapacity),
    }];
  });
}

export interface GradeView {
  grade: WorkerGrade;
  count: number;
  sick: number;
  training: number;
}

export interface LabourView {
  labour: Labour;
  grades: GradeView[];
  recruits: number;
  recruitCap: number;
  carsOrdered: number;
}

const GRADES: readonly WorkerGrade[] = ["untrained", "trained", "expert"];

export function labourView(state: GameState, nation: Nation): LabourView {
  const { workers, sick, training, recruits } = nation.industry;
  const of = (w: Workers, grade: WorkerGrade) => w[grade] ?? 0;
  return {
    labour: labourOf(nation),
    grades: GRADES.map((grade) => ({ grade, count: of(workers, grade), sick: of(sick, grade), training: of(training, grade) })),
    recruits,
    recruitCap: migrantCap(state, nation.id),
    carsOrdered: Math.max(0, nation.transportCapacityPendingIncrease ?? 0),
  };
}

/** FR-572: one cost of a Trade School action, as an industry card shows an input: what one more needs and what we hold. */
export interface CostView {
  /** "paper", "cannedFood", or "cash". */
  key: string;
  /** The goods pictures (FR-331); none for cash. */
  types: readonly WarehouseCommodities[];
  /** "Paper: 1 needed, 5 in warehouse", "Cash: $100 needed, $10,000 in treasury". */
  text: string;
  /** Less than one more needs. */
  missing: boolean;
}

/** FR-572: the Trade School's actions, training (FR-047) and, merged from the Capitol, recruiting a migrant. */
export type SchoolAction = "untrained" | "trained" | "migrant";

const goodsCost = (stock: Stock, key: WarehouseCommodities, needed: number): CostView => {
  const have = stock[key] ?? 0;
  return { key, types: [key], text: `${commodityName(key)}: ${needed} needed, ${have} in warehouse`, missing: have < needed };
};

/** FR-572: per Trade School action the cash and goods one more costs (TRAINING_COST, MIGRANT_COST), against our stock. */
export function tradeSchoolCosts(nation: Nation): Record<SchoolAction, CostView[]> {
  const stock = nation.warehouse as Stock;
  const training = (from: "untrained" | "trained"): CostView[] => {
    const cost = TRAINING_COST[from];
    const cash: CostView = {
      key: "cash",
      types: [],
      text: `Cash: ${money(cost.cash)} needed, ${money(nation.treasury)} in treasury`,
      missing: nation.treasury < cost.cash,
    };
    return [cash, goodsCost(stock, MaterialType.Paper, cost.paper)];
  };
  const migrant = Object.entries(MIGRANT_COST).map(([key, amount]) => goodsCost(stock, key as WarehouseCommodities, amount ?? 0));
  return { untrained: training("untrained"), trained: training("trained"), migrant };
}
