// What the Board of Trade shows (FR-194, FR-248), derived from the engine's `boardOfTrade`. No React, no store: the
// dialog renders this view and sends orders; the engine stays the judge of every order.
import {
  boardOfTrade,
  countryName,
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

/** Why the player cannot trade with a minor this turn (FR-185), as the board marks it. */
export const BARRIER_TEXT: Record<TradeBarrier, string> = {
  "no-consulate": "no consulate",
  "at-war": "at war",
  boycott: "boycott",
  "not-a-partner": "no trade",
};

/**
 * Why "+" is disabled (FR-248): the limit the header counts ("Holds", "Bids") named, the rest in the refusal words.
 * "limit-reached" is either limit, so the view tells them apart by the counters.
 */
export const MORE_REFUSAL_TEXT = {
  holds: "No free hold this turn",
  bids: `Already ${MAX_BUY_BIDS} bids this turn, the most`,
  stock: "None left in the warehouse",
  cash: "Not enough money",
} as const;

/** One minor on a row: a seller of the commodity or, for goods, a buyer. */
export interface PartnerView {
  minorId: string;
  /** "Arvelia 3, favours Valdoria" */
  text: string;
  /** "no consulate", "at war", "boycott": the player cannot trade with it this turn; absent when it can. */
  barrier?: string;
}

export interface BoardRowView {
  commodity: TradeCommodity;
  name: string;
  /** The board price: last turn's world price, the base of every deal this turn (FR-189). */
  price: number;
  /** In the warehouse now (offered units have already left it, FR-061). */
  available: number;
  /** This turn's bid and offer in units; a row never has both (FR-062). */
  bid: number;
  offer: number;
  /** Why one more unit of bid, or of offer, would be refused; absent when it would not (FR-248). */
  bidMoreRefusal?: string;
  offerMoreRefusal?: string;
  sellers: PartnerView[];
  buyers: PartnerView[];
}

export interface BoardView {
  rows: BoardRowView[];
  treasury: number;
  capacity: TradeCapacity;
  /** "Holds: 3 of 4 free" */
  holdsText: string;
  /** Commodities bid on this turn, of the most the engine accepts (FR-062). */
  bids: { used: number; max: number };
}

/** "Arvelia 3, favours Valdoria"; without a favourite only the name and the units. */
export function partnerText(partner: BoardSeller | BoardBuyer, nameOf: (countryId: string) => string): string {
  const favours = partner.favouriteId ? `, favours ${nameOf(partner.favouriteId)}` : "";
  return `${nameOf(partner.minorId)} ${partner.units}${favours}`;
}

export function boardView(state: GameState, nation: Nation): BoardView {
  const nameOf = (id: string) => countryName(state, id) ?? id;
  const partner = (p: BoardSeller | BoardBuyer): PartnerView => ({
    minorId: p.minorId,
    text: partnerText(p, nameOf),
    ...(p.barrier ? { barrier: BARRIER_TEXT[p.barrier] } : {}),
  });
  const capacity = tradeCapacityOf(state, nation.id);
  const reasonText = (reason: RejectReason): string =>
    reason === "limit-reached"
      ? capacity.free === 0
        ? MORE_REFUSAL_TEXT.holds
        : MORE_REFUSAL_TEXT.bids
      : reason === "insufficient-resources"
        ? MORE_REFUSAL_TEXT.stock
        : reason === "insufficient-funds"
          ? MORE_REFUSAL_TEXT.cash
          : REFUSAL_TEXT[reason];
  /** The refusal of one more unit on that side, as validateOrder judges it now. */
  const moreRefusal = (kind: "buyCommodity" | "sellCommodity", commodity: TradeCommodity, current: number): string | undefined => {
    const result = validateOrder(state, { kind, nationId: nation.id, commodity, amount: current + 1 });
    return result.ok ? undefined : reasonText(result.reason);
  };
  const rows = boardOfTrade(state, nation.id).map((row): BoardRowView => {
    const bidMore = moreRefusal("buyCommodity", row.commodity, row.bid);
    const offerMore = moreRefusal("sellCommodity", row.commodity, row.offer);
    return {
      commodity: row.commodity,
      name: commodityName(row.commodity),
      price: row.price,
      available: row.available,
      bid: row.bid,
      offer: row.offer,
      ...(bidMore ? { bidMoreRefusal: bidMore } : {}),
      ...(offerMore ? { offerMoreRefusal: offerMore } : {}),
      sellers: row.sellers.map(partner),
      buyers: row.buyers.map(partner),
    };
  });
  return {
    rows,
    treasury: nation.treasury,
    capacity,
    holdsText: `Holds: ${capacity.free} of ${capacity.holds} free`,
    bids: { used: rows.filter((r) => r.bid > 0).length, max: MAX_BUY_BIDS },
  };
}
