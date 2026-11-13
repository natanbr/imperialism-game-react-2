// Phase 2 of the turn, trade (rules 01 section 1, rules 06). In "world" mode (FR-064, FR-065) every nation's
// deals run at this turn's world price, then the price moves with all nations' volume. The cash of a sale
// comes now; a bid was paid when ordered and its units go on their way to the warehouse, where
// tradeDeliverySystem puts them after transport (usable next turn). In "partners" mode (FR-182 to FR-192)
// every deal has a counterparty (market/partnerTrade.ts) and the price moves with the excess demand.
import type { GameState } from "@/types/GameState";
import type { NationId } from "@/types/Common";
import type { TradeAmounts } from "@/types/Market";
import { TRADE_COMMODITIES } from "@/definisions/marketPrices";
import { marketOf, nextPrices, priceOf } from "../market/market";
import { marketModeOf } from "../market/partners";
import { settlePartnerTrade } from "../market/partnerTrade";
import type { TurnContext, TurnSystem } from "../turn/context";

export const tradeSystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState =>
  marketModeOf(state) === "partners" ? partnersTrade(state, ctx) : worldTrade(state, ctx);

/**
 * FR-190: the deals, then the FR-065 price step (one drift draw from the shared stream per commodity in
 * TRADE_COMMODITIES order) on the unfilled bid units minus the unsold offer units.
 */
function partnersTrade(state: GameState, ctx: TurnContext): GameState {
  const { state: settled, unfilled, unsold } = settlePartnerTrade(state, ctx.turn, ctx.emit);
  const market = marketOf(settled);
  return { ...settled, market: { ...market, prices: nextPrices(market.prices, unsold, unfilled, ctx.rng) } };
}

function worldTrade(state: GameState, ctx: TurnContext): GameState {
  const market = marketOf(state);
  const sold: TradeAmounts = {};
  const bought: TradeAmounts = {};
  const deliveries: Record<NationId, TradeAmounts> = { ...market.deliveries };

  const nations = state.nations.map((nation) => {
    if (!Object.hasOwn(market.orders, nation.id)) return nation;
    const { sell, buy } = market.orders[nation.id];

    let income = 0;
    for (const commodity of TRADE_COMMODITIES) {
      const amount = sell[commodity] ?? 0;
      if (amount <= 0) continue;
      const price = priceOf(market, commodity);
      income += amount * price;
      sold[commodity] = (sold[commodity] ?? 0) + amount;
      ctx.emit({ type: "goods-sold", nationId: nation.id, commodity, amount, price, income: amount * price });
    }

    const arriving: TradeAmounts = { ...(deliveries[nation.id] ?? {}) };
    for (const commodity of TRADE_COMMODITIES) {
      const amount = buy[commodity] ?? 0;
      if (amount <= 0) continue;
      const price = priceOf(market, commodity);
      bought[commodity] = (bought[commodity] ?? 0) + amount;
      arriving[commodity] = (arriving[commodity] ?? 0) + amount;
      ctx.emit({ type: "goods-bought", nationId: nation.id, commodity, amount, price, cost: amount * price });
    }
    if (Object.keys(arriving).length > 0) deliveries[nation.id] = arriving;

    return income > 0 ? { ...nation, treasury: (nation.treasury ?? 0) + income } : nation;
  });

  return {
    ...state,
    nations,
    market: { ...market, prices: nextPrices(market.prices, sold, bought, ctx.rng), orders: {}, deliveries },
  };
}
