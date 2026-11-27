// types/Workers.ts

export enum WorkerStatus {
  Available = "available",
  Moved = "moved",
  Working = "working",
}

export enum WorkerType {
  Prospector = "prospector",
  Engineer = "engineer",
  Miner = "miner",
  Farmer = "farmer",
  Rancher = "rancher",
  Forester = "forester",
  Driller = "driller",
  /** FR-629, FR-630: the land buyer granted by diplomacy, one per nation; never built and never an improver. */
  Developer = "developer",
}

export interface Worker {
  id: string;
  type: WorkerType;
  nationId: string; // owner nation of the worker
  assignedTileId?: string;
  efficiency: number; // 0–100
  status: WorkerStatus;
  justMoved: boolean;
  previousTileId?: string;
  /**
   * FR-031, FR-632: its place in the stack on `previousTileId` when another civilian stood behind it, so undoing this
   * turn's move puts it back there. Absent when it was last, and cleared with the move.
   */
  previousIndex?: number;
  /** Reserved for return to industry at End Turn (FR-512). */
  pendingDisband?: boolean;
}
