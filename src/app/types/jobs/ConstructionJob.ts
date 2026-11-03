export type ConstructionKind = "depot" | "port" | "fort" | "rail";

/** An engineer's job on its tile. It leaves the tile when it finishes (FR-032). */
export interface ConstructionJob {
  workerId: string;
  kind: ConstructionKind;
  startedOnTurn: number;
  durationTurns: number;
}
