// The world market (FR-060 to FR-065): the lookups the trade orders, the trade phase and the UI
// share, and the price step. One market per game; every nation trades on it.
import type { GameState } from "@/types/GameState";
import type { MarketMode, TradeAmounts, TradeCommodity, TradeOrders, WorldMarket } from "@/types/Market";
import {
  PRICE_CEILING,
  PRICE_DRIFT,
  PRICE_FLOOR,
  PRICE_PUSH_CAP,
  PRICE_PUSH_PER_UNIT,
  START_PRICES,
  TRADE_COMMODITIES,
} from "@/definisions/marketPrices";
import type { Rng } from "../rng";
import { nationById } from "../orders/queries";

/** A tradeable commodity, checked against own keys only (FR-026: names come from untrusted orders). */
export const isTradeCommodity = (key: unknown): key is TradeCommodity =>
  typeof key === "string" && Object.hasOwn(START_PRICES, key);

/**
 * The market of a new game: start prices, no orders, nothing on its way. A new object each call. A "world"
 * market has no `mode` key, the v1 shape (FR-242).
 */
export const startMarket = (mode: MarketMode = "world"): WorldMarket => ({
  ...(mode === "partners" ? { mode } : {}),
  prices: { ...START_PRICES },
  orders: {},
  deliveries: {},
});

/** The game's market; a hand-built state without one trades on the start market. */
export const marketOf = (state: GameState): WorldMarket => state.market ?? startMarket();

/** This turn's world price of the commodity. */
export const priceOf = (market: WorldMarket, commodity: TradeCommodity): number =>
  market.prices[commodity] ?? START_PRICES[commodity];

/** The nation's offers and bids this turn; none when it has not traded. */
export function tradeOrdersOf(state: GameState, nationId: string): TradeOrders {
  const { orders } = marketOf(state);
  return Object.hasOwn(orders, nationId) ? orders[nationId] : { sell: {}, buy: {} };
}

export const unitsOf = (amounts: TradeAmounts): number =>
  Object.values(amounts).reduce<number>((sum, n) => sum + (n ?? 0), 0);

export interface TradeCapacity {
  /** Cargo holds: units the nation may trade this turn, sales and purchases together (FR-063). */
  holds: number;
  /** Units offered or bid for this turn. */
  used: number;
  free: number;
}

export function tradeCapacityOf(state: GameState, nationId: string): TradeCapacity {
  const holds = Math.max(0, Math.floor(nationById(state, nationId)?.merchantMarine?.holds ?? 0));
  const { sell, buy } = tradeOrdersOf(state, nationId);
  const used = unitsOf(sell) + unitsOf(buy);
  return { holds, used, free: Math.max(0, holds - used) };
}

const clamp = (n: number, low: number, high: number): number => Math.min(high, Math.max(low, n));

/**
 * The prices after a turn's deals (FR-065): for each commodity in TRADE_COMMODITIES order, one
 * draw from the turn RNG gives a drift of at most PRICE_DRIFT either way; the net units bought by
 * all nations push the price by PRICE_PUSH_PER_UNIT each, at most PRICE_PUSH_CAP; the result is
 * rounded to whole dollars and kept between PRICE_FLOOR and PRICE_CEILING times the start price.
 * Every commodity draws every turn, so the same seed gives the same prices whoever traded.
 */
export function nextPrices(
  prices: Readonly<Partial<Record<TradeCommodity, number>>>,
  sold: TradeAmounts,
  bought: TradeAmounts,
  rng: Rng
): Record<TradeCommodity, number> {
  const next = {} as Record<TradeCommodity, number>;
  for (const commodity of TRADE_COMMODITIES) {
    const drift = (rng.next() * 2 - 1) * PRICE_DRIFT;
    const net = (bought[commodity] ?? 0) - (sold[commodity] ?? 0);
    const push = clamp(net * PRICE_PUSH_PER_UNIT, -PRICE_PUSH_CAP, PRICE_PUSH_CAP);
    const start = START_PRICES[commodity];
    const price = prices[commodity] ?? start;
    next[commodity] = clamp(Math.round(price * (1 + drift + push)), Math.ceil(start * PRICE_FLOOR), Math.floor(start * PRICE_CEILING));
  }
  return next;
}
