// A nation's industry at the start of a game, and lookups the orders and systems share.
import type { BuildingType, IndustryBuilding, IndustryState, Workers } from "@/types/Industry";
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import { BUILDINGS, startCapacity } from "@/definisions/industryBuildings";
import { noWorkers } from "./labour";
import { provincesOf } from "../world/provinces";

/** The usual Normal start (rules 05 section 4): 4 untrained, 2 trained, 1 expert, 12 labour. */
export const START_WORKERS: Readonly<Workers> = { untrained: 4, trained: 2, expert: 1 };

/**
 * Every production building at its start size (the six mills and factories built, gaps.md A6),
 * with no orders, and the given workforce.
 */
export function createIndustry(workers: Workers = START_WORKERS): IndustryState {
  const buildings: Partial<Record<BuildingType, IndustryBuilding>> = {};
  for (const building of Object.keys(BUILDINGS) as BuildingType[]) {
    buildings[building] = { capacity: startCapacity(building), pendingCapacity: 0, orders: {} };
  }
  return { buildings, workers: { ...workers }, sick: noWorkers(), training: noWorkers(), recruits: 0 };
}

/** The building's state; a building a nation has never had is not built and has no orders. */
export const buildingOf = (nation: Nation, building: BuildingType): IndustryBuilding =>
  nation.industry.buildings[building] ?? { capacity: 0, pendingCapacity: 0, orders: {} };

/**
 * Migrants a turn: floor(provinces / 4), the provinces the nation holds (FR-042, FR-148).
 * [NEEDS CLARIFICATION] gaps.md B8: unconfirmed; at least 1, so 1 on two-islands (no provinces) and
 * on a new continent game (4 provinces), 2 for a nation holding 8.
 */
export const migrantCap = (state: GameState, nationId: NationId): number =>
  Math.max(1, Math.floor(provincesOf(state, nationId).length / 4));
