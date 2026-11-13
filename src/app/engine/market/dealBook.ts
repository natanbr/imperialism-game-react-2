// The Deal Book's data (FR-192; Imp1 Deal Book, rules 06 section 7.5): one nation's deals of a resolved turn,
// read from that turn's events. Names and display text are the screen's (components/market/dealBookView.ts).
import type { CountryId, NationId } from "@/types/Common";
import type { TradeCommodity } from "@/types/Market";
import type { GameEvent, OfferMissedReason } from "../turn/context";

export type DealEntry =
  | { kind: "sold"; commodity: TradeCommodity; amount: number; price: number; total: number; counterpartyId?: CountryId }
  | { kind: "unsold"; commodity: TradeCommodity; amount: number }
  | { kind: "bought"; commodity: TradeCommodity; amount: number; price: number; total: number; counterpartyId?: CountryId }
  | { kind: "missed"; commodity: TradeCommodity; amount: number; counterpartyId: CountryId; reason: OfferMissedReason };

/** The Imp1 bottom line, in dollars; `militaryUpkeep` is 0 until armies cost upkeep (FR-202, M8). */
export interface DealBottomLine {
  sold: number;
  bought: number;
  militaryUpkeep: number;
  /** sold - bought - militaryUpkeep. */
  net: number;
}

export interface DealBook {
  /** The sales in event order, then the units not sold. */
  sold: DealEntry[];
  /** The purchases in event order, then the offers that passed the nation by. */
  bought: DealEntry[];
  bottomLine: DealBottomLine;
}

/**
 * The nation's Deal Book from one turn's events (FR-192): `goods-sold` and `offer-unsold` under Sold,
 * `goods-bought` and `offer-missed` under Bought, each list in event order, and the bottom line. Reads a
 * "world" turn too: its deals have no counterparty.
 */
export function dealBook(events: readonly GameEvent[], nationId: NationId): DealBook {
  const sales: DealEntry[] = [];
  const unsold: DealEntry[] = [];
  const purchases: DealEntry[] = [];
  const missed: DealEntry[] = [];
  const counterparty = (id: CountryId | undefined) => (id === undefined ? {} : { counterpartyId: id });
  for (const e of events) {
    if (!("nationId" in e) || e.nationId !== nationId) continue;
    switch (e.type) {
      case "goods-sold":
        sales.push({ kind: "sold", commodity: e.commodity, amount: e.amount, price: e.price, total: e.income, ...counterparty(e.counterpartyId) });
        break;
      case "offer-unsold":
        unsold.push({ kind: "unsold", commodity: e.commodity, amount: e.amount });
        break;
      case "goods-bought":
        purchases.push({ kind: "bought", commodity: e.commodity, amount: e.amount, price: e.price, total: e.cost, ...counterparty(e.counterpartyId) });
        break;
      case "offer-missed":
        missed.push({ kind: "missed", commodity: e.commodity, amount: e.amount, counterpartyId: e.counterpartyId, reason: e.reason });
        break;
    }
  }
  const total = (entries: DealEntry[]) => entries.reduce((sum, d) => sum + ("total" in d ? d.total : 0), 0);
  const sold = total(sales);
  const bought = total(purchases);
  const militaryUpkeep = 0;
  return {
    sold: [...sales, ...unsold],
    bought: [...purchases, ...missed],
    bottomLine: { sold, bought, militaryUpkeep, net: sold - bought - militaryUpkeep },
  };
}
