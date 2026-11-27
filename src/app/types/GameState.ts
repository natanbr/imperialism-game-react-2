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
import type { Province, TownProgress } from "./Province";
import type { RandomMapSize, WorldId } from "./World";
import type { WorldMarket } from "./Market";
import type { GameOver } from "./Score";
import type { CountryId, MinorNationId, NationId, ProvinceId, TileId } from "./Common";
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
  /** Only Random stores its size. A missing size rebuilds the Standard map (NR-038). */
  randomMapSize?: RandomMapSize;

  /** The Great Powers. Every system and view that iterates nations sees these only (FR-146). */
  nations: Nation[];
  /** The minor nations (FR-146), apart from the Great Powers; none on two-islands. */
  minorNations: MinorNation[];
  /** The provinces (FR-147); none on a world without provinces (two-islands). */
  provinces: Province[];
  /** FR-626: a missing province starts with no elapsed development. */
  townProgress?: Record<ProvinceId, TownProgress>;
  /** FR-634: the Minor Nation tiles Great Powers bought with their Developer, by tile; absent when there are none. */
  overseasLand?: Record<TileId, OverseasHolding>;
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

  /** Shared ownership in pre-M16 version-1 saves. readSave migrates it to the individual nations. */
  technologyState?: TechnologyState;
  /** Identifies current play in v1 saves; older saves need a historical replay boundary. */
  rulesRevision?: RulesRevision;

  difficulty: Difficulty;
}

/**
 * FR-634: a Minor Nation's tile a Great Power bought (FR-633). The tile stays in the Minor Nation's province with no
 * `ownerNationId`, and only the holder may work it. Public from the settlement that made it (FR-640).
 */
export interface OverseasHolding {
  tileId: TileId;
  holderId: NationId;
  minorId: MinorNationId;
  /** The turn whose End Turn settled the purchase. */
  turn: number;
  /** What the holder paid (FR-632). */
  price: number;
}

/**
 * Province maps settle town development (M18h), towns-first freight (M18i) and the Developer (M18j, FR-641); every
 * province map has Minor Nations. Two islands, which has neither, retains its fishing-era replay semantics.
 */
export function settlementRevision(state: GameState): "m18j" | "m18d" {
  return state.provinces?.length ? "m18j" : "m18d";
}

/** The settlement rules a v1 save records, oldest first. */
export const RULES_REVISIONS = ["m16.1", "m18d", "m18h", "m18i", "m18j"] as const;
export type RulesRevision = (typeof RULES_REVISIONS)[number];

/** Whether a turn settled under `revision` ran the rules `since` added; undefined is a live settlement, today's rules. */
export const settlesUnder = (revision: RulesRevision | undefined, since: RulesRevision): boolean =>
  revision === undefined || RULES_REVISIONS.indexOf(revision) >= RULES_REVISIONS.indexOf(since);

/** The game's level. New games are "normal" unless the player picks "demo", a testing aid (FR-561); the rest are unused. */
export type Difficulty = "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible" | "demo";
