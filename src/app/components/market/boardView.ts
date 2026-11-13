// What the Board of Trade shows (FR-194), derived from the engine's `boardOfTrade`. No React, no store: the dialog
// renders this view and sends orders; the engine stays the judge of every order.
import { boardOfTrade, countryName, tradeCapacityOf, type BoardBuyer, type BoardSeller, type TradeBarrier, type TradeCapacity } from "@/engine";
import { MAX_BUY_BIDS } from "@/definisions/marketPrices";
import type { GameState } from "@/types/GameState";
import type { TradeCommodity } from "@/types/Market";
import type { Nation } from "@/types/Nation";
import { commodityName } from "../gameText";

/** Why the player cannot trade with a minor this turn (FR-185), as the board marks it. */
export const BARRIER_TEXT: Record<TradeBarrier, string> = {
  "no-consulate": "no consulate",
  "at-war": "at war",
  boycott: "boycott",
  "not-a-partner": "no trade",
};

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
  const rows = boardOfTrade(state, nation.id).map(
    (row): BoardRowView => ({
      commodity: row.commodity,
      name: commodityName(row.commodity),
      price: row.price,
      available: row.available,
      bid: row.bid,
      offer: row.offer,
      sellers: row.sellers.map(partner),
      buyers: row.buyers.map(partner),
    })
  );
  const capacity = tradeCapacityOf(state, nation.id);
  return {
    rows,
    treasury: nation.treasury,
    capacity,
    holdsText: `Holds: ${capacity.free} of ${capacity.holds} free`,
    bids: { used: rows.filter((r) => r.bid > 0).length, max: MAX_BUY_BIDS },
  };
}
