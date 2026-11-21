import { WorkerType } from "@/types/Workers";

export type UniversityCivilian = Exclude<WorkerType, WorkerType.Developer>;

/** Q125: the original game gives the endpoints; the five intermediate fees use the $1,000 default. */
export const UNIVERSITY_FEES = {
  [WorkerType.Prospector]: 500,
  [WorkerType.Miner]: 1500,
  [WorkerType.Engineer]: 1000,
  [WorkerType.Farmer]: 1000,
  [WorkerType.Rancher]: 1000,
  [WorkerType.Forester]: 1000,
  [WorkerType.Driller]: 1000,
} as const satisfies Record<UniversityCivilian, number>;

export const UNIVERSITY_PAPER_COST = 2;
