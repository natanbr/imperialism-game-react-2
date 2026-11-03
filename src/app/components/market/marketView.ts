// What the market dialog shows, derived from the game (FR-073). No React, no store: the dialog
// renders this view and sends orders; the engine stays the judge of every order.
import { marketOf, priceOf, tradeCapacityOf, tradeOrdersOf, type TradeCapacity } from "@/engine";
import { MAX_BUY_BIDS, TRADE_COMMODITIES } from "@/definisions/marketPrices";
import type { GameState } from "@/types/GameState";
import type { TradeCommodity } from "@/types/Market";
import type { Nation } from "@/types/Nation";
import { commodityName } from "../gameText";

export interface MarketRowView {
  commodity: TradeCommodity;
  name: string;
  /** This turn's world price in dollars. */
  price: number;
  /** In the warehouse now (offered units have already left it, FR-061). */
  stock: number;
  /** This turn's offer and bid in units. */
  sell: number;
  buy: number;
}

export interface MarketView {
  rows: MarketRowView[];
  treasury: number;
  capacity: TradeCapacity;
  /** Commodities bid on this turn, of the most the engine accepts (FR-062). */
  bids: { used: number; max: number };
}

export function marketView(state: GameState, nation: Nation): MarketView {
  const market = marketOf(state);
  const { sell, buy } = tradeOrdersOf(state, nation.id);
  const stock = nation.warehouse as Record<string, number>;
  const rows = TRADE_COMMODITIES.map((commodity): MarketRowView => ({
    commodity,
    name: commodityName(commodity),
    price: priceOf(market, commodity),
    stock: stock[commodity] ?? 0,
    sell: sell[commodity] ?? 0,
    buy: buy[commodity] ?? 0,
  }));
  return {
    rows,
    treasury: nation.treasury,
    capacity: tradeCapacityOf(state, nation.id),
    bids: { used: rows.filter((r) => r.buy > 0).length, max: MAX_BUY_BIDS },
  };
}
