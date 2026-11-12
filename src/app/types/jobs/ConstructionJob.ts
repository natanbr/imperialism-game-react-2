import type { TileId } from "../Common";

export type ConstructionKind = "depot" | "port" | "fort" | "rail";

/** An engineer's job on its tile. It leaves the tile when it finishes (FR-032). */
export interface ConstructionJob {
  workerId: string;
  kind: ConstructionKind;
  startedOnTurn: number;
  durationTurns: number;
  /** Rail only: the neighbouring tile the section starts from; the section joins it to this tile (FR-136). */
  railFrom?: TileId;
}
