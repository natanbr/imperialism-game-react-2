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
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
  nationId: string; // owner nation of the worker
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
  assignedTileId?: string;
  efficiency: number; // 0–100
}
