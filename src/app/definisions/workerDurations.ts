// src/app/definisions/workerDurations.ts
// Centralized table for worker job durations (in turns).
// NOTE: All values are placeholders. Update with real numbers from the manual.

import { WorkerType } from "../types/Workers";

// Prospector: discovery duration (e.g., time to reveal hidden resource)
export const ProspectorDiscoveryDurationTurns: number = 1; // TODO: update from manual

// Level-based development durations for workers that improve resource levels (L1-L3)
// Keys: WorkerType; Values: { level -> turns }
export const WorkerLevelDurationsTurns: Partial<Record<WorkerType, Record<1 | 2 | 3, number>>> = {
  [WorkerType.Farmer]: {
    1: 2, // TODO: update from manual
    2: 3, // TODO: update from manual
    3: 4, // TODO: update from manual
  },
  [WorkerType.Rancher]: {
    1: 2, // TODO: update from manual
    2: 3, // TODO: update from manual
    3: 4, // TODO: update from manual
  },
  [WorkerType.Forester]: {
    1: 3, // TODO: update from manual
    2: 4, // TODO: update from manual
    3: 5, // TODO: update from manual
  },
  [WorkerType.Miner]: {
    1: 3, // TODO: update from manual
    2: 4, // TODO: update from manual
    3: 5, // TODO: update from manual
  },
  [WorkerType.Driller]: {
    1: 3, // TODO: update from manual
    2: 4, // TODO: update from manual
    3: 5, // TODO: update from manual
  },
};

// Engineer: building durations (single-action tasks, not level-based)
export const EngineerBuildDurationsTurns: Record<
  "depot" | "port" | "fort" | "rail",
  number
> = {
  depot: 2, // TODO: update from manual
  port: 4,  // TODO: update from manual
  fort: 4,  // TODO: update from manual
  rail: 3,  // TODO: update from manual
};

// Convenience accessor for consumers wanting a single exported object
export const WorkerDurations = {
  prospectorDiscovery: ProspectorDiscoveryDurationTurns,
  levels: WorkerLevelDurationsTurns,
  engineer: EngineerBuildDurationsTurns,
};

export default WorkerDurations;