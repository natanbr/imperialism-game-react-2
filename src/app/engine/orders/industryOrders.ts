// Industry orders of the capital: production, expansion, freight cars, training, migration
// (FR-036, FR-038, FR-039, FR-041, FR-042). Validation reads the state; apply returns a new one.
import type { GameState } from "@/types/GameState";
import type { IndustryState, ProductionOutput } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import { MaterialType } from "@/types/Resource";
import { BUILDINGS, nextCapacity } from "@/definisions/industryBuildings";
import {
  EXPANSION_COST_PER_POINT,
  FREIGHT_CAR_COST,
  MIGRANT_COST,
  RECIPES,
  TRAINING_COST,
} from "@/definisions/ResourceConversions";
import { buildingOf, migrantCap } from "../industry/industryState";
import { healthyWorkers } from "../industry/labour";
import { labourOf, planProduction, type ProductionPlan } from "../industry/productionPlan";
import type {
  ChangeTransportCapacityOrder,
  ExpandBuildingOrder,
  RecruitWorkersOrder,
  RejectReason,
  SetProductionOrder,
  TrainWorkersOrder,
  ValidationResult,
} from "./Order";

const OK: ValidationResult = { ok: true };
const reject = (reason: RejectReason): ValidationResult => ({ ok: false, reason });

type Stock = Record<string, number>;
const stockOf = (nation: Nation): Stock => nation.warehouse as Stock;
const has = (stock: Stock, key: string, amount: number): boolean => (stock[key] ?? 0) >= amount;
const isWholeNumber = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

// --- validation ----------------------------------------------------------------------------

/** The output the order names, or the building's first one. */
const outputOf = (order: SetProductionOrder): ProductionOutput | undefined =>
  order.output ?? BUILDINGS[order.building]?.outputs[0];

export function validateSetProduction(nation: Nation, order: SetProductionOrder): ValidationResult {
  if (!Object.hasOwn(BUILDINGS, order.building)) return reject("invalid-target");
  const def = BUILDINGS[order.building];
  const building = buildingOf(nation, order.building);
  if (!def.unlimited && building.capacity <= 0) return reject("invalid-target");
  const output = outputOf(order);
  if (!output || !def.outputs.includes(output)) return reject("invalid-target");
  const recipe = RECIPES[output];

  const { amount } = order;
  if (!isWholeNumber(amount) || amount < 0 || amount % recipe.batch !== 0) return reject("invalid-amount");
  const current = building.orders[output] ?? 0;
  if (amount <= current) return OK; // lowering an order is always allowed

  if (!def.unlimited) {
    const others = def.outputs.filter((o) => o !== output).reduce((sum, o) => sum + (building.orders[o] ?? 0), 0);
    if (amount + others > building.capacity) return reject("limit-reached");
  }
  // FR-118: the plan with the new amount must make all of it and no less of anything else; else the
  // stock (its own or shared with another order) or the labour is short (rules 05: no order above them).
  const raised = withOrder(nation, order.building, output, amount);
  if (makesAll(planProduction(raised), planProduction(nation), output, amount)) return OK;
  const unlimited = { labour: Infinity };
  const stockAllows = makesAll(planProduction(raised, unlimited), planProduction(nation, unlimited), output, amount);
  return reject(stockAllows ? "insufficient-labour" : "insufficient-resources");
}

/** Orders larger than this are not probed (food processing has no capacity limit). */
const PROBE_LIMIT = 500;

/**
 * The largest amount of `output` a fresh order may set now: the most the engine accepts with this
 * output's own standing order cleared (FR-119). A query for the capital dialog; nothing is changed.
 */
export function largestOrder(nation: Nation, building: SetProductionOrder["building"], output: ProductionOutput): number {
  if (!Object.hasOwn(BUILDINGS, building)) return 0;
  const cleared = withOrder(nation, building, output, 0);
  const step = RECIPES[output].batch;
  let best = 0;
  for (let amount = step; amount <= PROBE_LIMIT; amount += step) {
    if (!validateSetProduction(cleared, { kind: "setProduction", nationId: nation.id, building, output, amount }).ok) break;
    best = amount;
  }
  return best;
}

/** The nation with one standing order changed (a copy: the nation is not touched). */
function withOrder(nation: Nation, name: SetProductionOrder["building"], output: ProductionOutput, amount: number): Nation {
  const building = buildingOf(nation, name);
  return withIndustry(nation, { buildings: { ...nation.industry.buildings, [name]: { ...building, orders: { ...building.orders, [output]: amount } } } });
}

/** `after` makes `amount` of `output` and at least what `before` made of every other output. */
function makesAll(after: ProductionPlan, before: ProductionPlan, output: ProductionOutput, amount: number): boolean {
  if ((after.made[output] ?? 0) !== amount) return false;
  return (Object.entries(before.made) as [ProductionOutput, number][]).every(([o, n]) => o === output || (after.made[o] ?? 0) >= n);
}

const expansionSteps = (order: ExpandBuildingOrder): number => order.delta ?? 1;

/**
 * The capacity points the order's steps add, counted from the size already ordered this turn;
 * negative when it cancels this turn's steps (the last step first). Undefined when a cancel names
 * more steps than this turn's, or the steps would add more than `budget` points (this bound keeps
 * a huge delta from looping).
 */
function expansionPoints(nation: Nation, order: ExpandBuildingOrder, budget = Infinity): number | undefined {
  const { kind } = BUILDINGS[order.building];
  const { capacity, pendingCapacity } = buildingOf(nation, order.building);
  const ordered = capacity + pendingCapacity;
  const steps = expansionSteps(order);
  if (steps < 0) {
    const sizes = [capacity];
    while (sizes[sizes.length - 1] < ordered) sizes.push(nextCapacity(kind, sizes[sizes.length - 1]));
    const back = sizes.length - 1 + steps;
    return back >= 0 ? sizes[back] - ordered : undefined;
  }
  let size = ordered;
  for (let step = 0; step < steps; step++) {
    size = nextCapacity(kind, size);
    if (size - ordered > budget) return undefined;
  }
  return size - ordered;
}

export function validateExpandBuilding(state: GameState, nation: Nation, order: ExpandBuildingOrder): ValidationResult {
  if (!Object.hasOwn(BUILDINGS, order.building)) return reject("invalid-target");
  const def = BUILDINGS[order.building];
  if (def.unlimited) return reject("invalid-target");
  if (def.needsOilDrilling && !state.technologyState.oilDrillingTechUnlocked) return reject("invalid-target");
  const steps = expansionSteps(order);
  if (!isWholeNumber(steps) || steps === 0) return reject("invalid-amount");
  if (steps < 0) return expansionPoints(nation, order) === undefined ? reject("invalid-amount") : OK;

  const stock = stockOf(nation);
  const affordable = Math.min(
    Math.floor((stock[MaterialType.Lumber] ?? 0) / EXPANSION_COST_PER_POINT.lumber),
    Math.floor((stock[MaterialType.Steel] ?? 0) / EXPANSION_COST_PER_POINT.steel),
  );
  return expansionPoints(nation, order, affordable) === undefined ? reject("insufficient-resources") : OK;
}

export function validateCapacityChange(nation: Nation, order: ChangeTransportCapacityOrder): ValidationResult {
  const { delta } = order;
  if (!isWholeNumber(delta) || delta === 0) return reject("invalid-amount");
  if (delta < 0) {
    const pending = Math.max(0, Math.floor(nation.transportCapacityPendingIncrease ?? 0));
    return pending >= -delta ? OK : reject("invalid-amount");
  }
  const stock = stockOf(nation);
  if (!has(stock, MaterialType.Lumber, delta * FREIGHT_CAR_COST.lumber) || !has(stock, MaterialType.Steel, delta * FREIGHT_CAR_COST.steel)) {
    return reject("insufficient-resources");
  }
  return labourOf(nation).free >= delta * FREIGHT_CAR_COST.labour ? OK : reject("insufficient-labour");
}

const isTrainable = (grade: unknown): grade is keyof typeof TRAINING_COST =>
  typeof grade === "string" && Object.hasOwn(TRAINING_COST, grade);

export function validateTrainWorkers(nation: Nation, order: TrainWorkersOrder): ValidationResult {
  if (!isTrainable(order.from)) return reject("invalid-target");
  const { delta, from } = order;
  if (!isWholeNumber(delta) || delta === 0) return reject("invalid-amount");
  const industry = nation.industry;
  if (delta < 0) return industry.training[from] >= -delta ? OK : reject("invalid-amount");

  if (delta > healthyWorkers(industry, from)) return reject("invalid-amount");
  const cost = TRAINING_COST[from];
  if ((nation.treasury ?? 0) < delta * cost.cash) return reject("insufficient-funds");
  if (!has(stockOf(nation), MaterialType.Paper, delta * cost.paper)) return reject("insufficient-resources");
  // Rules 05 section 4: at least 1 labour must be free to start training, not the trainee's whole
  // labour. The trainee gives no labour this turn; production clamps orders it no longer covers.
  return labourOf(nation).free >= 1 ? OK : reject("insufficient-labour");
}

export function validateRecruitWorkers(nation: Nation, order: RecruitWorkersOrder): ValidationResult {
  const { delta } = order;
  if (!isWholeNumber(delta) || delta === 0) return reject("invalid-amount");
  const recruits = nation.industry.recruits;
  if (delta < 0) return recruits >= -delta ? OK : reject("invalid-amount");
  if (recruits + delta > migrantCap(nation)) return reject("limit-reached");
  const stock = stockOf(nation);
  const enough = Object.entries(MIGRANT_COST).every(([key, each]) => has(stock, key, delta * (each ?? 0)));
  return enough ? OK : reject("insufficient-resources");
}

// --- immediate effects (each returns a new state and never touches its input) ---------------

function updateNation(state: GameState, nationId: string, fn: (nation: Nation) => Nation): GameState {
  return { ...state, nations: state.nations.map((n) => (n.id === nationId ? fn(n) : n)) };
}

const withStock = (nation: Nation, changes: Record<string, number>): Nation => {
  const warehouse = { ...stockOf(nation) };
  for (const [key, delta] of Object.entries(changes)) warehouse[key] = (warehouse[key] ?? 0) + delta;
  return { ...nation, warehouse: warehouse as Nation["warehouse"] };
};

const withIndustry = (nation: Nation, patch: Partial<IndustryState>): Nation => ({
  ...nation,
  industry: { ...nation.industry, ...patch },
});

export const applySetProduction = (state: GameState, order: SetProductionOrder): GameState =>
  updateNation(state, order.nationId, (nation) => {
    const building = buildingOf(nation, order.building);
    const orders = { ...building.orders, [outputOf(order)!]: order.amount };
    return withIndustry(nation, { buildings: { ...nation.industry.buildings, [order.building]: { ...building, orders } } });
  });

export const applyExpandBuilding = (state: GameState, order: ExpandBuildingOrder): GameState =>
  updateNation(state, order.nationId, (nation) => {
    const points = expansionPoints(nation, order) ?? 0; // validated: defined
    const building = buildingOf(nation, order.building);
    const paid = withStock(nation, {
      [MaterialType.Lumber]: -points * EXPANSION_COST_PER_POINT.lumber,
      [MaterialType.Steel]: -points * EXPANSION_COST_PER_POINT.steel,
    });
    const expanded = { ...building, pendingCapacity: building.pendingCapacity + points };
    return withIndustry(paid, { buildings: { ...nation.industry.buildings, [order.building]: expanded } });
  });

export const applyCapacityChange = (state: GameState, order: ChangeTransportCapacityOrder): GameState =>
  updateNation(state, order.nationId, (nation) => {
    const { delta } = order;
    const pending = Math.max(0, Math.floor(nation.transportCapacityPendingIncrease ?? 0));
    const paid = withStock(nation, {
      [MaterialType.Lumber]: -delta * FREIGHT_CAR_COST.lumber,
      [MaterialType.Steel]: -delta * FREIGHT_CAR_COST.steel,
    });
    return { ...paid, transportCapacityPendingIncrease: pending + delta };
  });

export const applyTrainWorkers = (state: GameState, order: TrainWorkersOrder): GameState =>
  updateNation(state, order.nationId, (nation) => {
    const from = order.from as keyof typeof TRAINING_COST;
    const cost = TRAINING_COST[from];
    const paid = withStock(nation, { [MaterialType.Paper]: -order.delta * cost.paper });
    const training = { ...nation.industry.training, [from]: nation.industry.training[from] + order.delta };
    return withIndustry({ ...paid, treasury: nation.treasury - order.delta * cost.cash }, { training });
  });

export const applyRecruitWorkers = (state: GameState, order: RecruitWorkersOrder): GameState =>
  updateNation(state, order.nationId, (nation) => {
    const changes = Object.fromEntries(Object.entries(MIGRANT_COST).map(([key, each]) => [key, -order.delta * (each ?? 0)]));
    return withIndustry(withStock(nation, changes), { recruits: nation.industry.recruits + order.delta });
  });

