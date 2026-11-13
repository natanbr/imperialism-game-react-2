// What the Deal Book screen shows (FR-244, FR-195): the engine's `dealBook` data as Imp1 ledger lines
// ("Sold 1 Clothing to Arvelia @ $810"; rules 06 section 7.5). No React, no store.
import type { DealBook, DealEntry } from "@/engine";
import { commodityName, MISSED_TEXT, money } from "../gameText";

export interface DealBookView {
  /** "Sold 1 Clothing to Arvelia @ $810", then the units not sold. */
  sold: string[];
  /** "Bought 2 Coal from Arvelia @ $110", then "Arvelia offered to sell us 1 Coal (no free hold)", then "Nobody sold us 2 Coal (bid money back)". */
  bought: string[];
  /** Sold, Bought, Military upkeep, Net, in the Imp1 order. */
  bottomLine: { label: string; amount: number; text: string }[];
  /** No deal, no missed offer and no unsold unit: the screen says "No deals last turn." */
  empty: boolean;
}

/** Dollars with a minus sign in front for a loss: "-$1,369". */
const signedMoney = (n: number): string => (n < 0 ? `-${money(-n)}` : money(n));

/** One ledger line; `nameOf` names the counterparty. A "world" deal has none and names nobody. */
export function dealLineText(entry: DealEntry, nameOf: (countryId: string) => string): string {
  const goods = `${entry.amount} ${commodityName(entry.commodity)}`;
  switch (entry.kind) {
    case "sold":
      return `Sold ${goods}${entry.counterpartyId ? ` to ${nameOf(entry.counterpartyId)}` : ""} @ ${money(entry.price)}`;
    case "bought":
      return `Bought ${goods}${entry.counterpartyId ? ` from ${nameOf(entry.counterpartyId)}` : ""} @ ${money(entry.price)}`;
    case "missed":
      return `${nameOf(entry.counterpartyId)} offered to sell us ${goods} (${MISSED_TEXT[entry.reason]})`;
    case "unsold":
      return `${goods} not sold, back in the warehouse`;
    case "unfilled":
      return `Nobody sold us ${goods} (bid money back)`;
  }
}

export function dealBookView(book: DealBook, nameOf: (countryId: string) => string): DealBookView {
  const { sold, bought, militaryUpkeep, net } = book.bottomLine;
  const row = (label: string, amount: number) => ({ label, amount, text: signedMoney(amount) });
  return {
    sold: book.sold.map((entry) => dealLineText(entry, nameOf)),
    bought: book.bought.map((entry) => dealLineText(entry, nameOf)),
    bottomLine: [row("Sold", sold), row("Bought", bought), row("Military upkeep", militaryUpkeep), row("Net", net)],
    empty: book.sold.length === 0 && book.bought.length === 0,
  };
}
