import { WorkerType } from "./Workers";

export type PossibleAction =
  | { type: 'prospect' }
  | { type: 'develop', workerType: WorkerType, level: 1 | 2 | 3 }
  | { type: 'construct', kind: 'rail' | 'fort' }
  | { type: 'open-construct-modal' }
  /** FR-639: the Developer buys the Minor Nation tile (the engine decides where). */
  | { type: 'buy-land' }
  | null;