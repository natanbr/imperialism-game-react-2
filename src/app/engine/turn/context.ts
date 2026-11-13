import type { GameState } from "@/types/GameState";
import type { NationId, TileId } from "@/types/Common";
import type { ResourceType } from "@/types/Resource";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import type { BuildingType, ProductionOutput } from "@/types/Industry";
import type { TradeCommodity } from "@/types/Market";
import type { Score } from "@/types/Score";
import type { Order, RejectReason } from "../orders/Order";
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
  | { type: "goods-sold"; nationId: NationId; commodity: TradeCommodity; amount: number; price: number; income: number }
  | { type: "goods-bought"; nationId: NationId; commodity: TradeCommodity; amount: number; price: number; cost: number }
  | { type: "turn-ended"; turn: number; year: number }
  /** The last turn has resolved (FR-068): the last turn played, its year and the final scores. */
  | { type: "game-over"; turn: number; year: number; scores: Score[] };

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
