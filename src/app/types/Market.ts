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

export interface WorldMarket {
  /** World price per unit in whole dollars; this turn's deals use it (FR-065 moves it). */
  prices: Record<TradeCommodity, number>;
  /** This turn's offers and bids by nation; a nation with none has no entry. Cleared by the trade phase. */
  orders: Record<NationId, TradeOrders>;
  /** Units bought this turn, on their way to the warehouse (delivered after transport, FR-064). */
  deliveries: Record<NationId, TradeAmounts>;
}
