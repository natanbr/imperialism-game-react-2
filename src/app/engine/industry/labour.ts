// The labour pool (FR-035). Labour is not stored: it is derived from the workforce every time.
import type { Nation } from "@/types/Nation";
import type { IndustryState, ProductionOutput, WorkerGrade, Workers } from "@/types/Industry";
import { FREIGHT_CAR_COST, LABOUR_PER_WORKER, RECIPES } from "@/definisions/ResourceConversions";

export const GRADES: readonly WorkerGrade[] = ["untrained", "trained", "expert"];

export interface Labour {
  /** Labour of the healthy workers not in training. */
  total: number;
  /** Labour the standing production orders and this turn's freight cars need. */
  committed: number;
  free: number;
}

/** Workers of a grade that are neither sick nor in training. */
export const healthyWorkers = (industry: IndustryState, grade: WorkerGrade): number =>
  Math.max(0, industry.workers[grade] - industry.sick[grade] - industry.training[grade]);

export const labourTotal = (industry: IndustryState): number =>
  GRADES.reduce((sum, grade) => sum + healthyWorkers(industry, grade) * LABOUR_PER_WORKER[grade], 0);

/** Labour one unit of the output needs (canned food: 1 per can). */
export const labourPerUnit = (output: ProductionOutput): number => RECIPES[output].labour / RECIPES[output].batch;

/** Labour of every standing production order. */
export function ordersLabour(industry: IndustryState): number {
  let sum = 0;
  for (const building of Object.values(industry.buildings)) {
    for (const [output, amount] of Object.entries(building?.orders ?? {})) {
      sum += (amount ?? 0) * labourPerUnit(output as ProductionOutput);
    }
  }
  return sum;
}

export const carsLabour = (nation: Nation): number =>
  Math.max(0, nation.transportCapacityPendingIncrease ?? 0) * FREIGHT_CAR_COST.labour;

export function labourOf(nation: Nation): Labour {
  const total = labourTotal(nation.industry);
  const committed = ordersLabour(nation.industry) + carsLabour(nation);
  return { total, committed, free: total - committed };
}

export const noWorkers = (): Workers => ({ untrained: 0, trained: 0, expert: 0 });
