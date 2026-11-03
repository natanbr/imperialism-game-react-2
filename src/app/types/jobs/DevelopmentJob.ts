import { WorkerType } from "../Workers";

/** A development worker's job on its tile. It leaves the tile when it finishes (FR-032). */
export interface DevelopmentJob {
  workerId: string;
  workerType: WorkerType;
  targetLevel: 1 | 2 | 3; // desired resource level
  startedOnTurn: number;
  durationTurns: number; // total required turns
}
