export type ConstructionKind = "depot" | "port" | "fort" | "rail";

export interface ConstructionJob {
  workerId: string;
  kind: ConstructionKind;
  startedOnTurn: number;
  durationTurns: number;
  completed?: boolean;
  completedOnTurn?: number;
}