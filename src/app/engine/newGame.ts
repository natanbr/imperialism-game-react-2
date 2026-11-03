import type { GameState } from "@/types/GameState";
import { TIME_CONFIG } from "@/constants/gameConstants";
import { initializeRailroadNetworks } from "./systems/railroadSystem";
import { START_TECHNOLOGIES, startWorld } from "./world/startWorld";

export interface NewGameOptions {
  seed: number;
}

/**
 * The start of a game (FR-027, FR-043): Spring 1815, the default 40x40 map with one nation, its
 * workforce, buildings and warehouse, its civilians on the capital and its rail network built.
 * The caller chooses the seed (the store draws one, tests pass 1).
 */
export function newGame({ seed }: NewGameOptions): GameState {
  const { map, nations } = startWorld();
  return {
    turn: TIME_CONFIG.STARTING_TURN,
    year: TIME_CONFIG.STARTING_YEAR,
    seed,
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
    // The technology state is shared by all nations in v1, so the start list covers every nation.
    technologyState: { oilDrillingTechUnlocked: false, technologies: START_TECHNOLOGIES.map((t) => ({ ...t })) },
    difficulty: "normal",
  };
}
