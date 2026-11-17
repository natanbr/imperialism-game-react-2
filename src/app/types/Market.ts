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
  /**
   * FR-491 (M13, card Q118 (a)): in "partners", each Great Power's bids and offers of the last trade phase, the units as
   * ordered (positive amounts only; a nation with none has no entry), public on the next turn as Imp1's Trade Book lists
   * the bidding and offering nations. Optional: a "world" market and a game saved before M13 have none, which reads as
   * empty (`lastTradeOrdersOf`), so those saves still load. Written by the trade phase only.
   */
  lastOrders?: Record<NationId, TradeOrders>;
  /**
   * FR-541 (M13 final round): in "partners", the `lastOrders` of the trade phase before the last one, moved here by each
   * trade phase: the Board a person of the nation saw two turns ago. The scripted Great Power keeps a bid the other one may
   * be answering (scriptedGreatPowerTrade.ts). Optional like `lastOrders`: absent reads as empty, so older saves load.
   */
  ordersTwoTurnsAgo?: Record<NationId, TradeOrders>;
}
