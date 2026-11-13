// The Deal Book's data (FR-244, FR-255, FR-256; Imp1 Deal Book, rules 06 section 7.5): one nation's deals of a resolved
// turn, read from that turn's events. The engine gives data; the ledger's words are the screen's
// (components/market/dealBookView.ts), beside the other display names.
import type { CountryId, NationId } from "@/types/Common";
import type { TradeCommodity } from "@/types/Market";
import type { RegimentType } from "@/types/Unit";
import { OVERTURE_COST } from "@/definisions/diplomacyRules";
import { REGIMENTS } from "@/definisions/regiments";
import type { GameEvent, OfferMissedReason, TradeMissCause } from "../turn/context";

export type DealEntry =
  | { kind: "sold"; commodity: TradeCommodity; amount: number; price: number; total: number; counterpartyId?: CountryId }
  | { kind: "unsold"; commodity: TradeCommodity; amount: number; cause?: TradeMissCause }
  | { kind: "bought"; commodity: TradeCommodity; amount: number; price: number; total: number; counterpartyId?: CountryId }
  | { kind: "missed"; commodity: TradeCommodity; amount: number; counterpartyId: CountryId; reason: OfferMissedReason }
  | { kind: "unfilled"; commodity: TradeCommodity; amount: number; cause?: TradeMissCause };

/** A diplomacy cost the nation paid for that turn (FR-256): a consulate or an embassy opened, a grant paid. */
export interface DiplomacyCost {
  kind: "consulate" | "embassy" | "grant";
  targetId: CountryId;
  amount: number;
}

/** The cash of the regiments of one type raised that turn (FR-262): paid when ordered (FR-200), named when they join (FR-201). */
export interface RecruitCost {
  regiment: RegimentType;
  count: number;
  amount: number;
}

/** The Imp1 bottom line, in dollars; `militaryUpkeep` is the turn's `army-upkeep` (FR-202). */
export interface DealBottomLine {
  sold: number;
  bought: number;
  militaryUpkeep: number;
  /** The trade net (FR-256): sold - bought - militaryUpkeep. */
  net: number;
}

/**
 * How the treasury moved over the turn (FR-256, FR-262): `change` = `end` - `start` = the trade net - the diplomacy
 * costs - the recruits' cash + `other` (what none explains: building, prospecting, development, training, gold and gems).
 */
export interface TreasuryChange {
  start: number;
  end: number;
  change: number;
  other: number;
}

export interface DealBook {
  /** The sales, in event order (FR-255). */
  sold: DealEntry[];
  /** The purchases, in event order (FR-255). */
  bought: DealEntry[];
  /** What was not traded (FR-255): the units not sold, then the offers that passed the nation by, then the bid units nobody filled. */
  notTraded: DealEntry[];
  bottomLine: DealBottomLine;
  /** The diplomacy costs of the turn, in event order (FR-256). */
  diplomacy: DiplomacyCost[];
  /** The regiments raised that turn, one entry per type in event order, with their cash (FR-262). */
  recruits: RecruitCost[];
  /** With the treasury at the turn's start and end given: the change and what explains it (FR-256). */
  treasury?: TreasuryChange;
}

/**
 * The nation's Deal Book from one turn's events (FR-244, FR-255, FR-256): `goods-sold` under Sold, `goods-bought` under
 * Bought, `offer-unsold`, `offer-missed` and `bid-unfilled` under Not traded, each kind in event order; the bottom line;
 * the army upkeep (`army-upkeep`, FR-202) in the bottom line;
 * the consulates and embassies opened (`overture-done`, at their FR-161 cost) and the grants paid (`grant-paid`); the
 * regiments raised (`regiments-recruited`, at their FR-199 cash; FR-262); and, when `treasury` gives the nation's
 * treasury at the start and the end of the turn, the change it explains. Reads a "world" turn too: its deals have no
 * counterparty.
 */
export function dealBook(events: readonly GameEvent[], nationId: NationId, treasury?: { start: number; end: number }): DealBook {
  const sales: DealEntry[] = [];
  const unsold: DealEntry[] = [];
  const purchases: DealEntry[] = [];
  const missed: DealEntry[] = [];
  const unfilled: DealEntry[] = [];
  const diplomacy: DiplomacyCost[] = [];
  let militaryUpkeep = 0;
  const recruits: RecruitCost[] = [];
  const counterparty = (id: CountryId | undefined) => (id === undefined ? {} : { counterpartyId: id });
  const cause = (c: TradeMissCause | undefined) => (c === undefined ? {} : { cause: c });
  for (const e of events) {
    if (!("nationId" in e) || e.nationId !== nationId) continue;
    switch (e.type) {
      case "goods-sold":
        sales.push({ kind: "sold", commodity: e.commodity, amount: e.amount, price: e.price, total: e.income, ...counterparty(e.counterpartyId) });
        break;
      case "offer-unsold":
        unsold.push({ kind: "unsold", commodity: e.commodity, amount: e.amount, ...cause(e.cause) });
        break;
      case "goods-bought":
        purchases.push({ kind: "bought", commodity: e.commodity, amount: e.amount, price: e.price, total: e.cost, ...counterparty(e.counterpartyId) });
        break;
      case "offer-missed":
        missed.push({ kind: "missed", commodity: e.commodity, amount: e.amount, counterpartyId: e.counterpartyId, reason: e.reason });
        break;
      case "bid-unfilled":
        unfilled.push({ kind: "unfilled", commodity: e.commodity, amount: e.amount, ...cause(e.cause) });
        break;
      case "overture-done":
        if ((e.overture === "consulate" || e.overture === "embassy") && OVERTURE_COST[e.overture] > 0) {
          diplomacy.push({ kind: e.overture, targetId: e.targetId, amount: OVERTURE_COST[e.overture] });
        }
        break;
      case "grant-paid":
        diplomacy.push({ kind: "grant", targetId: e.targetId, amount: e.amount });
        break;
      case "army-upkeep":
        militaryUpkeep += e.amount;
        break;
      case "regiments-recruited":
        recruits.push({ regiment: e.regiment, count: e.count, amount: e.count * REGIMENTS[e.regiment].cash });
        break;
    }
  }
  const total = (entries: DealEntry[]) => entries.reduce((sum, d) => sum + ("total" in d ? d.total : 0), 0);
  const sold = total(sales);
  const bought = total(purchases);
  const net = sold - bought - militaryUpkeep;
  const paid = diplomacy.reduce((sum, d) => sum + d.amount, 0) + recruits.reduce((sum, r) => sum + r.amount, 0);
  const change = treasury ? treasury.end - treasury.start : 0;
  return {
    sold: sales,
    bought: purchases,
    notTraded: [...unsold, ...missed, ...unfilled],
    bottomLine: { sold, bought, militaryUpkeep, net },
    diplomacy,
    recruits,
    ...(treasury ? { treasury: { start: treasury.start, end: treasury.end, change, other: change - net + paid } } : {}),
  };
}
