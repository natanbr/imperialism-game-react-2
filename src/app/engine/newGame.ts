import type { GameState } from "@/types/GameState";
import { initWorld } from "@/testing/worldInit";
import { TIME_CONFIG } from "@/constants/gameConstants";
import { initializeRailroadNetworks } from "./systems/railroadSystem";

export interface NewGameOptions {
  seed: number;
  cols?: number;
  rows?: number;
}

/**
 * The start of a game: turn 1, year 1900, the one nation of `initWorld` with its workers on the
 * capital and its rail network built. The 40x40 map is `testing/testMap1`, the only map until a
 * map generator exists. The caller chooses the seed (the store draws one, tests pass 1).
 */
export function newGame({ seed, cols = 40, rows = 40 }: NewGameOptions): GameState {
  const { map, nations } = initWorld({ cols, rows });
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
    technologyState: { oilDrillingTechUnlocked: false, technologies: [] },
    difficulty: "normal",
  };
}
