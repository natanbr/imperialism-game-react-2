// The scripted Great Power's trade with the other Great Power in a "partners" market (M13, FR-493, card Q118 (a)).
// economy.ts `planTrade` adds these amounts to the caps it takes from the minors (scriptedPartners.ts) and bids for the
// `buy` amounts after the bids for its mills' inputs. It reads only what a human of the nation could see (FR-497):
// its own state, the diplomacy record (the Diplomacy screen) and the other Great Powers' public orders of last turn
// (FR-491), never another nation's orders of this turn.
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { TradeAmounts, TradeCommodity } from "@/types/Market";
import { GoodsType, MaterialType } from "@/types/Resource";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
import { marketOf, priceOf } from "../market/market";
import { lastTradeOrdersOf, marketModeOf, tradeBarrier } from "../market/partners";
import { turnLimitOf } from "../turn/gameOver";

/** What the nation may trade with another Great Power this turn, beyond what the minors it may trade with offer and want. */
export interface GreatPowerTradeCaps {
  /** FR-493 (a): units it bids for from another Great Power; each is both the bid and its cap above the minors' supply. */
  buy: TradeAmounts;
  /** FR-493 (b): units its offers may add above the minors' demand (another Great Power's bids of last turn). */
  sell: TradeAmounts;
  /**
   * FR-493 (a), M13 T-15: the commodities of `buy` another Great Power it may trade with offered last turn (FR-491).
   * `planTrade` bids for these before its mills' inputs, so a rival that answers its bid finds it again; the others after.
   */
  offeredLastTurn: TradeCommodity[];
}

/** FR-493 (a): at most this many lumber and this many steel a turn (two pairs: the 4 holds of FR-063). */
export const RIVAL_PAIR_BID = 2;

/** The goods it offers in "partners" (FR-245 (c)); FR-493 (b) raises only their caps. */
const GOODS: readonly TradeCommodity[] = [GoodsType.Clothing, GoodsType.Furniture, GoodsType.Hardware];

/** A lumber + steel pair expands one capacity point (FR-128's PAIR_VALUE, economy.ts; not imported: economy.ts imports this file). */
const PAIR_VALUE = SCORE_WEIGHTS.pointsPerCapacity * SCORE_WEIGHTS.dollarsPerPoint;

/**
 * FR-493: the caps of this turn, from the state as `planTrade` sees it after the consulate and the grants, and the
 * projected warehouse at the start of next turn (`next`: this turn's run and shipment in, before trade). Only in
 * "partners" (FR-498), and only toward a Great Power it may trade with in this End Turn's trade phase as it knows it
 * (`tradeBarrier`, FR-185, FR-246: not at war, no boycott). M13 review EFD-1: its own war or boycott ordered this turn
 * already counts (planWarDeclaration runs first); the order-time check alone did not stop an offer raised for a rival it
 * was declaring war on, because the minors that want the good are buyers too. The other nation's orders of this turn
 * are not read (FR-497).
 */
export function greatPowerTradeCaps(state: GameState, nationId: NationId, next: Readonly<Record<string, number>>): GreatPowerTradeCaps {
  if (marketModeOf(state) !== "partners") return { buy: {}, sell: {}, offeredLastTurn: [] };
  const rivals = state.nations
    .map((n) => n.id)
    .filter((id) => id !== nationId && tradeBarrier(state, nationId, id) === undefined)
    .sort();
  if (rivals.length === 0) return { buy: {}, sell: {}, offeredLastTurn: [] };
  const buy = pairBids(state, next);
  const own = lastTradeOrdersOf(state, nationId);
  const offeredLastTurn = (Object.keys(buy) as TradeCommodity[]).filter((c) =>
    rivals.some((id) => {
      const theirs = lastTradeOrdersOf(state, id);
      if ((theirs.sell[c] ?? 0) > 0) return true;
      const traded = [...Object.values(theirs.sell), ...Object.values(theirs.buy)].some((n) => (n ?? 0) > 0);
      return (own.buy[c] ?? 0) > 0 && traded && (theirs.buy[c] ?? 0) === 0;
    })
  );
  return { buy, sell: rivalBids(state, rivals), offeredLastTurn };
}

/**
 * FR-493 (a), the pairs FR-128 would buy in "world": while a lumber + steel pair costs less than PAIR_VALUE and a turn
 * follows, the side that pairs next turn's stock first (steel for lumber over steel, and the other way round), then
 * whole pairs, at most RIVAL_PAIR_BID of each. Cash, holds and the reserve are `planTrade`'s `bid` limits.
 */
function pairBids(state: GameState, next: Readonly<Record<string, number>>): TradeAmounts {
  if (turnLimitOf(state) - state.turn <= 0) return {};
  const market = marketOf(state);
  if (priceOf(market, MaterialType.Lumber) + priceOf(market, MaterialType.Steel) >= PAIR_VALUE) return {};
  const lumber = next[MaterialType.Lumber] ?? 0;
  const steel = next[MaterialType.Steel] ?? 0;
  const lumberUp = Math.min(RIVAL_PAIR_BID, Math.max(0, steel - lumber));
  const steelUp = Math.min(RIVAL_PAIR_BID, Math.max(0, lumber - steel));
  const pairs = RIVAL_PAIR_BID - Math.max(lumberUp, steelUp);
  const bids: TradeAmounts = {};
  if (lumberUp + pairs > 0) bids[MaterialType.Lumber] = lumberUp + pairs;
  if (steelUp + pairs > 0) bids[MaterialType.Steel] = steelUp + pairs;
  return bids;
}

/** FR-493 (b): what the other Great Powers it may trade with bid last turn for each good (FR-491). */
function rivalBids(state: GameState, rivals: readonly NationId[]): TradeAmounts {
  const caps: TradeAmounts = {};
  for (const commodity of GOODS) {
    const units = rivals.reduce((sum, id) => sum + (lastTradeOrdersOf(state, id).buy[commodity] ?? 0), 0);
    if (units > 0) caps[commodity] = units;
  }
  return caps;
}
