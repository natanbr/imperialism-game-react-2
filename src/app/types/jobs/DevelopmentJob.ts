import { WorkerType } from "../Workers";

export interface DevelopmentJob {
  workerId: string;
  workerType: WorkerType;
  targetLevel: 1 | 2 | 3; // desired resource level
  startedOnTurn: number;
  durationTurns: number; // total required turns
  completed?: boolean; // set true when finished (for UI pulse)
  completedOnTurn?: number; // turn when completed; used to auto-clear indicator next turn
}