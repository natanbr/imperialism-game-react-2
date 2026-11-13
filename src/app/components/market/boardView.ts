// What the Board of Trade shows (FR-194, FR-248, FR-251 to FR-254, FR-257), derived from the engine's `boardOfTrade`.
// No React, no store: the dialog renders this view and sends orders; the engine stays the judge of every order.
import {
  boardOfTrade,
  buyersOf,
  countryName,
  tradeBarrier,
  tradeCapacityOf,
  validateOrder,
  type BoardBuyer,
  type BoardSeller,
  type RejectReason,
  type TradeBarrier,
  type TradeCapacity,
} from "@/engine";
import { MAX_BUY_BIDS } from "@/definisions/marketPrices";
import type { GameState } from "@/types/GameState";
import type { TradeCommodity } from "@/types/Market";
import type { Nation } from "@/types/Nation";
import { commodityName, REFUSAL_TEXT } from "../gameText";
import { namesText } from "./dealBookView";

/** Why the player cannot trade with a minor this turn (FR-185), as the board marks it. */
export const BARRIER_TEXT: Record<TradeBarrier, string> = {
  "no-consulate": "no consulate",
  "at-war": "at war",
  boycott: "boycott",
  "not-a-partner": "no trade",
};

/**
 * Why "+" is disabled (FR-248, FR-252, FR-253): the market's reason first (nobody to trade with), then the limit the
 * header counts ("Holds", "Bids"), then the warehouse and the money. "limit-reached" is either limit, so the view tells
 * them apart by the counters; "sellers-barred" and "buyers-barred" name the barrier ("bars" texts below).
 */
export const MORE_REFUSAL_TEXT = {
  noSeller: "No minor nation sells this",
  noBuyer: "No one buys this",
  holds: "No free hold this turn",
  bids: `Already ${MAX_BUY_BIDS} bids this turn, the most`,
  stock: "None left in the warehouse",
  cash: "Not enough money",
} as const;

/** "We need a consulate with a seller" (FR-252, FR-253): the barriers of every seller (or buyer), the consulate first. */
export function barredText(barriers: readonly (TradeBarrier | undefined)[], side: "seller" | "buyer"): string {
  if (barriers.includes("no-consulate")) return `We need a consulate with a ${side}`;
  const war = barriers.includes("at-war");
  const boycott = barriers.includes("boycott");
  if (war && boycott) return `War or a boycott bars every ${side}`;
  if (war) return `We are at war with every ${side}`;
  if (boycott) return `A boycott bars every ${side}`;
  return `We may not trade with any ${side}`;
}

/** One minor on a row: a seller of the commodity or, for goods, a buyer. */
export interface PartnerView {
  minorId: string;
  /** "Arvelia: 3 units" (FR-251) */
  text: string;
  /** "no consulate", "at war", "boycott": the player cannot trade with it this turn; absent when it can. */
  barrier?: string;
}

/**
 * The visible line beside a stepper (FR-252, FR-253, FR-257): why "+" is disabled ("refusal"), or, while it is enabled,
 * who may be served first or who alone may buy ("info").
 */
export interface StepNote {
  text: string;
  tone: "refusal" | "info";
}

export interface BoardRowView {
  commodity: TradeCommodity;
  name: string;
  /** The board price: last turn's world price, the base of every deal this turn (FR-189). */
  price: number;
  /** In our warehouse now (offered units have already left it, FR-061): the "In warehouse" column (FR-251). */
  available: number;
  /** This turn's bid and offer in units; a row never has both (FR-062). */
  bid: number;
  offer: number;
  /** Why one more unit of bid, or of offer, would be refused; absent when it would not (FR-248). */
  bidMoreRefusal?: string;
  offerMoreRefusal?: string;
  /** The line beside the Bid and the Offer stepper (FR-257); absent when there is nothing to say. */
  bidNote?: StepNote;
  offerNote?: StepNote;
  sellers: PartnerView[];
  buyers: PartnerView[];
  /** "No minor trades this": no minor sells or buys the commodity (FR-254). */
  noMinorText?: string;
}

export interface BoardView {
  rows: BoardRowView[];
  treasury: number;
  capacity: TradeCapacity;
  /** "Holds: 3 of 4 free" */
  holdsText: string;
  /** Commodities bid on this turn, of the most the engine accepts (FR-062). */
  bids: { used: number; max: number };
  /** "Arvelia favours Valdoria; Sundmark, Lorran and Pellis favour Testland." (FR-251), empty without a trading minor. */
  favouritesText: string;
}

/** "Arvelia: 3 units", "Sundmark: 1 unit" (FR-251). */
export function partnerText(partner: BoardSeller | BoardBuyer, nameOf: (countryId: string) => string): string {
  return `${nameOf(partner.minorId)}: ${partner.units} ${partner.units === 1 ? "unit" : "units"}`;
}

/** "Arvelia favours Valdoria; Sundmark and Pellis favour Testland": the minors grouped by favourite, in id order. */
export function favouritesSentence(pairs: readonly { minorId: string; favouriteId: string }[], nameOf: (countryId: string) => string): string {
  const groups = new Map<string, string[]>();
  for (const { minorId, favouriteId } of pairs) groups.set(favouriteId, [...(groups.get(favouriteId) ?? []), nameOf(minorId)]);
  return [...groups].map(([favouriteId, minors]) => `${namesText(minors)} ${minors.length > 1 ? "favour" : "favours"} ${nameOf(favouriteId)}`).join("; ");
}

export function boardView(state: GameState, nation: Nation): BoardView {
  const nameOf = (id: string) => countryName(state, id) ?? id;
  const partner = (p: BoardSeller | BoardBuyer): PartnerView => ({
    minorId: p.minorId,
    text: partnerText(p, nameOf),
    ...(p.barrier ? { barrier: BARRIER_TEXT[p.barrier] } : {}),
  });
  const capacity = tradeCapacityOf(state, nation.id);
  const board = boardOfTrade(state, nation.id);
  const reasonText = (reason: RejectReason, row: (typeof board)[number]): string => {
    switch (reason) {
      case "no-seller":
        return MORE_REFUSAL_TEXT.noSeller;
      case "no-buyer":
        return MORE_REFUSAL_TEXT.noBuyer;
      case "sellers-barred":
        return barredText(row.sellers.map((s) => s.barrier), "seller");
      case "buyers-barred":
        return barredText(buyersOf(state, nation.id, row.commodity).map((id) => tradeBarrier(state, nation.id, id)), "buyer");
      case "limit-reached":
        return capacity.free === 0 ? MORE_REFUSAL_TEXT.holds : MORE_REFUSAL_TEXT.bids;
      case "insufficient-resources":
        return MORE_REFUSAL_TEXT.stock;
      case "insufficient-funds":
        return MORE_REFUSAL_TEXT.cash;
      default:
        return REFUSAL_TEXT[reason];
    }
  };
  /** The refusal of one more unit on that side, as validateOrder judges it now. */
  const moreRefusal = (kind: "buyCommodity" | "sellCommodity", row: (typeof board)[number], current: number): string | undefined => {
    const result = validateOrder(state, { kind, nationId: nation.id, commodity: row.commodity, amount: current + 1 });
    return result.ok ? undefined : reasonText(result.reason, row);
  };
  /** "Arvelia favours Valdoria": the open counterparties that serve another Great Power first (FR-252). */
  const rivalFavourites = (partners: readonly (BoardSeller | BoardBuyer)[]): string | undefined => {
    const elsewhere = partners
      .filter((p) => !p.barrier && p.favouriteId && p.favouriteId !== nation.id)
      .map((p) => ({ minorId: p.minorId, favouriteId: p.favouriteId! }));
    return elsewhere.length > 0 ? favouritesSentence(elsewhere, nameOf) : undefined;
  };
  const refusal = (text: string | undefined): StepNote | undefined => (text ? { text, tone: "refusal" } : undefined);
  const info = (text: string | undefined): StepNote | undefined => (text ? { text, tone: "info" } : undefined);

  const rows = board.map((row): BoardRowView => {
    const bidMore = moreRefusal("buyCommodity", row, row.bid);
    const offerMore = moreRefusal("sellCommodity", row, row.offer);
    // An offer no minor we may trade with wants is still allowed while another Great Power may bid for it (FR-253)
    const openMinorBuyer = row.buyers.some((b) => !b.barrier);
    const onlyPowers = openMinorBuyer
      ? []
      : buyersOf(state, nation.id, row.commodity).filter((id) => !row.buyers.some((b) => b.minorId === id) && tradeBarrier(state, nation.id, id) === undefined);
    const bidNote = refusal(bidMore) ?? info(rivalFavourites(row.sellers));
    const offerNote =
      refusal(offerMore) ?? info(onlyPowers.length > 0 ? `Only ${namesText(onlyPowers.map(nameOf))} may buy this` : rivalFavourites(row.buyers));
    return {
      commodity: row.commodity,
      name: commodityName(row.commodity),
      price: row.price,
      available: row.available,
      bid: row.bid,
      offer: row.offer,
      ...(bidMore ? { bidMoreRefusal: bidMore } : {}),
      ...(offerMore ? { offerMoreRefusal: offerMore } : {}),
      ...(bidNote ? { bidNote } : {}),
      ...(offerNote ? { offerNote } : {}),
      sellers: row.sellers.map(partner),
      buyers: row.buyers.map(partner),
      ...(row.sellers.length === 0 && row.buyers.length === 0 ? { noMinorText: "No minor trades this" } : {}),
    };
  });
  // Each minor that trades this turn, with its favourite as the rows give it (this turn's diplomacy forecast, FR-246)
  const favouriteOf = new Map<string, string>();
  for (const p of board.flatMap((r) => [...r.sellers, ...r.buyers])) if (p.favouriteId && !favouriteOf.has(p.minorId)) favouriteOf.set(p.minorId, p.favouriteId);
  const favourites = [...favouriteOf].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([minorId, favouriteId]) => ({ minorId, favouriteId }));
  return {
    rows,
    treasury: nation.treasury,
    capacity,
    holdsText: `Holds: ${capacity.free} of ${capacity.holds} free`,
    bids: { used: rows.filter((r) => r.bid > 0).length, max: MAX_BUY_BIDS },
    favouritesText: favourites.length > 0 ? `${favouritesSentence(favourites, nameOf)}.` : "",
  };
}
