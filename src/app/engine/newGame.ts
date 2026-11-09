import type { GameState } from "@/types/GameState";
import { TIME_CONFIG } from "@/constants/gameConstants";
import { initializeRailroadNetworks } from "./systems/railroadSystem";
import { startMarket } from "./market/market";
import { START_TECHNOLOGIES, startWorld } from "./world/startWorld";

export interface NewGameOptions {
  seed: number;
  /** The last turn of the game (FR-068); default 40, Spring 1815 to Winter 1824. Clamped by FR-105. */
  turnLimit?: number;
}

/** A whole number of turns from 1 to MAX_TURN_LIMIT; anything that is not a finite number is the default (FR-105). */
export function clampTurnLimit(turnLimit: number | undefined): number {
  if (typeof turnLimit !== "number" || !Number.isFinite(turnLimit)) return TIME_CONFIG.TURN_LIMIT;
  return Math.min(TIME_CONFIG.MAX_TURN_LIMIT, Math.max(1, Math.floor(turnLimit)));
}

/**
 * The start of a game (FR-027, FR-080, FR-098): Spring 1815, the 24x16 two-island map with one
 * Great Power on each island (the human's on island 1, a scripted one on island 2), each with its
 * workforce, buildings and warehouse, its civilians on the capital and its rail network built. The
 * caller chooses the seed (the store draws one, tests pass 1); the map is the same for every seed.
 */
export function newGame({ seed, turnLimit }: NewGameOptions): GameState {
  const { map, nations } = startWorld();
  return {
    turn: TIME_CONFIG.STARTING_TURN,
    year: TIME_CONFIG.STARTING_YEAR,
    seed,
    turnLimit: clampTurnLimit(turnLimit),
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
