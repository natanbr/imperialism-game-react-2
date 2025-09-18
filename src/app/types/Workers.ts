// types/Workers.ts

export enum WorkerType {
  Prospector = "prospector",
  Engineer = "engineer",
  Miner = "miner",
  Farmer = "farmer",
  Rancher = "rancher",
  Forester = "forester",
  Driller = "driller",
  Developer = "developer",
}

export interface Worker {
  id: string;
  type: WorkerType;
  assignedTileId?: string;
  efficiency: number; // 0–100
}
