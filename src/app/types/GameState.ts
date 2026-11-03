// types/GameState.ts
import { Nation } from "./Nation";
import { City } from "./City";
import { Army } from "./Army";
import { Fleet } from "./Navy";
import { TradeRoute } from "./TradeRoute";
import { TransportNetwork } from "./Transport";
import { GameMap } from "./Map";
import { TechnologyState } from "./Technology";
import { Relation, Treaty, TradePolicy, Grant } from "./Diplomacy";
import type { WorldMarket } from "./Market";

/**
 * The whole game as the engine sees it. Only game data lives here: which nation the human plays,
 * the news log and display text are UI state and live in the store beside it (FR-018).
 */
export interface GameState {
  turn: number;
  year: number;
  // Game seed: each turn's RNG is derived from (seed, turn), so replays are deterministic.
  seed: number;

  nations: Nation[];
  cities: City[];
  armies: Army[];
  fleets: Fleet[];

  relations: Relation[];
  treaties: Treaty[];
  tradePolicies: TradePolicy[];
  grants: Grant[];

  map: GameMap;
  transportNetwork: TransportNetwork;

  // Player-chosen distribution of transport capacity per nation for this turn
  transportAllocationsByNation?: Record<string, Record<string, number>>;

  tradeRoutes: TradeRoute[]; // optional if you model manual trade as global rather than fixed routes

  /** The world market every nation trades on (FR-060); a hand-built state without one uses the start market. */
  market?: WorldMarket;

  // industry is now per-nation, see Nation.industry
  technologyState: TechnologyState;

  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
}