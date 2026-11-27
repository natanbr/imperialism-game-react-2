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
  /** Reserved for return to industry at End Turn (FR-512). */
  pendingDisband?: boolean;
}
