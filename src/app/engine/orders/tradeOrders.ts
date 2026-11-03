// World-market orders (FR-061 to FR-063). Validation reads the state; apply returns a new one.
// An order sets this turn's amount for one commodity: goods offered leave the warehouse and bids
// are paid at once, and a lower amount gives the difference back, as for every other order.
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import type { TradeCommodity, TradeOrders } from "@/types/Market";
import { MAX_BUY_BIDS } from "@/definisions/marketPrices";
import { isTradeCommodity, marketOf, priceOf, tradeCapacityOf, tradeOrdersOf } from "../market/market";
import type { BuyCommodityOrder, RejectReason, SellCommodityOrder, ValidationResult } from "./Order";

const OK: ValidationResult = { ok: true };
const reject = (reason: RejectReason): ValidationResult => ({ ok: false, reason });

type Side = keyof TradeOrders;
type TradeOrder = SellCommodityOrder | BuyCommodityOrder;

const sideOf = (order: TradeOrder): Side => (order.kind === "sellCommodity" ? "sell" : "buy");
const stockOf = (nation: Nation, commodity: TradeCommodity): number =>
  (nation.warehouse as Record<string, number>)[commodity] ?? 0;
const bidCount = (orders: TradeOrders): number => Object.values(orders.buy).filter((n) => (n ?? 0) > 0).length;

export function validateTradeOrder(state: GameState, nation: Nation, order: TradeOrder): ValidationResult {
  const { commodity, amount } = order;
  if (!isTradeCommodity(commodity)) return reject("invalid-target");
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0) return reject("invalid-amount");

  const side = sideOf(order);
  const orders = tradeOrdersOf(state, nation.id);
  const current = orders[side][commodity] ?? 0;
  if (amount <= current) return OK; // lowering an offer or a bid is always allowed

  // Rules 06 section 2: no offer and bid on the same commodity, at most 4 bids a turn.
  const otherSide = side === "sell" ? orders.buy : orders.sell;
  if ((otherSide[commodity] ?? 0) > 0) return reject("invalid-target");
  if (side === "buy" && current === 0 && bidCount(orders) >= MAX_BUY_BIDS) return reject("limit-reached");

  const added = amount - current;
  const { holds, used } = tradeCapacityOf(state, nation.id);
  if (used + added > holds) return reject("limit-reached");

  if (side === "sell") return stockOf(nation, commodity) >= added ? OK : reject("insufficient-resources");
  return (nation.treasury ?? 0) >= added * priceOf(marketOf(state), commodity) ? OK : reject("insufficient-funds");
}

/** Sets the nation's amount for the commodity on one side; empty entries are dropped. */
function withTradeOrder(state: GameState, nationId: string, side: Side, commodity: TradeCommodity, amount: number): GameState {
  const market = marketOf(state);
  const current = tradeOrdersOf(state, nationId);
  const amounts = { ...current[side] };
  if (amount > 0) amounts[commodity] = amount;
  else delete amounts[commodity];
  const next: TradeOrders = { ...current, [side]: amounts };

  const orders = { ...market.orders };
  if (Object.keys(next.sell).length === 0 && Object.keys(next.buy).length === 0) delete orders[nationId];
  else orders[nationId] = next;
  return { ...state, market: { ...market, orders } };
}

function updateNation(state: GameState, nationId: string, fn: (nation: Nation) => Nation): GameState {
  return { ...state, nations: state.nations.map((n) => (n.id === nationId ? fn(n) : n)) };
}

/** Offered units leave the warehouse now; a lower offer returns the difference (FR-061). */
export function applySellCommodity(state: GameState, order: SellCommodityOrder): GameState {
  const added = order.amount - (tradeOrdersOf(state, order.nationId).sell[order.commodity] ?? 0);
  const paid = updateNation(state, order.nationId, (nation) => ({
    ...nation,
    warehouse: { ...nation.warehouse, [order.commodity]: stockOf(nation, order.commodity) - added },
  }));
  return withTradeOrder(paid, order.nationId, "sell", order.commodity, order.amount);
}

/** A bid is paid now at this turn's world price; a lower bid is refunded at the same price (FR-062). */
export function applyBuyCommodity(state: GameState, order: BuyCommodityOrder): GameState {
  const added = order.amount - (tradeOrdersOf(state, order.nationId).buy[order.commodity] ?? 0);
  const cost = added * priceOf(marketOf(state), order.commodity);
  const paid = updateNation(state, order.nationId, (nation) => ({ ...nation, treasury: nation.treasury - cost }));
  return withTradeOrder(paid, order.nationId, "buy", order.commodity, order.amount);
}
