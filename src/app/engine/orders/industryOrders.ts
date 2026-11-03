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
  LABOUR_PER_WORKER,
  MIGRANT_COST,
  RECIPES,
  TRAINING_COST,
} from "@/definisions/ResourceConversions";
import { buildingOf, migrantCap } from "../industry/industryState";
import { healthyWorkers, labourOf, labourPerUnit } from "../industry/labour";
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
  const batches = amount / recipe.batch;
  const stock = stockOf(nation);
  for (const input of recipe.inputs) {
    const available = input.types.reduce((sum, type) => sum + (stock[type] ?? 0), 0);
    if (available < batches * input.amount) return reject("insufficient-resources");
  }
  const { total, committed } = labourOf(nation);
  if (committed + (amount - current) * labourPerUnit(output) > total) return reject("insufficient-labour");
  return OK;
}

/** The capacity points one more step adds, counted from the size already ordered this turn. */
function expansionPoints(nation: Nation, order: ExpandBuildingOrder): number {
  const def = BUILDINGS[order.building];
  const { capacity, pendingCapacity } = buildingOf(nation, order.building);
  const from = capacity + pendingCapacity;
  return nextCapacity(def.kind, from) - from;
}

export function validateExpandBuilding(state: GameState, nation: Nation, order: ExpandBuildingOrder): ValidationResult {
  if (!Object.hasOwn(BUILDINGS, order.building)) return reject("invalid-target");
  const def = BUILDINGS[order.building];
  if (def.unlimited) return reject("invalid-target");
  if (def.needsOilDrilling && !state.technologyState.oilDrillingTechUnlocked) return reject("invalid-target");
  const points = expansionPoints(nation, order);
  const stock = stockOf(nation);
  const enough = has(stock, MaterialType.Lumber, points * EXPANSION_COST_PER_POINT.lumber) && has(stock, MaterialType.Steel, points * EXPANSION_COST_PER_POINT.steel);
  return enough ? OK : reject("insufficient-resources");
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
  // A trainee gives no labour this turn, so its labour must be free.
  return labourOf(nation).free >= delta * LABOUR_PER_WORKER[from] ? OK : reject("insufficient-labour");
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
    const points = expansionPoints(nation, order);
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

