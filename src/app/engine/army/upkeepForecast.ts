// The army upkeep End Turn will charge (FR-202) and the cash it will find (FR-261; M8 review F2): the screens show the
// upkeep before End Turn and warn when the player's own spending leaves too little, as the scripted player's reserve
// (FR-213 (a)) does for the computer. A pure read of the state and this turn's intents.
import type { Regiment } from "@/types/Army";
import type { NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { GrantIntent, TradePolicyIntent } from "@/types/Intent";
import type { TradeCommodity } from "@/types/Market";
import type { Nation } from "@/types/Nation";
import { hasOpenCredit } from "../credit/account";
import { interestOn } from "../credit/settlement";
import { isMilitia, REGIMENTS, UPKEEP_PER_ARMS } from "@/definisions/regiments";
import { marketOf, priceOf, tradeOrdersOf } from "../market/market";
import { diplomacyAfterThisTurn, marketModeOf } from "../market/partners";
import { settlePartnerTrade } from "../market/settlePartners";
import type { GiveGrantOrder } from "../orders/Order";
import { applyDiplomacyOrder } from "../orders/diplomacyOrders";
import { applyBuyCommodity } from "../orders/tradeOrders";
import { armyAt, isArmyIntent, regimentsOf, serialOf } from "./armies";

export interface UpkeepForecast {
  /** Debt and excess after projected upkeep, before interest, using the currently posted limit. */
  projectedDebt?: number;
  overLimitBy?: number;
  /** Conditional on the posted limit still applying and no sale receipts before assessment. */
  forcedSaleRisk?: { interest: number; debt: number; excess: number };
  /** FR-202's upkeep on the regiments left after this turn's disband orders (FR-207); this turn's recruits pay from next turn. */
  due: number;
  /**
   * The treasury once the diplomacy phase has paid the standing locked grants it can (FR-170) and the trade phase has
   * taken what this turn's bids cost above their reserve (FR-392), the steps that come before the upkeep; this turn's
   * sales come on top of it in the trade phase.
   */
  cash: number;
  /** `cash` < `due`: unless this turn's sales bring in the rest, the newest regiments are disbanded (FR-202). */
  short: boolean;
  /** FR-393: `due` less `cash` when short, else 0: what this turn's sales must bring in to keep every regiment. */
  shortBy: number;
  /**
   * FR-393: the regiments FR-202's step would disband at `cash`, newest first (the step's own order), so the warning
   * can name them; empty when not short. All of the non-militia regiments when even the last one cannot be paid.
   */
  regimentsLost: Regiment[];
}

/** The regiments the nation ordered to disband this turn (FR-207): they leave before the upkeep step. */
const disbandingOf = (state: GameState, nationId: NationId): ReadonlySet<RegimentId> =>
  new Set(state.intents.filter(isArmyIntent).flatMap((i) => (i.kind === "disband" && i.nationId === nationId ? i.regimentIds : [])));

/** FR-202's upkeep on these regiments, leaving out the militia and those to be disbanded. */
const upkeepOn = (regiments: readonly Regiment[], disbanding: ReadonlySet<RegimentId>): number =>
  UPKEEP_PER_ARMS * regiments.filter((r) => !isMilitia(r.type) && !disbanding.has(r.id)).reduce((sum, r) => sum + REGIMENTS[r.type].stats.armamentsCost, 0);

/**
 * The part of `upkeepForecast`'s `due` paid for the nation's regiments now in the province (FR-266): $0 for militia
 * only. A regiment ordered to march still counts here, as the upkeep step comes before the marches.
 */
export const upkeepIn = (state: GameState, nationId: NationId, provinceId: ProvinceId): number =>
  upkeepOn(armyAt(state, nationId, provinceId)?.regiments ?? [], disbandingOf(state, nationId));

/**
 * FR-392 (audit AISIM-06): what this turn's bids will cost above the reserve they took when ordered (amount x P), which
 * the trade phase takes from the treasury before the upkeep step: a deal with a seller we subsidise costs
 * floor(P x (1 + s)) a unit (FR-189). Read by settling this turn's trade as the phase will (after this turn's diplomacy,
 * `diplomacyAfterThisTurn`) with this nation's orders so far; only the extra counts, not this turn's sales nor a refund.
 * Nothing in "world" (bids pay the world price when ordered) or without a bid.
 */
function bidExtraOf(state: GameState, nationId: NationId): number {
  if (marketModeOf(state) !== "partners") return 0;
  if (!Object.values(tradeOrdersOf(state, nationId).buy).some((n) => (n ?? 0) > 0)) return 0;
  const market = marketOf(state);
  let extra = 0;
  settlePartnerTrade(diplomacyAfterThisTurn(state, nationId), state.turn, (event) => {
    if (event.type !== "goods-bought" || event.nationId !== nationId) return;
    extra += Math.max(0, event.cost - event.amount * priceOf(market, event.commodity));
  });
  return extra;
}

/**
 * FR-393: the regiments FR-202's step disbands when `cash` cannot pay `due`: the newest (highest serial) first, one at a
 * time, until the rest can be paid (`upkeepSystem`'s loop on the same regiments).
 */
function lostAt(regiments: readonly Regiment[], due: number, cash: number): Regiment[] {
  const lost: Regiment[] = [];
  let amount = due;
  for (const regiment of [...regiments].sort((a, b) => serialOf(b.id) - serialOf(a.id))) {
    if (cash >= amount) break;
    lost.push(regiment);
    amount -= UPKEEP_PER_ARMS * REGIMENTS[regiment.type].stats.armamentsCost;
  }
  return lost;
}

/** A bid changes the treasury and the trade orders. The regiments and the standing grant instructions stay the same. */
function upkeepBasis(state: GameState, nationId: NationId) {
  const disbanding = disbandingOf(state, nationId);
  const paying = regimentsOf(state, nationId).filter((r) => !isMilitia(r.type) && !disbanding.has(r.id));
  const due = upkeepOn(paying, disbanding);
  const nation = state.nations.find(n => n.id === nationId);
  // A standing locked grant replaced by a locked grant ordered this turn (paid when ordered) or stopped this turn is not
  // paid again; the others are paid, in pair order, while the treasury holds them (FR-170).
  const settled = new Set(
    state.intents
      .filter((i) => i.nationId === nationId && ((i.kind === "grant" && (i as GrantIntent).locked) || i.kind === "grant-stop"))
      .map((i) => i.targetId)
  );
  const grants: number[] = [];
  for (const key of Object.keys(state.diplomacy).sort()) {
    const amount = state.diplomacy[key].lockedGrants[nationId];
    if (amount === undefined) continue;
    const [a, b] = key.split("|");
    if (settled.has(a === nationId ? b : a)) continue;
    grants.push(amount);
  }
  return { nation, due, paying, grants };
}

function afterGrants(cash: number, grants: readonly number[]): number {
  for (const grant of grants) if (cash >= grant) cash -= grant;
  return cash;
}

function forecastAt({ nation, due, paying }: ReturnType<typeof upkeepBasis>, cash: number): UpkeepForecast {
  if (hasOpenCredit(nation)) {
    const projectedDebt = Math.max(0, due - cash);
    const limit = nation.creditAccount.limit;
    const interest = interestOn(projectedDebt, limit).amount;
    const debt = projectedDebt + interest;
    return { due, cash, short: false, shortBy: 0, regimentsLost: [],
      projectedDebt, overLimitBy: Math.max(0, projectedDebt - limit),
      ...(debt > limit && { forcedSaleRisk: { interest, debt, excess: debt - limit } }) };
  }
  const short = cash < due;
  return { due, cash, short, shortBy: short ? due - cash : 0, regimentsLost: short ? lostAt(paying, due, cash) : [] };
}

/**
 * What End Turn's upkeep step will ask of the nation and what the treasury will hold before this turn's sales.
 * `extraSpend` (FR-393): money about to be spent this turn, taken off the cash; negative is money given back. A grant
 * about to be ordered goes through `upkeepForecastWithGrant` instead, as it can also replace a standing grant.
 */
export function upkeepForecast(state: GameState, nationId: NationId, extraSpend = 0): UpkeepForecast {
  const basis = upkeepBasis(state, nationId);
  const cash = (basis.nation?.treasury ?? 0) - extraSpend;
  // A prospective spend also changes what a subsidised seller can collect above the bid reserve.
  const bidState = extraSpend && basis.nation ? {
    ...state,
    nations: state.nations.map(n => n === basis.nation ? { ...n, treasury: cash } : n),
  } : state;
  return forecastAt(basis, afterGrants(cash, basis.grants) - bidExtraOf(bidState, nationId));
}

/**
 * FR-422 with FR-393: the forecast once this grant is ordered, for the question a large grant asks first. The order goes
 * through the engine's own `giveGrant` step on a copy (the UI never applies an order, FR-022), so the forecast counts
 * what End Turn will: this turn's grant to the same country given back (FR-161), the standing locked grant to it not
 * paid again when a locked one replaces it, and the other standing grants paid in pair order with what is left (FR-170).
 */
export const upkeepForecastWithGrant = (state: GameState, order: GiveGrantOrder): UpkeepForecast =>
  upkeepForecast(applyDiplomacyOrder(state, order), order.nationId);

/** One view's shared forecast. Each call previews one additional unit of a permitted bid. */
export function nextPurchaseForecasts(state: GameState, nation: Nation) {
  const basis = upkeepBasis(state, nation.id);
  const market = marketOf(state);
  const { buy } = tradeOrdersOf(state, nation.id);
  // Include unprocessed policies: a bid can leave different cash for diplomacy's standing grants.
  const maxSubsidy = marketModeOf(state) === "partners" ? Math.max(0,
    ...Object.values(state.diplomacy).map(pair => pair.subsidies[nation.id] ?? 0),
    ...state.intents.filter(intent => intent.nationId === nation.id && intent.kind === "trade-policy")
      .map(intent => (intent as TradePolicyIntent).subsidyPercent),
  ) : 0;
  const reserved = Object.entries(buy).reduce((sum, [commodity, units]) =>
    sum + units * priceOf(market, commodity as TradeCommodity), 0);

  return (commodity: TradeCommodity, price: number): UpkeepForecast | undefined => {
    const cash = afterGrants(nation.treasury - price, basis.grants);
    // Even if every reserved unit is filled at the largest possible premium, this bid cannot cause a warning.
    if (cash - (reserved + price) * maxSubsidy / 100 >= basis.due) return undefined;
    const premium = maxSubsidy > 0 ? bidExtraOf(applyBuyCommodity(state, {
      kind: "buyCommodity", nationId: nation.id, commodity, amount: (buy[commodity] ?? 0) + 1,
    }), nation.id) : 0;
    return forecastAt(basis, cash - premium);
  };
}
