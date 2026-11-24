import type { Difficulty, GameState } from "@/types/GameState";
import type { WorldId } from "@/types/World";
import type { MarketMode } from "@/types/Market";
import { TIME_CONFIG } from "@/constants/gameConstants";
import { initializeRailroadNetworks } from "./systems/railroadSystem";
import { startMarket } from "./market/market";
import { startDiplomacy } from "./diplomacy/relations";
import { buildWorld, DEFAULT_WORLD, WORLD_MARKET } from "./world/worlds";
import { withStartForces } from "./army/startForces";
import { withDemoStart } from "./world/demoStart";

export interface NewGameOptions {
  seed: number;
  /** The last turn of the game (FR-068); default 40, Spring 1815 to Winter 1824. Clamped by FR-105. */
  turnLimit?: number;
  /** A key of `WORLDS` (FR-144); "two-islands" when omitted, so every v1 call is unchanged. */
  world?: WorldId;
  /** The market mode (FR-242); the world's own (`WORLD_MARKET`) when omitted. */
  market?: MarketMode;
  /** The level; "normal" when omitted. Only "demo" changes the start (FR-561): the human nation's Demo kit. */
  difficulty?: Difficulty;
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
 * also the minor nations, the provinces (FR-145 to FR-147) and the start forces (FR-203: armies, capital
 * forts, 4 more horses each; none on two-islands). The caller chooses the seed (the store
 * draws one, tests pass 1); the map is the same for every seed. `newGame(seed)` is `newGame({ seed })`.
 */
export function newGame(options: number | NewGameOptions): GameState {
  const { seed, turnLimit, world = DEFAULT_WORLD, market, difficulty = "normal" }: NewGameOptions =
    typeof options === "number" ? { seed: options } : options;
  const { map, nations, minorNations, provinces } = buildWorld(world);
  const start = withStartForces({
    turn: TIME_CONFIG.STARTING_TURN,
    rulesRevision: "m16.1",
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
    difficulty,
  });
  return difficulty === "demo" ? withDemoStart(start) : start;
}
