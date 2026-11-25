// What the market dialog shows, derived from the game (FR-073). No React, no store: the dialog
// renders this view and sends orders; the engine stays the judge of every order.
import { marketOf, priceOf, tradeCapacityOf, tradeOrdersOf, validateOrder, type TradeCapacity } from "@/engine";
import { nextPurchaseForecasts } from "@/engine/army/upkeepForecast";
import { buyingPower, hasOpenCredit } from "@/engine/credit/account";
import { MAX_BUY_BIDS, TRADE_COMMODITIES } from "@/definisions/marketPrices";
import { worldMarketSupplies } from "@/engine/market/market";
import type { GameState } from "@/types/GameState";
import type { TradeCommodity } from "@/types/Market";
import type { Nation } from "@/types/Nation";
import { goodsSourceNotes } from "../goodsSources";
import { commodityName, fundsNeededText, spendingWarningText } from "../gameText";

export interface MarketRowView {
  commodity: TradeCommodity;
  name: string;
  sourceNote?: string;
  /** This turn's world price in dollars. */
  price: number;
  /** In the warehouse now (offered units have already left it, FR-061). */
  stock: number;
  /** This turn's offer and bid in units. */
  sell: number;
  buy: number;
  buyRefusal?: string;
  purchaseWarning?: string;
}

export interface MarketView {
  rows: MarketRowView[];
  treasury: number;
  buyingPower?: number;
  capacity: TradeCapacity;
  /** Commodities bid on this turn, of the most the engine accepts (FR-062). */
  bids: { used: number; max: number };
}

/** The next allowed unit is paid for now. Its premium and upkeep are projected from public information. */
export function purchaseWarnings(state: GameState, nation: Nation) {
  const preview = nextPurchaseForecasts(state, nation);
  return (commodity: TradeCommodity, price: number): string | undefined => {
    const forecast = preview(commodity, price);
    return forecast && spendingWarningText(forecast, nation.treasury - price);
  };
}

export function marketView(state: GameState, nation: Nation): MarketView {
  const market = marketOf(state);
  const { sell, buy } = tradeOrdersOf(state, nation.id);
  const stock = nation.warehouse as Record<string, number>;
  const sources = goodsSourceNotes(state, nation, "market");
  const warningFor = purchaseWarnings(state, nation);
  const rows = TRADE_COMMODITIES.map((commodity): MarketRowView => {
    const amount = (buy[commodity] ?? 0) + 1;
    const price = priceOf(market, commodity);
    const check = validateOrder(state, { kind: "buyCommodity", nationId: nation.id, commodity, amount });
    const buyRefusal = !worldMarketSupplies(nation, commodity) ? "No oil supplier" : "cost" in check ? fundsNeededText(check.cost, check.buyingPower) : undefined;
    return {
      commodity,
      name: commodityName(commodity),
      sourceNote: sources.get(commodity),
      price,
      stock: stock[commodity] ?? 0,
      sell: sell[commodity] ?? 0,
      buy: buy[commodity] ?? 0,
      buyRefusal,
      purchaseWarning: check.ok ? warningFor(commodity, price) : undefined,
    };
  });
  return {
    rows,
    treasury: nation.treasury,
    ...(hasOpenCredit(nation) ? { buyingPower: buyingPower(nation) } : {}),
    capacity: tradeCapacityOf(state, nation.id),
    bids: { used: rows.filter((r) => r.buy > 0).length, max: MAX_BUY_BIDS },
  };
}
