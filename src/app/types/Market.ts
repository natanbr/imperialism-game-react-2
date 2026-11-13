// The world market (FR-060): one per game, shared by every nation.
import type { NationId } from "./Common";
import type { GoodsType, MaterialType, ResourceType } from "./Resource";

/** What the world market trades: every warehouse commodity except raw food, gold and gems (rules 06). */
export type TradeCommodity =
  | GoodsType
  | MaterialType
  | ResourceType.Cotton
  | ResourceType.Wool
  | ResourceType.Horses
  | ResourceType.Timber
  | ResourceType.Coal
  | ResourceType.IronOre
  | ResourceType.Oil;

/** Units by commodity; a missing commodity is 0. */
export type TradeAmounts = Partial<Record<TradeCommodity, number>>;

/** One nation's offers and bids for this turn (FR-061, FR-062). */
export interface TradeOrders {
  sell: TradeAmounts;
  buy: TradeAmounts;
}

/**
 * How the trade phase settles (FR-242): "world" is the v1 world market, an unlimited buyer and seller at
 * the world price (FR-060 to FR-065); "partners" settles every deal with a counterparty, a minor nation or
 * another Great Power (FR-183 to FR-191, FR-244).
 */
export type MarketMode = "world" | "partners";

export interface WorldMarket {
  /**
   * FR-242: "partners" on the continent. Absent means "world": the world market keeps the v1 shape
   * exactly, so every v1 assertion on it holds. Read it through `marketModeOf`.
   */
  mode?: MarketMode;
  /** World price per unit in whole dollars; this turn's deals use it (FR-065 moves it). */
  prices: Record<TradeCommodity, number>;
  /** This turn's offers and bids by nation; a nation with none has no entry. Cleared by the trade phase. */
  orders: Record<NationId, TradeOrders>;
  /** Units bought this turn, on their way to the warehouse (delivered after transport, FR-064). */
  deliveries: Record<NationId, TradeAmounts>;
}
