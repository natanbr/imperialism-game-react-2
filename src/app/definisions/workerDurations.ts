// Worker job durations in turns: the only table (FR-028). Source: docs/rules/03 section 4.
// A job ordered on turn T with duration D finishes when turn T + D begins.
// [NEEDS CLARIFICATION] gaps.md A4: only the miner's level-up and the forester's first improvement
// are documented (3 turns); every other level-up uses the same 3.

import { WorkerType } from "../types/Workers";

/** Prospecting one tile: 1 turn. */
export const ProspectorDiscoveryDurationTurns: number = 1;

const LEVEL_UP_TURNS = 3;
const levelUps = { 1: LEVEL_UP_TURNS, 2: LEVEL_UP_TURNS, 3: LEVEL_UP_TURNS } as const;

/** Development to level 1, 2, 3 by worker type. */
export const WorkerLevelDurationsTurns: Partial<Record<WorkerType, Record<1 | 2 | 3, number>>> = {
  [WorkerType.Farmer]: levelUps,
  [WorkerType.Rancher]: levelUps,
  [WorkerType.Forester]: levelUps,
  [WorkerType.Miner]: levelUps,
  [WorkerType.Driller]: levelUps,
};

/** Engineer jobs: rail takes "just one season"; depot, port and fort 3 turns. */
export const EngineerBuildDurationsTurns: Record<"depot" | "port" | "fort" | "rail", number> = {
  rail: 1,
  depot: 3,
  port: 3,
  fort: 3,
};
