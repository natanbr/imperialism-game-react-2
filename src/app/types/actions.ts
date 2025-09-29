import { WorkerType } from "./Workers";

export type PossibleAction =
  | { type: 'prospect' }
  | { type: 'develop', workerType: WorkerType, level: 1 | 2 | 3 }
  | { type: 'construct', kind: 'rail' | 'fort' }
  | { type: 'open-construct-modal' }
  | null;