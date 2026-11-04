import type { GameState } from "@/types/GameState";
import { TIME_CONFIG } from "@/constants/gameConstants";
import { initializeRailroadNetworks } from "./systems/railroadSystem";
import { startMarket } from "./market/market";
import { START_TECHNOLOGIES, startWorld } from "./world/startWorld";

export interface NewGameOptions {
  seed: number;
  /** The last turn of the game (FR-068); default 40, Spring 1815 to Winter 1824. */
  turnLimit?: number;
}

/**
 * The start of a game (FR-027, FR-080, FR-081): Spring 1815, the 24x16 two-island map with one
 * nation on island 1, its workforce, buildings and warehouse, its civilians on the capital and its
 * rail network built; island 2 is unclaimed. The caller chooses the seed (the store draws one, tests
 * pass 1); the map is the same for every seed.
 */
export function newGame({ seed, turnLimit = TIME_CONFIG.TURN_LIMIT }: NewGameOptions): GameState {
  const { map, nations } = startWorld();
  return {
    turn: TIME_CONFIG.STARTING_TURN,
    year: TIME_CONFIG.STARTING_YEAR,
    seed,
    turnLimit,
    nations,
    cities: [],
    armies: [],
    fleets: [],
    relations: [],
    treaties: [],
    tradePolicies: [],
    grants: [],
    map,
    transportNetwork: { shippingLanes: [], capacity: 0, railroadNetworks: initializeRailroadNetworks(map, nations) },
    transportAllocationsByNation: {},
    tradeRoutes: [],
    market: startMarket(),
    // The technology state is shared by all nations in v1, so the start list covers every nation.
    technologyState: { oilDrillingTechUnlocked: false, technologies: START_TECHNOLOGIES.map((t) => ({ ...t })) },
    difficulty: "normal",
  };
}
