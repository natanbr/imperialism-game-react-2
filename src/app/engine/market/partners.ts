// Nation-to-nation trade (M7): who offers and wants what, who may trade with whom, and whom a minor favours.
// Pure reads shared by the trade phase, the scripted player and the Board of Trade screen.
import type { CountryId, MinorNationId, NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { MarketMode, TradeAmounts, TradeCommodity } from "@/types/Market";
import { BOARD_ORDER, MINOR_DEMAND, MINOR_OFFER_CAP } from "@/definisions/partnersMarket";
import { relationOf } from "../diplomacy/relations";
import { diplomacySystem } from "../systems/diplomacySystem";
import { createTurnContext } from "../turn/context";
import { intentOrder } from "../turn/intents";
import { isGreatPower, minorNationById } from "../world/countries";
import { isTradeCommodity, marketOf, priceOf, tradeOrdersOf } from "./market";
import { nationById } from "../orders/queries";

/** The market's mode (FR-242; read as "world" when the market has no mode, or there is no market). */
export const marketModeOf = (state: GameState): MarketMode => state.market?.mode ?? "world";

/**
 * What the minor offers this turn (FR-183, Q27): for each tradeable resource, one unit per tile of its
 * provinces that holds it (found), at most MINOR_OFFER_CAP; nothing for a colony or an unknown id. The
 * stock is endless: units not sold vanish and the same offer comes every turn.
 */
export function minorOffers(state: GameState, minorId: MinorNationId): TradeAmounts {
  const minor = minorNationById(state, minorId);
  if (!minor || minor.colonyOf !== undefined) return {};
  const tileIds = new Set(state.provinces.filter((p) => p.ownerId === minorId).flatMap((p) => p.tileIds));
  const offers: TradeAmounts = {};
  for (const tile of state.map.tiles.flat()) {
    const resource = tile.resource;
    if (!tileIds.has(tile.id) || !resource || resource.discovered === false || !isTradeCommodity(resource.type)) continue;
    offers[resource.type] = Math.min(MINOR_OFFER_CAP, (offers[resource.type] ?? 0) + 1);
  }
  return offers;
}

/**
 * What the minor bids for this turn (FR-184, Q27): 2 clothing, 2 furniture, 2 hardware; nothing for a colony
 * (FR-249: its trade is its owner's, as for its offers) or an unknown id.
 */
export function minorDemand(state: GameState, minorId: MinorNationId): TradeAmounts {
  const minor = minorNationById(state, minorId);
  return minor && minor.colonyOf === undefined ? { ...MINOR_DEMAND } : {};
}

/**
 * The Great Powers in the order the minor deals with them (FR-187, Q28): highest relation points plus half
 * the subsidy percent that Great Power set toward it first; ties in `intentOrder` of the turn.
 */
export function partnerRanking(state: GameState, minorId: MinorNationId, turn: number = state.turn): NationId[] {
  const order = intentOrder(state, turn);
  const weight = (nationId: NationId): number => {
    const entry = relationOf(state, nationId, minorId);
    return entry ? entry.points + (entry.subsidies[nationId] ?? 0) / 2 : -Infinity;
  };
  return order
    .map((nationId, index) => ({ nationId, index, weight: weight(nationId) }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map(({ nationId }) => nationId);
}

/** The Great Power the minor offers to first and sells to first this turn (FR-187). */
export const favouritePartner = (state: GameState, minorId: MinorNationId): NationId | undefined => partnerRanking(state, minorId)[0];

/** Why two countries may not trade this turn (FR-185); undefined when they may. */
export type TradeBarrier = "not-a-partner" | "at-war" | "boycott" | "no-consulate";

/**
 * Why `nationId` (a Great Power) may not trade with `countryId` on the diplomacy record as it stands, or
 * undefined when it may (FR-185): at war, a boycott by either side, or, with a minor, no consulate. Minors never
 * trade with each other, nor anyone with itself or an unknown country. The trade phase reads this: the diplomacy
 * phase before it has already settled this turn's intents.
 */
export function settledTradeBarrier(state: GameState, nationId: NationId, countryId: CountryId): TradeBarrier | undefined {
  if (!isGreatPower(state, nationId) || nationId === countryId) return "not-a-partner";
  const entry = relationOf(state, nationId, countryId);
  if (!entry) return "not-a-partner";
  if (entry.war) return "at-war";
  if (entry.boycotts.length > 0) return "boycott";
  if (isGreatPower(state, countryId)) return undefined;
  return entry.consulates.includes(nationId) ? undefined : "no-consulate";
}

/** By state (states are never changed): the state after this turn's diplomacy phase, events dropped. */
const afterDiplomacy = new WeakMap<GameState, GameState>();

/**
 * The state as the trade phase of this End Turn will find it (FR-246): this turn's diplomacy intents resolved
 * by the diplomacy phase itself (a consulate, a war, a peace, a boycott set or lifted, and any of them failing),
 * events dropped. A peace or an alliance a human Great Power still has to answer is not made until it answers.
 */
export function diplomacyAfterThisTurn(state: GameState): GameState {
  let next = afterDiplomacy.get(state);
  if (!next) {
    next = diplomacySystem(state, createTurnContext({ turn: state.turn, seed: state.seed }));
    afterDiplomacy.set(state, next);
  }
  return next;
}

/**
 * Why `nationId` may not trade with `countryId` in this End Turn's trade phase, or undefined when it may
 * (FR-185, FR-246): `settledTradeBarrier` on the record after this turn's diplomacy phase, so the Board of Trade
 * and the scripted player see what the trade phase will (a consulate ordered this turn counts; a war declared
 * this turn already stops trade; a boycott set or lifted this turn already counts).
 */
export const tradeBarrier = (state: GameState, nationId: NationId, countryId: CountryId): TradeBarrier | undefined =>
  settledTradeBarrier(diplomacyAfterThisTurn(state), nationId, countryId);

export interface BoardSeller {
  minorId: MinorNationId;
  units: number;
  /** The Great Power the minor offers to first this turn (FR-187). */
  favouriteId?: NationId;
  /** Why the nation the board is for may not buy from it; absent when it may. */
  barrier?: TradeBarrier;
}

export interface BoardBuyer {
  minorId: MinorNationId;
  units: number;
  favouriteId?: NationId;
  barrier?: TradeBarrier;
}

export interface BoardRow {
  commodity: TradeCommodity;
  /** The board price: last turn's world price, the base of every deal this turn (FR-189). */
  price: number;
  /** In the nation's warehouse now (offered units have already left it, FR-061). */
  available: number;
  /** The nation's bid and offer this turn, in units. */
  bid: number;
  offer: number;
  /** The minors that offer the commodity this turn, in id order (FR-183). */
  sellers: BoardSeller[];
  /** The minors that bid for it this turn, in id order (FR-184). */
  buyers: BoardBuyer[];
}

/**
 * The Board of Trade for one Great Power (FR-194): a row per tradeable commodity in BOARD_ORDER with the
 * board price, its stock, its bid and offer, and the minors that offer or want the commodity, each with
 * its favourite and, when the nation may not trade with it, why; the barriers and favourites as the trade
 * phase of this End Turn will find them (FR-246). Works in either mode; the screen shows the minors' columns
 * in "partners" only.
 */
export function boardOfTrade(state: GameState, nationId: NationId): BoardRow[] {
  const market = marketOf(state);
  const { sell, buy } = tradeOrdersOf(state, nationId);
  const stock = (nationById(state, nationId)?.warehouse ?? {}) as Record<string, number>;
  const after = diplomacyAfterThisTurn(state);
  const minors = [...state.minorNations].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((minor) => {
    const barrier = settledTradeBarrier(after, nationId, minor.id);
    return {
      minorId: minor.id,
      offers: minorOffers(state, minor.id),
      demand: minorDemand(state, minor.id),
      favouriteId: favouritePartner(after, minor.id),
      ...(barrier ? { barrier } : {}),
    };
  });
  const entry = (m: (typeof minors)[number], units: number) => ({
    minorId: m.minorId,
    units,
    ...(m.favouriteId ? { favouriteId: m.favouriteId } : {}),
    ...(m.barrier ? { barrier: m.barrier } : {}),
  });
  return BOARD_ORDER.map((commodity): BoardRow => ({
    commodity,
    price: priceOf(market, commodity),
    available: stock[commodity] ?? 0,
    bid: buy[commodity] ?? 0,
    offer: sell[commodity] ?? 0,
    sellers: minors.filter((m) => (m.offers[commodity] ?? 0) > 0).map((m) => entry(m, m.offers[commodity]!)),
    buyers: minors.filter((m) => (m.demand[commodity] ?? 0) > 0).map((m) => entry(m, m.demand[commodity]!)),
  }));
}
