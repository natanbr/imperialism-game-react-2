// The deals of the "partners" trade phase (FR-185 to FR-192): every unit has a counterparty, a minor nation or
// another Great Power. Commodities settle in BOARD_ORDER, each in three steps: (1) each minor's offer goes to
// the Great Powers that bid for it, in the minor's order (FR-187); (2) each minor's demand is filled from the
// Great Powers that offer it, in the same order; (3) what is left of one Great Power's offer goes to what is
// left of another's bid, sellers and buyers in `intentOrder`. A unit a country cannot take passes on. Pure: no
// random draw (the price step is tradeSystem's) and the input is never changed.
import type { CountryId, MinorNationId, NationId } from "@/types/Common";
import type { DiplomacyState } from "@/types/Diplomacy";
import type { GameState } from "@/types/GameState";
import type { TradeAmounts, TradeCommodity } from "@/types/Market";
import type { Nation } from "@/types/Nation";
import { BOARD_ORDER, TRADE_RELATION_POINTS } from "@/definisions/partnerTrade";
import { MAX_RELATION_POINTS, pairKey, POINTS_PER_LEVEL, relationOf } from "../diplomacy/relations";
import type { GameEvent, OfferMissedReason } from "../turn/context";
import { intentOrder } from "../turn/intents";
import { isGreatPower } from "../world/countries";
import { marketOf, priceOf, tradeOrdersOf } from "./market";
import { minorDemand, minorOffers, partnerRanking, tradeBarrier } from "./partners";

export interface PartnerSettlement {
  /** The state after the deals: treasuries, warehouses (unsold offers back), relations, deliveries; orders cleared. */
  state: GameState;
  /** Per commodity: the units of Great Power bids and minor demand nobody filled (FR-190). */
  unfilled: TradeAmounts;
  /** Per commodity: the units of Great Power and minor offers nobody bought (FR-190). */
  unsold: TradeAmounts;
}

/** One Great Power during the phase: what it still has to spend, carry, buy and sell. */
interface Account {
  treasury: number;
  holds: number;
  bid: TradeAmounts;
  offer: TradeAmounts;
}

const add = (amounts: TradeAmounts, commodity: TradeCommodity, n: number): void => {
  if (n > 0) amounts[commodity] = (amounts[commodity] ?? 0) + n;
};

/** The deal price from the board price P and a subsidy percent, rounded down (FR-189; Imp1 ledgers [06:W35]). */
const dealPrice = (price: number, percent: number): number => Math.max(0, Math.floor((price * (100 + percent)) / 100));
const subsidyOf = (state: GameState, nationId: NationId, otherId: CountryId): number => relationOf(state, nationId, otherId)?.subsidies[nationId] ?? 0;
const levelOf = (points: number): number => Math.floor(Math.min(MAX_RELATION_POINTS, Math.max(0, points)) / POINTS_PER_LEVEL);

export function settlePartnerTrade(state: GameState, turn: number, emit: (event: GameEvent) => void): PartnerSettlement {
  const market = marketOf(state);
  const order = intentOrder(state, turn);
  const minors: MinorNationId[] = state.minorNations.map((m) => m.id).sort();
  const ranking = new Map(minors.map((m) => [m, partnerRanking(state, m, turn)]));
  const offersOf = new Map(minors.map((m) => [m, minorOffers(state, m)]));
  const demandOf = new Map(minors.map((m) => [m, minorDemand(state, m)]));
  const barriers = new Map<string, boolean>();
  const blocked = (nationId: NationId, otherId: CountryId): boolean => {
    const key = `${nationId}>${otherId}`;
    if (!barriers.has(key)) barriers.set(key, tradeBarrier(state, nationId, otherId) !== undefined);
    return barriers.get(key)!;
  };

  const accounts = new Map<NationId, Account>(
    order.map((id) => {
      const nation = state.nations.find((n) => n.id === id)!;
      const { sell, buy } = tradeOrdersOf(state, id);
      return [id, { treasury: nation.treasury ?? 0, holds: Math.max(0, Math.floor(nation.merchantMarine?.holds ?? 0)), bid: { ...buy }, offer: { ...sell } }];
    })
  );
  const deliveries: Record<NationId, TradeAmounts> = { ...market.deliveries };
  const returned = new Map<NationId, TradeAmounts>();
  /** By pair key: the commodity types the pair dealt in (FR-191). */
  const dealt = new Map<string, Set<TradeCommodity>>();
  const unfilled: TradeAmounts = {};
  const unsold: TradeAmounts = {};

  for (const commodity of BOARD_ORDER) {
    const price = priceOf(market, commodity);
    // A bid reserved amount x P when ordered (FR-062); each deal is paid from it first (FR-189).
    const reserve = new Map(order.map((id) => [id, (accounts.get(id)!.bid[commodity] ?? 0) * price]));
    const deals = new Map<string, Extract<GameEvent, { type: "goods-sold" | "goods-bought" }>>();
    const missed = new Map<string, Extract<GameEvent, { type: "offer-missed" }>>();

    const deal = (type: "goods-sold" | "goods-bought", nationId: NationId, counterpartyId: CountryId, unitPrice: number, amount: number) => {
      const key = `${type}|${nationId}|${counterpartyId}`;
      const total = (deals.get(key)?.amount ?? 0) + amount;
      const money = total * unitPrice;
      deals.set(
        key,
        type === "goods-sold"
          ? { type, nationId, commodity, amount: total, price: unitPrice, income: money, counterpartyId }
          : { type, nationId, commodity, amount: total, price: unitPrice, cost: money, counterpartyId }
      );
      const pair = pairKey(nationId, counterpartyId);
      dealt.set(pair, (dealt.get(pair) ?? new Set()).add(commodity));
    };
    const miss = (nationId: NationId, counterpartyId: CountryId, amount: number, reason: OfferMissedReason) => {
      const key = `${nationId}|${counterpartyId}|${reason}`;
      missed.set(key, { type: "offer-missed", nationId, counterpartyId, commodity, amount: (missed.get(key)?.amount ?? 0) + amount, reason });
    };
    /**
     * `reach` units at `unitPrice` reach the buyer for its bid: it takes those its holds and money allow (the
     * reserve first, then the treasury) and the rest pass on (`offer-missed`). Returns the units it took.
     */
    const take = (buyerId: NationId, sellerId: CountryId, unitPrice: number, reach: number): number => {
      const buyer = accounts.get(buyerId)!;
      const reserved = reserve.get(buyerId)!;
      const affordable = unitPrice <= 0 ? Infinity : Math.floor((reserved + Math.max(0, buyer.treasury)) / unitPrice);
      const units = Math.min(reach, buyer.holds, affordable);
      if (units < reach) miss(buyerId, sellerId, reach - units, buyer.holds <= affordable ? "no-hold" : "no-cash");
      if (units <= 0) return 0;
      const cost = units * unitPrice;
      const fromReserve = Math.min(reserved, cost);
      reserve.set(buyerId, reserved - fromReserve);
      buyer.treasury -= cost - fromReserve;
      buyer.holds -= units;
      buyer.bid[commodity] = (buyer.bid[commodity] ?? 0) - units;
      deliveries[buyerId] = { ...(deliveries[buyerId] ?? {}) };
      add(deliveries[buyerId], commodity, units);
      return units;
    };

    // (1) The minors' offers, minors in id order, each unit to the Great Powers in the minor's order.
    for (const minorId of minors) {
      let left = offersOf.get(minorId)![commodity] ?? 0;
      for (const nationId of ranking.get(minorId)!) {
        const wanted = accounts.get(nationId)!.bid[commodity] ?? 0;
        if (left <= 0) break;
        if (wanted <= 0 || blocked(nationId, minorId)) continue;
        const unitPrice = dealPrice(price, subsidyOf(state, nationId, minorId));
        const units = take(nationId, minorId, unitPrice, Math.min(left, wanted));
        if (units > 0) deal("goods-bought", nationId, minorId, unitPrice, units);
        left -= units;
      }
      add(unsold, commodity, left);
    }

    // (2) The minors' demand, filled from the Great Powers in the minor's order; each unit a hold of the seller.
    for (const minorId of minors) {
      let left = demandOf.get(minorId)![commodity] ?? 0;
      for (const nationId of ranking.get(minorId)!) {
        if (left <= 0) break;
        const seller = accounts.get(nationId)!;
        if ((seller.offer[commodity] ?? 0) <= 0 || blocked(nationId, minorId)) continue;
        const units = Math.min(left, seller.offer[commodity]!, seller.holds);
        if (units <= 0) continue;
        const unitPrice = dealPrice(price, -subsidyOf(state, nationId, minorId));
        seller.offer[commodity] = seller.offer[commodity]! - units;
        seller.holds -= units;
        seller.treasury += units * unitPrice;
        left -= units;
        deal("goods-sold", nationId, minorId, unitPrice, units);
      }
      add(unfilled, commodity, left);
    }

    // (3) Great Power to Great Power: the buyer pays P less the seller's subsidy toward it, with its own holds.
    for (const sellerId of order) {
      for (const buyerId of order) {
        const seller = accounts.get(sellerId)!;
        if ((seller.offer[commodity] ?? 0) <= 0) break;
        const wanted = accounts.get(buyerId)!.bid[commodity] ?? 0;
        if (buyerId === sellerId || wanted <= 0 || blocked(sellerId, buyerId)) continue;
        const unitPrice = dealPrice(price, -subsidyOf(state, sellerId, buyerId));
        const units = take(buyerId, sellerId, unitPrice, Math.min(seller.offer[commodity]!, wanted));
        if (units <= 0) continue;
        seller.offer[commodity] = seller.offer[commodity]! - units;
        seller.treasury += units * unitPrice;
        deal("goods-sold", sellerId, buyerId, unitPrice, units);
        deal("goods-bought", buyerId, sellerId, unitPrice, units);
      }
    }

    // What is left: unfilled bids (their reserve refunded) and unsold offers (back in the warehouse).
    const unsoldEvents: GameEvent[] = [];
    for (const nationId of order) {
      const account = accounts.get(nationId)!;
      account.treasury += reserve.get(nationId)!;
      add(unfilled, commodity, account.bid[commodity] ?? 0);
      const back = account.offer[commodity] ?? 0;
      if (back <= 0) continue;
      add(unsold, commodity, back);
      const home = returned.get(nationId) ?? {};
      add(home, commodity, back);
      returned.set(nationId, home);
      unsoldEvents.push({ type: "offer-unsold", nationId, commodity, amount: back });
    }
    for (const event of [...deals.values(), ...missed.values(), ...unsoldEvents]) emit(event);
  }

  const diplomacy = raiseRelations(state, dealt, emit);
  const nations = state.nations.map((nation): Nation => {
    const account = accounts.get(nation.id);
    const home = returned.get(nation.id);
    if (!account || (account.treasury === (nation.treasury ?? 0) && !home)) return nation;
    const warehouse = { ...nation.warehouse } as Record<string, number>;
    for (const [commodity, n] of Object.entries(home ?? {})) warehouse[commodity] = (warehouse[commodity] ?? 0) + (n ?? 0);
    return { ...nation, treasury: account.treasury, warehouse: warehouse as Nation["warehouse"] };
  });

  return {
    state: { ...state, nations, diplomacy, market: { ...market, orders: {}, deliveries } },
    unfilled,
    unsold,
  };
}

/**
 * FR-191, FR-172: each pair that dealt gains TRADE_RELATION_POINTS per commodity type, a Great Power pair only
 * while one of them holds an embassy with the other; within 0 to 89. A level that moved gives each Great Power
 * of the pair a `relation-changed` event, pairs in key order.
 */
function raiseRelations(state: GameState, dealt: ReadonlyMap<string, ReadonlySet<TradeCommodity>>, emit: (event: GameEvent) => void): DiplomacyState {
  if (dealt.size === 0) return state.diplomacy;
  const diplomacy: DiplomacyState = { ...state.diplomacy };
  for (const key of [...dealt.keys()].sort()) {
    const entry = diplomacy[key];
    if (!entry) continue;
    const [a, b] = key.split("|");
    if (isGreatPower(state, a) && isGreatPower(state, b) && entry.embassies.length === 0) continue;
    const points = Math.min(MAX_RELATION_POINTS, Math.max(0, entry.points + dealt.get(key)!.size * TRADE_RELATION_POINTS));
    if (points === entry.points) continue;
    diplomacy[key] = { ...entry, points };
    const from = levelOf(entry.points);
    const to = levelOf(points);
    if (from === to) continue;
    for (const nationId of [a, b].filter((id) => isGreatPower(state, id))) {
      emit({ type: "relation-changed", nationId, otherId: nationId === a ? b : a, from, to });
    }
  }
  return diplomacy;
}
