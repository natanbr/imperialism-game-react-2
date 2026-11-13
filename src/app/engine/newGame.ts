import type { GameState } from "@/types/GameState";
import type { WorldId } from "@/types/World";
import type { MarketMode } from "@/types/Market";
import { TIME_CONFIG } from "@/constants/gameConstants";
import { initializeRailroadNetworks } from "./systems/railroadSystem";
import { startMarket } from "./market/market";
import { startDiplomacy } from "./diplomacy/relations";
import { START_TECHNOLOGIES } from "./world/startWorld";
import { buildWorld, DEFAULT_WORLD, WORLD_MARKET } from "./world/worlds";

export interface NewGameOptions {
  seed: number;
  /** The last turn of the game (FR-068); default 40, Spring 1815 to Winter 1824. Clamped by FR-105. */
  turnLimit?: number;
  /** A key of `WORLDS` (FR-144); "two-islands" when omitted, so every v1 call is unchanged. */
  world?: WorldId;
  /** The market mode (FR-182); the world's own (`WORLD_MARKET`) when omitted. */
  market?: MarketMode;
}

/** A whole number of turns from 1 to MAX_TURN_LIMIT; anything that is not a finite number is the default (FR-105). */
export function clampTurnLimit(turnLimit: number | undefined): number {
  if (typeof turnLimit !== "number" || !Number.isFinite(turnLimit)) return TIME_CONFIG.TURN_LIMIT;
  return Math.min(TIME_CONFIG.MAX_TURN_LIMIT, Math.max(1, Math.floor(turnLimit)));
}

/**
 * The start of a game (FR-027, FR-080, FR-098, FR-144): Spring 1815 on the chosen world, one Great
 * Power on each island (the human's on island 1, a scripted one on island 2), each with its workforce,
 * buildings and warehouse, its civilians on the capital and its rail network built; on the continent
 * also the minor nations and the provinces (FR-145 to FR-147). The caller chooses the seed (the store
 * draws one, tests pass 1); the map is the same for every seed. `newGame(seed)` is `newGame({ seed })`.
 */
export function newGame(options: number | NewGameOptions): GameState {
  const { seed, turnLimit, world = DEFAULT_WORLD, market }: NewGameOptions = typeof options === "number" ? { seed: options } : options;
  const { map, nations, minorNations, provinces } = buildWorld(world);
  return {
    turn: TIME_CONFIG.STARTING_TURN,
    year: TIME_CONFIG.STARTING_YEAR,
    seed,
    worldId: world,
    turnLimit: clampTurnLimit(turnLimit),
    nations,
    minorNations,
    provinces,
    diplomacy: startDiplomacy(nations, minorNations),
    intents: [],
    proposals: [],
    cities: [],
    armies: [],
    fleets: [],
    map,
    transportNetwork: { shippingLanes: [], capacity: 0, railroadNetworks: initializeRailroadNetworks(map, nations) },
    transportAllocationsByNation: {},
    tradeRoutes: [],
    market: startMarket(market ?? WORLD_MARKET[world]),
    // The technology state is shared by all nations in v1, so the start list covers every nation.
    technologyState: { oilDrillingTechUnlocked: false, technologies: START_TECHNOLOGIES.map((t) => ({ ...t })) },
    difficulty: "normal",
  };
}
