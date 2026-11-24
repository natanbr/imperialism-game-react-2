// What the Board of Trade shows (FR-194, FR-248, FR-251 to FR-254, FR-257; M12 FR-394, FR-397, FR-398, FR-400, FR-434),
// derived from the engine's `boardOfTrade`.
// No React, no store: the dialog renders this view and sends orders; the engine stays the judge of every order.
import {
  boardOfTrade,
  buyersOf,
  countryName,
  dealPrice,
  OVERTURE_COST,
  tradeBarrier,
  tradeCapacityOf,
  tradeOrdersOf,
  validateOrder,
  type BoardBuyer,
  type BoardRow,
  type BoardSeller,
  type Order,
  type RejectReason,
  type TradeBarrier,
  type TradeCapacity,
  type ValidationResult,
} from "@/engine";
import { bidSellersOf, lastTradeOrdersOf } from "@/engine/market/partners";
import { MAX_BUY_BIDS } from "@/definisions/marketPrices";
import { RECIPES } from "@/definisions/ResourceConversions";
import { SHIPS, SHIP_TYPES, shipsOf } from "@/definisions/ships";
import type { Recipe } from "@/definisions/RecipeTypes";
import type { GameState } from "@/types/GameState";
import type { TradeCommodity } from "@/types/Market";
import type { Nation } from "@/types/Nation";
import { BUILDING_TEXT, commodityName, money, REFUSAL_TEXT } from "../gameText";
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
  bids: `Already buying ${MAX_BUY_BIDS} commodities this turn, the most`,
  stock: "None left in the warehouse",
  cash: "Not enough money",
} as const;

/**
 * FR-494 (card Q118 (a)): the line beside an enabled Bid "+" of a row no minor sells, where the bid goes to the other Great
 * Powers we may trade with (FR-492). In full, "No minor nation sells this; money back if Valdoria does not sell." (FR-563; was "a bid is refunded"),
 * on a row minors buy (clothing, furniture, hardware), whose minors column lists those buyers (M13 review UTH-2). On a row
 * no minor trades, the column says "No minor trades this", so the line drops its first clause: "Money back if Valdoria
 * does not sell." In full on all 13 such rows of a new game it took 3 lines of the 104 px note and made the board
 * scroll by 109 px at 1280x720 (FR-257, e2e/m7-trade.spec.ts).
 */
export const rivalSellerText = (names: readonly string[], minorsBuy: boolean): string => {
  const refund = `back if ${namesText(names)} ${names.length > 1 ? "do" : "does"} not sell.`;
  return minorsBuy ? `${MORE_REFUSAL_TEXT.noSeller}; money ${refund}` : `Money ${refund}`;
};

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

/**
 * Why the engine refuses one more unit of a bid or an offer, in the Board's words (FR-248, FR-252, FR-253): the market's
 * reason, the limit the header counts ("Holds", "Bids"), the warehouse, the money. Also what a repeated unit was refused
 * for (FR-398). "limit-reached" is either limit, told apart by the free holds.
 */
export function moreRefusalText(state: GameState, nationId: string, commodity: TradeCommodity, reason: RejectReason): string {
  switch (reason) {
    case "no-seller":
      return MORE_REFUSAL_TEXT.noSeller;
    case "no-buyer":
      return MORE_REFUSAL_TEXT.noBuyer;
    case "sellers-barred":
      // The minors that sell it, else the other Great Powers a bid would go to (FR-492)
      return barredText(bidSellersOf(state, nationId, commodity).map((id) => tradeBarrier(state, nationId, id)), "seller");
    case "buyers-barred":
      return barredText(buyersOf(state, nationId, commodity).map((id) => tradeBarrier(state, nationId, id)), "buyer");
    case "limit-reached":
      return tradeCapacityOf(state, nationId).free === 0 ? MORE_REFUSAL_TEXT.holds : MORE_REFUSAL_TEXT.bids;
    case "insufficient-resources":
      return MORE_REFUSAL_TEXT.stock;
    case "insufficient-funds":
      return MORE_REFUSAL_TEXT.cash;
    default:
      return REFUSAL_TEXT[reason];
  }
}

/** One of last turn's bids or offers (FR-397): the total the player left on that side of the commodity. */
export interface RepeatTrade {
  side: "bid" | "offer";
  commodity: TradeCommodity;
  amount: number;
}

/** A nation's orders of one turn, as the store's order log keeps them (FR-100). */
export interface LoggedOrders {
  turn: number;
  nationId: string;
  orders: readonly Order[];
}

/**
 * FR-397: the bids and offers the nation left at the end of the turn before `turn` (the one just resolved), read from the
 * order log: each order sets the turn's total, so the last one of a commodity's side counts; in the order first given;
 * none at 0.
 */
export function lastTurnTrades(log: readonly LoggedOrders[], nationId: string, turn: number): RepeatTrade[] {
  const entry = log.findLast((e) => e.turn === turn - 1 && e.nationId === nationId);
  const totals = new Map<string, RepeatTrade>();
  for (const order of entry?.orders ?? []) {
    if (order.kind !== "buyCommodity" && order.kind !== "sellCommodity") continue;
    const side = order.kind === "buyCommodity" ? "bid" : "offer";
    totals.set(`${side}|${order.commodity}`, { side, commodity: order.commodity, amount: order.amount });
  }
  return [...totals.values()].filter((t) => t.amount > 0);
}

/** What "Repeat last turn's trades" did (FR-397, FR-398): the units in place of last turn's and the one line that says so. */
export interface RepeatOutcome {
  repeated: number;
  total: number;
  /** "Repeated 3 of 4 units. Coal purchase: not enough money." */
  text: string;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** FR-563: a repeated trade's side in the player's words, never the engine's "bid" or "offer". */
const SIDE_TEXT = { bid: "purchase", offer: "sale" } as const;

/**
 * FR-397, FR-398: orders `trades` again unit by unit through `submit` (the store's `submitOrder`; NR-018 kept: nothing
 * stands in the engine), each unit one above this turn's total, so what is already ordered is kept. A unit the engine
 * would refuse is not sent (so no alert); it stops its trade and the line names it with the Board's reason.
 */
export function repeatTrades(
  trades: readonly RepeatTrade[],
  nationId: string,
  getState: () => GameState,
  submit: (order: Order) => ValidationResult
): RepeatOutcome {
  let repeated = 0;
  const refused: string[] = [];
  for (const trade of trades) {
    const kind = trade.side === "bid" ? "buyCommodity" : "sellCommodity";
    const now = tradeOrdersOf(getState(), nationId);
    let amount = Math.min(trade.amount, (trade.side === "bid" ? now.buy : now.sell)[trade.commodity] ?? 0);
    repeated += amount;
    while (amount < trade.amount) {
      const order: Order = { kind, nationId, commodity: trade.commodity, amount: amount + 1 };
      const state = getState();
      const check = validateOrder(state, order);
      const result = check.ok ? submit(order) : check;
      if (!result.ok) {
        const why = lowerFirst(moreRefusalText(state, nationId, trade.commodity, result.reason));
        refused.push(`${commodityName(trade.commodity)} ${SIDE_TEXT[trade.side]}: ${why}.`);
        break;
      }
      amount += 1;
      repeated += 1;
    }
  }
  const total = trades.reduce((sum, t) => sum + t.amount, 0);
  return { repeated, total, text: [`Repeated ${repeated} of ${total} ${total === 1 ? "unit" : "units"}.`, ...refused].join(" ") };
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
  /**
   * FR-394: under the board price, the deal price with each minor on the row we may trade with and subsidise (sellers,
   * then buyers): "Arvelia charges $114 with our 10%", "Sundmark pays $0 with our 100% subsidy". Absent when none.
   */
  dealPrices?: string[];
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
  /**
   * FR-494: "Valdoria wanted to buy 2 last turn", "Valdoria wanted to sell 1 last turn" (FR-563): what each other Great Power we may trade with
   * bid or offered for it in the last trade phase (FR-491); absent when none did.
   */
  rivalLastTurn?: string;
}

export interface BoardView {
  rows: BoardRowView[];
  treasury: number;
  capacity: TradeCapacity;
  /** "Holds: 3 of 4 free" */
  holdsText: string;
  fleetText: string;
  /** Commodities bid on this turn, of the most the engine accepts (FR-062). */
  bids: { used: number; max: number };
  /** "Arvelia favours Valdoria; Sundmark, Lorran and Pellis favour Testland." (FR-251), empty without a trading minor. */
  favouritesText: string;
  /**
   * FR-434: with nothing we may offer, how to make the first sale: "Minor nations buy Clothing, Furniture and Hardware.
   * Make them in the Capital (Clothing factory, Furniture factory, Metal works) and open a consulate in Diplomacy
   * ($500)."; the consulate step only while no minor that buys them may trade with us. Absent when something may be offered.
   */
  firstSaleText?: string;
}

/** The deal price lines of one row (FR-394): `dealPrice` with our subsidy, a seller's price up and a buyer's down (FR-189). */
function dealPriceLines(row: BoardRow, nameOf: (countryId: string) => string): string[] {
  const open = (p: BoardSeller | BoardBuyer): p is (BoardSeller | BoardBuyer) & { subsidy: number } => !p.barrier && (p.subsidy ?? 0) > 0;
  return [
    ...row.sellers.filter(open).map((s) => `${nameOf(s.minorId)} charges ${money(dealPrice(row.price, s.subsidy))} with our ${s.subsidy}%`),
    ...row.buyers.filter(open).map((b) => `${nameOf(b.minorId)} pays ${money(dealPrice(row.price, -b.subsidy))} with our ${b.subsidy}% subsidy`),
  ];
}

/** FR-434: the line for a player with nothing to offer, from the goods the minors want and the recipes that make them. */
function firstSaleLine(board: readonly BoardRow[], rows: readonly BoardRowView[]): string | undefined {
  if (rows.some((r) => r.offer > 0 || r.offerMoreRefusal === undefined)) return undefined;
  const wanted = board.filter((r) => r.buyers.length > 0);
  if (wanted.length === 0) return undefined;
  const recipes = RECIPES as Readonly<Partial<Record<TradeCommodity, Recipe>>>;
  const buildings = [...new Set(wanted.flatMap((r) => recipes[r.commodity]?.building ?? []))].map((b) => BUILDING_TEXT[b]);
  const buyers = wanted.flatMap((r) => r.buyers);
  const consulate = !buyers.some((b) => !b.barrier) && buyers.some((b) => b.barrier === "no-consulate");
  return (
    `Minor nations buy ${namesText(wanted.map((r) => commodityName(r.commodity)))}. Make them in the Capital (${buildings.join(", ")})` +
    (consulate ? ` and open a consulate in Diplomacy (${money(OVERTURE_COST.consulate)}).` : ".")
  );
}

/**
 * FR-494 (FR-491): the other Great Powers' bids and offers of the last trade phase for the commodity, each one we may trade
 * with (FR-185, as this turn's diplomacy will leave it, like the minors' marks, FR-246), in id order; one line.
 */
function rivalLastTurnText(state: GameState, nationId: string, commodity: TradeCommodity, nameOf: (id: string) => string): string | undefined {
  const lines = state.nations
    .map((n) => n.id)
    .filter((id) => id !== nationId && tradeBarrier(state, nationId, id) === undefined)
    .sort()
    .flatMap((id) => {
      const last = lastTradeOrdersOf(state, id);
      const bid = last.buy[commodity] ?? 0;
      const offer = last.sell[commodity] ?? 0;
      return [...(bid > 0 ? [`${nameOf(id)} wanted to buy ${bid} last turn`] : []), ...(offer > 0 ? [`${nameOf(id)} wanted to sell ${offer} last turn`] : [])];
    });
  return lines.length > 0 ? lines.join("; ") : undefined;
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
  const ships = shipsOf(nation.merchantMarine);
  const fleet = SHIP_TYPES.flatMap(type => {
    const count = ships[type] ?? 0;
    return count ? [`${count} ${count === 1 ? SHIPS[type].name : SHIPS[type].plural}`] : [];
  });
  const board = boardOfTrade(state, nation.id);
  /** The refusal of one more unit on that side, as validateOrder judges it now. */
  const moreRefusal = (kind: "buyCommodity" | "sellCommodity", row: (typeof board)[number], current: number): string | undefined => {
    const result = validateOrder(state, { kind, nationId: nation.id, commodity: row.commodity, amount: current + 1 });
    return result.ok ? undefined : moreRefusalText(state, nation.id, row.commodity, result.reason);
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
    // An offer no minor we may trade with wants is still allowed after another Great Power bid for it last turn (FR-540)
    const openBuyers = row.buyers.filter((b) => !b.barrier);
    const wanted = openBuyers.reduce((sum, b) => sum + b.units, 0);
    // FR-400 (card Q104): "+" stops at what the minors we may trade with want; the engine still accepts more
    const atDemand =
      openBuyers.length > 0 && row.offer >= wanted
        ? `${namesText(openBuyers.map((b) => nameOf(b.minorId)))} ${openBuyers.length > 1 ? "want" : "wants"} ${wanted}`
        : undefined;
    const offerMore = moreRefusal("sellCommodity", row, row.offer) ?? atDemand;
    const onlyPowers = openBuyers.length > 0
      ? []
      : buyersOf(state, nation.id, row.commodity).filter((id) => !row.buyers.some((b) => b.minorId === id) && tradeBarrier(state, nation.id, id) === undefined);
    // FR-494: no minor sells it, so a bid goes to the other Great Powers we may trade with (FR-492), refunded if unfilled
    const rivalSellers =
      row.sellers.length > 0 ? [] : bidSellersOf(state, nation.id, row.commodity).filter((id) => tradeBarrier(state, nation.id, id) === undefined);
    const bidNote =
      refusal(bidMore) ?? info(rivalSellers.length > 0 ? rivalSellerText(rivalSellers.map(nameOf), row.buyers.length > 0) : rivalFavourites(row.sellers));
    const rivalLastTurn = rivalLastTurnText(state, nation.id, row.commodity, nameOf);
    const offerNote =
      refusal(offerMore) ?? info(onlyPowers.length > 0 ? `Only ${namesText(onlyPowers.map(nameOf))} may buy this` : rivalFavourites(row.buyers));
    const dealPrices = dealPriceLines(row, nameOf);
    return {
      commodity: row.commodity,
      name: commodityName(row.commodity),
      price: row.price,
      ...(dealPrices.length > 0 ? { dealPrices } : {}),
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
      ...(rivalLastTurn ? { rivalLastTurn } : {}),
    };
  });
  // Each minor that trades this turn, with its favourite as the rows give it (this turn's diplomacy forecast, FR-246)
  const favouriteOf = new Map<string, string>();
  for (const p of board.flatMap((r) => [...r.sellers, ...r.buyers])) if (p.favouriteId && !favouriteOf.has(p.minorId)) favouriteOf.set(p.minorId, p.favouriteId);
  const favourites = [...favouriteOf].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([minorId, favouriteId]) => ({ minorId, favouriteId }));
  const firstSaleText = firstSaleLine(board, rows);
  return {
    rows,
    treasury: nation.treasury,
    capacity,
    holdsText: `Holds: ${capacity.free} of ${capacity.holds} free`,
    fleetText: `Holds: ${capacity.holds} (${fleet.join(", ") || "no ships"})`,
    bids: { used: rows.filter((r) => r.bid > 0).length, max: MAX_BUY_BIDS },
    favouritesText: favourites.length > 0 ? `${favouritesSentence(favourites, nameOf)}.` : "",
    ...(firstSaleText ? { firstSaleText } : {}),
  };
}
