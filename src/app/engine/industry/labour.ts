// The labour pool (FR-035). Labour is not stored: it is derived from the workforce every time; what
// it is committed to is in productionPlan.ts (labourOf, FR-117).
import type { IndustryState, ProductionOutput, WorkerGrade, Workers } from "@/types/Industry";
import { LABOUR_PER_WORKER, RECIPES } from "@/definisions/ResourceConversions";

export const GRADES: readonly WorkerGrade[] = ["untrained", "trained", "expert"];

/** Workers of a grade that are neither sick nor in training. */
export const healthyWorkers = (industry: IndustryState, grade: WorkerGrade): number =>
  Math.max(0, industry.workers[grade] - industry.sick[grade] - industry.training[grade]);

export const labourTotal = (industry: IndustryState): number =>
  GRADES.reduce((sum, grade) => sum + healthyWorkers(industry, grade) * LABOUR_PER_WORKER[grade], 0);

/** Labour one unit of the output needs (canned food: 1 per can). */
export const labourPerUnit = (output: ProductionOutput): number => RECIPES[output].labour / RECIPES[output].batch;

export const noWorkers = (): Workers => ({ untrained: 0, trained: 0, expert: 0 });
