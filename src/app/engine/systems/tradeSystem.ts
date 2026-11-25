// Phase 2 of the turn, trade (rules 01 section 1, rules 06). In "world" mode (FR-064, FR-065) every nation's
// deals run at this turn's world price, then the price moves with all nations' volume. The cash of a sale
// comes now; a bid was paid when ordered and its units go on their way to the warehouse, where
// tradeDeliverySystem puts them after transport (usable next turn). In "partners" mode (FR-242 to FR-244)
// every deal has a counterparty (market/settlePartners.ts) and the price moves with the Great Powers' deals.
import type { GameState } from "@/types/GameState";
import type { NationId } from "@/types/Common";
import type { TradeAmounts, TradeOrders } from "@/types/Market";
import { TRADE_COMMODITIES } from "@/definisions/marketPrices";
import { marketOf, nextPrices, priceOf, recordHolds, unitsOf } from "../market/market";
import { marketModeOf } from "../market/partners";
import { settlePartnerTrade } from "../market/settlePartners";
import { hasOpenCredit } from "../credit/account";
import { nextCreditAccount } from "../credit/settlement";
import type { TurnContext, TurnSystem } from "../turn/context";

export const tradeSystem: TurnSystem = (state, ctx) => {
  const trade = marketModeOf(state) === "partners" ? partnersTrade : worldTrade;
  if (!state.nations.some(hasOpenCredit)) return trade(state, ctx);

  // Both markets report the actual sale price here, including subsidies. Refunds share the treasury but do not qualify.
  const receipts = new Map<NationId, number>();
  const traded = trade(state, { ...ctx, emit(event, finalize) {
    if (event.type === "goods-sold") receipts.set(event.nationId, (receipts.get(event.nationId) ?? 0) + event.income);
    ctx.emit(event, finalize);
  } });
  const nations = traded.nations.map(nation => hasOpenCredit(nation)
    ? { ...nation, creditAccount: nextCreditAccount(nation.creditAccount, receipts.get(nation.id) ?? 0) }
    : nation);
  return { ...traded, nations };
};

/**
 * FR-243: the deals, then the FR-065 price step (one drift draw from the shared stream per commodity in
 * TRADE_COMMODITIES order) on the units the Great Powers bought minus the units they sold, as in "world": a deal
 * between two Great Powers nets out, and the minors' fixed offers and demand alone move no price. FR-491: the orders
 * the deals start from are kept in `lastOrders` (the settlement clears `orders`); FR-541: last turn's record moves to
 * `ordersTwoTurnsAgo`.
 */
function partnersTrade(state: GameState, ctx: TurnContext): GameState {
  const lastOrders = publicOrders(state);
  const ordersTwoTurnsAgo = marketOf(state).lastOrders ?? {};
  const { state: settled, sold, bought } = settlePartnerTrade(state, ctx.turn, ctx.emit);
  const market = marketOf(settled);
  return { ...settled, market: { ...market, prices: nextPrices(market.prices, sold, bought, ctx.rng), lastOrders, ordersTwoTurnsAgo } };
}

/** FR-491: each Great Power's bids and offers of this turn, positive amounts only; a nation with none has no entry. */
function publicOrders(state: GameState): Record<NationId, TradeOrders> {
  const orders = marketOf(state).orders;
  const positive = (amounts: TradeAmounts): TradeAmounts =>
    Object.fromEntries(Object.entries(amounts).filter(([, n]) => (n ?? 0) > 0)) as TradeAmounts;
  const entries = state.nations.flatMap((nation): [NationId, TradeOrders][] => {
    if (!Object.hasOwn(orders, nation.id)) return [];
    const sell = positive(orders[nation.id].sell ?? {});
    const buy = positive(orders[nation.id].buy ?? {});
    return Object.keys(sell).length + Object.keys(buy).length > 0 ? [[nation.id, { sell, buy }]] : [];
  });
  return Object.fromEntries(entries);
}

function worldTrade(state: GameState, ctx: TurnContext): GameState {
  const market = marketOf(state);
  const sold: TradeAmounts = {};
  const bought: TradeAmounts = {};
  const deliveries: Record<NationId, TradeAmounts> = { ...market.deliveries };

  const nations = state.nations.map((nation) => {
    if (!Object.hasOwn(market.orders, nation.id)) return state.provinces?.length ? recordHolds(nation, 0) : nation;
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

    const settled = state.provinces?.length ? recordHolds(nation, unitsOf(sell) + unitsOf(buy)) : nation;
    return income > 0 ? { ...settled, treasury: (nation.treasury ?? 0) + income } : settled;
  });

  return {
    ...state,
    nations,
    market: { ...market, prices: nextPrices(market.prices, sold, bought, ctx.rng), orders: {}, deliveries },
  };
}
