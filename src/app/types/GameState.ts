// types/GameState.ts
import { Nation } from "./Nation";
import { City } from "./City";
import { Army } from "./Army";
import { Fleet } from "./Navy";
import { TradeRoute } from "./TradeRoute";
import { TransportNetwork } from "./Transport";
import { GameMap } from "./Map";
import { TechnologyState } from "./Technology";
import type { DiplomacyState, Proposal } from "./Diplomacy";
import type { Intent } from "./Intent";
import type { MinorNation } from "./MinorNation";
import type { Province } from "./Province";
import type { WorldId } from "./World";
import type { WorldMarket } from "./Market";
import type { GameOver } from "./Score";
import type { CountryId } from "./Common";
import type { RegimentType } from "./Unit";

/**
 * The whole game as the engine sees it. Only game data lives here: which nation the human plays,
 * the news log and display text are UI state and live in the store beside it (FR-018).
 */
export interface GameState {
  turn: number;
  year: number;
  // Game seed: each turn's RNG is derived from (seed, turn), so replays are deterministic.
  seed: number;
  /** The world the game started on (FR-144); absent on a hand-built test state. */
  worldId?: WorldId;

  /** The Great Powers. Every system and view that iterates nations sees these only (FR-146). */
  nations: Nation[];
  /** The minor nations (FR-146), apart from the Great Powers; none on two-islands. */
  minorNations: MinorNation[];
  /** The provinces (FR-147); none on a world without provinces (two-islands). */
  provinces: Province[];
  /** One entry per pair of countries with at least one Great Power, by `pairKey` (FR-151). */
  diplomacy: DiplomacyState;
  /** What this turn's orders that involve a second country left to resolve (FR-152). */
  intents: Intent[];
  /**
   * Alliance and peace overtures to a human Great Power, answered on the next turn (FR-166); empty on a
   * new game, absent on a hand-built test state (read through `proposalsOf`).
   */
  proposals?: Proposal[];

  cities: City[];
  /** The land forces (FR-204): at most one army per country per province; none on two-islands. */
  armies: Army[];
  /**
   * How many regiments of each type each country has raised so far (FR-204): the next one's ordinal name, and their
   * sum the next regiment's id number. Set by a new game with provinces; absent on two-islands and hand-built states.
   */
  regimentsRaised?: Record<CountryId, Partial<Record<RegimentType, number>>>;
  fleets: Fleet[];

  map: GameMap;
  transportNetwork: TransportNetwork;

  // Player-chosen distribution of transport capacity per nation for this turn
  transportAllocationsByNation?: Record<string, Record<string, number>>;

  tradeRoutes: TradeRoute[]; // optional if you model manual trade as global rather than fixed routes

  /** The world market every nation trades on (FR-060); a hand-built state without one uses the start market. */
  market?: WorldMarket;

  /** The last turn of the game (FR-068); 40 when missing. */
  turnLimit?: number;
  /** Set when the last turn has resolved; no order or turn changes the state after it (FR-069). */
  gameOver?: GameOver;

  // industry is now per-nation, see Nation.industry
  technologyState: TechnologyState;

  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
}
