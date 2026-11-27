// What the Deal Book screen shows (FR-244, FR-195, FR-255, FR-256): the engine's `dealBook` data as Imp1 ledger lines
// ("Sold 1 Clothing to Arvelia @ $810"; rules 06 section 7.5) and the money of the turn. No React, no store.
import { REGIMENTS, type BarredCounterparty, type DealBook, type DealEntry, type DiplomacyCost, type TradeBarrier, type TradeMissCause } from "@/engine";
import { commodityName, MISSED_TEXT, money } from "../gameText";

export interface MoneyLine {
  label: string;
  amount: number;
  text: string;
}

export interface DealBookView {
  /** "Sold 1 Clothing to Arvelia @ $810". */
  sold: string[];
  /** "Bought 2 Coal from Arvelia @ $110". */
  bought: string[];
  /**
   * What was not traded (FR-255): "1 Furniture not sold (no buyer), back in the warehouse", "Arvelia wanted to sell us
   * 1 Coal (no free hold)", "Nobody sold us 2 Coal (no consulate with Lorran; money back)" (FR-563).
   */
  notTraded: string[];
  /** Sold, Bought and the Trade net, Sold less Bought (FR-396). */
  bottomLine: MoneyLine[];
  /**
   * FR-639: the Overseas Profits by Minor Nation and commodity, "2 Coal from Arvelia @ $116 × 75%: $174"; absent on a
   * turn without any. Not part of the trade net.
   */
  overseas?: string[];
  /**
   * With the turn's treasuries known (FR-256): the Trade net (only on a turn with deals, FR-396), Army upkeep when not 0
   * (FR-396), the Overseas profits when any (FR-639), each diplomacy cost, each type recruited (FR-262), Other when not 0, Treasury change.
   */
  treasury?: MoneyLine[];
  /** Dated closing balances, separate from the cash movements above. Absent on pre-credit and cash-only reports. */
  balances?: MoneyLine[];
  /** "From $10,000 to $9,200": the treasury before and after the turn (FR-256). */
  cash?: string;
  /** Nothing sold, bought or left: the screen says "No deals last turn." */
  empty: boolean;
}

/** "Arvelia", "Arvelia and Lorran", "Arvelia, Lorran and Pellis". */
export const namesText = (names: readonly string[]): string =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/** How a barrier reads before the countries it bars (FR-255): "no consulate with Lorran". */
const BARRED_TEXT: Record<TradeBarrier, string> = {
  "no-consulate": "no consulate with",
  "at-war": "at war with",
  boycott: "boycott with",
  "not-a-partner": "no trade with",
};

/** "at war with Arvelia; no consulate with Lorran and Pellis": the countries grouped by barrier, in their order. */
function barredText(barred: readonly BarredCounterparty[], nameOf: (countryId: string) => string): string {
  const groups = new Map<TradeBarrier, string[]>();
  for (const { countryId, barrier } of barred) groups.set(barrier, [...(groups.get(barrier) ?? []), nameOf(countryId)]);
  return [...groups].map(([barrier, names]) => `${BARRED_TEXT[barrier]} ${namesText(names)}`).join("; ");
}

/**
 * Why units of a bid or an offer found no counterparty (FR-255): "no buyer", "no consulate with Lorran", "Valdoria was
 * served first". FR-259: the barred ones that still had units come first, "no consulate with Sundmark and Pellis; the
 * other sellers had no more".
 */
export function causeText(cause: TradeMissCause, side: "bid" | "offer", nameOf: (countryId: string) => string): string {
  const afterBarred = (barred: readonly BarredCounterparty[] | undefined, text: string) => (barred?.length ? `${barredText(barred, nameOf)}; ${text}` : text);
  switch (cause.kind) {
    case "nobody":
      return side === "bid" ? "no seller" : "no buyer";
    case "barred":
      return barredText(cause.barred, nameOf);
    case "served-first":
      return afterBarred(cause.barred, `${namesText(cause.rivalIds.map(nameOf))} ${cause.rivalIds.length > 1 ? "were" : "was"} served first`);
    case "used-up": {
      const other = cause.barred?.length ? "other " : "";
      return afterBarred(cause.barred, side === "bid" ? `the ${other}sellers had no more` : `the ${other}buyers wanted no more`);
    }
    case "no-hold":
      return "no free hold";
  }
}

/** One ledger line; `nameOf` names the counterparty. A "world" deal has none and names nobody. */
export function dealLineText(entry: DealEntry, nameOf: (countryId: string) => string): string {
  const goods = `${entry.amount} ${commodityName(entry.commodity)}`;
  switch (entry.kind) {
    case "sold":
      return `Sold ${goods}${entry.counterpartyId ? ` to ${nameOf(entry.counterpartyId)}` : ""} @ ${money(entry.price)}`;
    case "bought":
      return `Bought ${goods}${entry.counterpartyId ? ` from ${nameOf(entry.counterpartyId)}` : ""} @ ${money(entry.price)}`;
    case "missed":
      return `${nameOf(entry.counterpartyId)} wanted to sell us ${goods} (${MISSED_TEXT[entry.reason]})`;
    case "unsold":
      return entry.cause
        ? `${goods} not sold (${causeText(entry.cause, "offer", nameOf)}), back in the warehouse`
        : `${goods} not sold, back in the warehouse`;
    case "unfilled":
      return entry.cause
        ? `Nobody sold us ${goods} (${causeText(entry.cause, "bid", nameOf)}; money back)`
        : `Nobody sold us ${goods} (money back)`;
  }
}

const DIPLOMACY_TEXT: Record<DiplomacyCost["kind"], string> = { consulate: "Consulate in", embassy: "Embassy in", grant: "Grant to" };

/** What neither the trade nor the diplomacy explains (FR-256). */
export const OTHER_MONEY_LABEL = "Other (building, workers, gold, gems)";

export function dealBookView(book: DealBook, nameOf: (countryId: string) => string): DealBookView {
  const { sold, bought, militaryUpkeep } = book.bottomLine;
  const line = (label: string, amount: number): MoneyLine => ({ label, amount, text: money(amount) });
  // FR-396 (audit ARMY-WAR-06): the trade only; the upkeep is its own Treasury line, so a turn without deals shows no
  // "Trade net" for a charge that was not trade
  const tradeNet = line("Trade net", sold - bought);
  const empty = book.sold.length === 0 && book.bought.length === 0 && book.notTraded.length === 0;
  const treasury = book.treasury;
  const overseas = book.overseasProfits.map(
    (p) => `${p.units} ${commodityName(p.commodity)} from ${nameOf(p.minorId)} @ ${money(p.price)} × ${p.sharePercent}%: ${money(p.amount)}`
  );
  const overseasTotal = book.overseasProfits.reduce((sum, p) => sum + p.amount, 0);
  return {
    sold: book.sold.map((entry) => dealLineText(entry, nameOf)),
    bought: book.bought.map((entry) => dealLineText(entry, nameOf)),
    notTraded: book.notTraded.map((entry) => dealLineText(entry, nameOf)),
    bottomLine: [line("Sold", sold), line("Bought", bought), tradeNet],
    ...(overseas.length > 0 && { overseas }),
    ...(treasury
      ? {
          treasury: [
            ...(empty ? [] : [tradeNet]),
            ...(militaryUpkeep !== 0 ? [line("Army upkeep", -militaryUpkeep)] : []),
            ...(overseasTotal !== 0 ? [line("Overseas profits", overseasTotal)] : []),
            ...book.diplomacy.map((d) => line(`${DIPLOMACY_TEXT[d.kind]} ${nameOf(d.targetId)}`, -d.amount)),
            ...book.recruits.map((r) => line(`${r.count} ${REGIMENTS[r.regiment].name} recruited`, -r.amount)),
            ...(treasury.interest ? [line(`Interest (${treasury.interest.ratePercent}% per turn, inferred)`, -treasury.interest.amount)] : []),
            ...(treasury.forcedSales ?? []).map(sale =>
              line(`Forced sale of ${sale.amount} ${commodityName(sale.commodity)} @ ${money(sale.price)}`, sale.proceeds)),
            ...(treasury.other !== 0 ? [line(OTHER_MONEY_LABEL, treasury.other)] : []),
            line("Treasury change", treasury.change),
          ],
          cash: `From ${money(treasury.start)} to ${money(treasury.end)}`,
          ...(treasury.closingCredit && {
            balances: [line("Closing debt", treasury.closingCredit.closingDebt), line("Credit limit", treasury.closingCredit.limit)],
          }),
        }
      : {}),
    empty,
  };
}
