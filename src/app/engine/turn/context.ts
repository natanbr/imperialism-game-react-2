import type { GameState } from "@/types/GameState";
import type { NationId, TileId } from "@/types/Common";
import type { ResourceType } from "@/types/Resource";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import type { BuildingType, ProductionOutput } from "@/types/Industry";
import type { TradeCommodity } from "@/types/Market";
import type { Order, RejectReason } from "../orders/Order";
import { createTurnRng, type Rng } from "../rng";

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
  | { type: "turn-ended"; turn: number; year: number };

/** Everything a system may use besides the state itself (FR-012). */
export interface TurnContext {
  /** The turn being resolved. */
  readonly turn: number;
  /** The turn number after resolution; jobs count elapsed turns against it. */
  readonly nextTurn: number;
  readonly rng: Rng;
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
  return {
    turn: opts.turn,
    nextTurn,
    rng: opts.rng ?? createTurnRng(opts.seed ?? 0, nextTurn),
    orders: opts.orders ?? [],
    emit: opts.emit ?? (() => {}),
  };
}
