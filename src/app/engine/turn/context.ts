import type { GameState } from "@/types/GameState";
import type { CountryId, NationId, TileId } from "@/types/Common";
import type { GrantAmount, Overture, ProposalKind, WithdrawableOverture } from "@/types/Diplomacy";
import type { ResourceType } from "@/types/Resource";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import type { BuildingType, ProductionOutput } from "@/types/Industry";
import type { TradeCommodity } from "@/types/Market";
import type { Score } from "@/types/Score";
import type { Order, RejectReason } from "../orders/Order";
import type { TradeBarrier } from "../market/partners";
import { createStreamRng, createTurnRng, RNG_STREAMS, type Rng, type RngStream } from "../rng";

/** What happened during a turn, for news, UI feedback and AI players. */
export type GameEvent =
  | { type: "order-rejected"; nationId: NationId; order: Order; reason: RejectReason }
  | { type: "resource-discovered"; tileId: TileId; nationId?: NationId; resource?: ResourceType }
  | { type: "development-completed"; tileId: TileId; nationId?: NationId; level: number }
  | { type: "construction-completed"; tileId: TileId; nationId?: NationId; structure: ConstructionKind }
  | { type: "goods-produced"; nationId: NationId; output: ProductionOutput; amount: number }
  | { type: "freight-cars-built"; nationId: NationId; count: number }
  | { type: "building-expanded"; nationId: NationId; building: BuildingType; capacity: number }
  | { type: "workers-trained"; nationId: NationId; to: "trained" | "expert"; count: number }
  | { type: "workers-fed"; nationId: NationId; fed: number; sick: number; starved: number }
  | { type: "workers-recruited"; nationId: NationId; count: number }
  /** `price` is the deal price of one unit. `counterpartyId`: who bought them, in "partners" only (FR-244). */
  | { type: "goods-sold"; nationId: NationId; commodity: TradeCommodity; amount: number; price: number; income: number; counterpartyId?: CountryId }
  /** `price` is the deal price of one unit. `counterpartyId`: who sold them, in "partners" only (FR-244). */
  | { type: "goods-bought"; nationId: NationId; commodity: TradeCommodity; amount: number; price: number; cost: number; counterpartyId?: CountryId }
  /**
   * FR-244: units `counterpartyId` offered that reached `nationId` for a bid it had, and that it could not take
   * (no free hold, or not enough money); they passed on to the next in order.
   */
  | { type: "offer-missed"; nationId: NationId; counterpartyId: CountryId; commodity: TradeCommodity; amount: number; reason: OfferMissedReason }
  /** FR-244: units of the nation's offer nobody bought; they are back in its warehouse. `cause`: why (FR-255). */
  | { type: "offer-unsold"; nationId: NationId; commodity: TradeCommodity; amount: number; cause?: TradeMissCause }
  /**
   * FR-244, "partners" only: units of the nation's bid that no seller let it have (none it may trade with offered
   * them, or they went to others first) and that are not in an `offer-missed`; their reserve is back. `cause`: why (FR-255).
   */
  | { type: "bid-unfilled"; nationId: NationId; commodity: TradeCommodity; amount: number; cause?: TradeMissCause }
  | { type: "turn-ended"; turn: number; year: number }
  /** The last turn has resolved (FR-068): the last turn played, its year and the final scores. */
  | { type: "game-over"; turn: number; year: number; scores: Score[] }
  // Diplomacy (FR-176). `nationId` is the acting Great Power, so another nation's lines get its name (FR-107).
  /** An overture took effect; for an alliance or a peace between two Great Powers each of them gets one. */
  | { type: "overture-done"; nationId: NationId; overture: Exclude<Overture, "war">; targetId: CountryId }
  /** The target Great Power said no (or did not answer in time) to `nationId`'s alliance or peace. */
  | { type: "overture-refused"; nationId: NationId; overture: ProposalKind; targetId: CountryId }
  /** Checked again when resolved, the intent was no longer valid (FR-173); its cost came back. */
  | { type: "overture-failed"; nationId: NationId; overture: WithdrawableOverture; targetId: CountryId; reason: RejectReason; refund: number }
  | { type: "war-declared"; nationId: NationId; targetId: CountryId; startsTurn: number }
  /** Peace dropped `count` attacks of `nationId` on `targetId` ordered this turn (FR-169). */
  | { type: "attacks-cancelled"; nationId: NationId; targetId: CountryId; count: number }
  /**
   * The pair's level moved in this phase (FR-172); one event for each Great Power of the pair. `wars`: the declarations
   * of this phase that moved the pair's points, in the order resolved (FR-239); absent when no war did.
   */
  | { type: "relation-changed"; nationId: NationId; otherId: CountryId; from: number; to: number; wars?: WarCause[] }
  | { type: "grant-paid"; nationId: NationId; targetId: CountryId; amount: GrantAmount }
  | { type: "grant-stopped"; nationId: NationId; targetId: CountryId; amount: GrantAmount; reason: GrantStopReason }
  /** A proposal to `nationId`, a human Great Power, to answer next turn (FR-166, FR-175). */
  | { type: "proposal-received"; nationId: NationId; fromId: NationId; proposalId: string; kind: ProposalKind };

/** A declaration of war named as the reason for a relation change (FR-239). */
export interface WarCause {
  aggressorId: NationId;
  targetId: CountryId;
}

/** Why units offered to a nation for its bid passed on (FR-244). */
export type OfferMissedReason = "no-hold" | "no-cash";

/**
 * Why units of a bid (`bid-unfilled`) or an offer (`offer-unsold`) found no counterparty in the trade phase (FR-255):
 * "nobody": no country offered (for a bid) or wanted (for an offer) the commodity this turn; "barred": every one that
 * did was barred to the nation (FR-185), each with its barrier; "served-first": those it may trade with dealt in it
 * with these other Great Powers first (a minor serves its favourite first, FR-187); "used-up": they had no more to
 * sell, or wanted no more; "no-hold" (an offer only): a buyer still wanted it, but the nation had no free hold left.
 */
export type TradeMissCause =
  | { kind: "nobody" }
  | { kind: "barred"; barred: { countryId: CountryId; barrier: TradeBarrier }[] }
  | { kind: "served-first"; rivalIds: NationId[] }
  | { kind: "used-up" }
  | { kind: "no-hold" };

/** Why a locked grant ended (FR-170). */
export type GrantStopReason = "insufficient-funds" | "withdrawn" | "war";

/** Everything a system may use besides the state itself (FR-012). */
export interface TurnContext {
  /** The turn being resolved. */
  readonly turn: number;
  /** The turn number after resolution; jobs count elapsed turns against it. */
  readonly nextTurn: number;
  /**
   * The shared turn stream: only the development draws (prospecting) and the price draws read it,
   * in that order, as before M5 (FR-150; a scan in tests/engine/purity.test.ts enforces it).
   */
  readonly rng: Rng;
  /**
   * A system's own stream for this turn (FR-150): createTurnRng((seed ^ fnv1a32(name)) >>> 0, turn).
   * Each name is one stream per context, so a second call goes on where the first stopped.
   */
  readonly rngFor: (name: RngStream) => Rng;
  /** The orders accepted this turn, in the order they were applied. */
  readonly orders: readonly Order[];
  readonly emit: (event: GameEvent) => void;
}

export type TurnSystem = (state: GameState, ctx: TurnContext) => GameState;

export interface TurnContextOptions {
  turn: number;
  seed?: number;
  /** Overrides the (seed, turn) RNG; only the pre-M1 adapters pass one. */
  rng?: Rng;
  orders?: readonly Order[];
  emit?: (event: GameEvent) => void;
}

export function createTurnContext(opts: TurnContextOptions): TurnContext {
  const nextTurn = opts.turn + 1;
  const seed = opts.seed ?? 0;
  const streams = new Map<RngStream, Rng>();
  const rngFor = (name: RngStream): Rng => {
    if (!RNG_STREAMS.includes(name)) throw new Error(`Unknown random stream "${name}"; the streams are: ${RNG_STREAMS.join(", ")}`);
    let stream = streams.get(name);
    if (!stream) {
      stream = createStreamRng(seed, opts.turn, name);
      streams.set(name, stream);
    }
    return stream;
  };
  return {
    turn: opts.turn,
    nextTurn,
    rng: opts.rng ?? createTurnRng(seed, nextTurn),
    rngFor,
    orders: opts.orders ?? [],
    emit: opts.emit ?? (() => {}),
  };
}
