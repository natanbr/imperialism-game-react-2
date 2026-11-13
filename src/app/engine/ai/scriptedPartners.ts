// The scripted player's trade with partners (FR-245), used by economy.ts in a "partners" market: a consulate
// only with a minor whose offer or demand it will use, and the caps on its bids and offers from what the minors
// it may trade with offer and want.
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { TradeAmounts, TradeCommodity } from "@/types/Market";
import { OVERTURE_COST } from "@/definisions/diplomacyRules";
import { diplomacyAfterThisTurn, favouritePartner, minorDemand, minorOffers, tradeBarrier } from "../market/partners";
import { tradeCapacityOf } from "../market/market";
import { nationById } from "../orders/queries";
import type { Order } from "../orders/Order";

type Propose = (order: Order) => boolean;

/** What the nation would trade this turn if every minor were open to it: units to buy and to sell. */
export interface TradeWants {
  buy: TradeAmounts;
  sell: TradeAmounts;
}

const minorIds = (state: GameState): string[] => state.minorNations.map((m) => m.id).sort();

/** Sums one amount per minor the nation may trade with this turn (a consulate ordered this turn counts, FR-246). */
function sumOverPartners(state: GameState, nationId: NationId, amounts: (minorId: string) => TradeAmounts): TradeAmounts {
  const total: TradeAmounts = {};
  for (const minorId of minorIds(state)) {
    if (tradeBarrier(state, nationId, minorId) !== undefined) continue;
    for (const [commodity, n] of Object.entries(amounts(minorId)) as [TradeCommodity, number][]) total[commodity] = (total[commodity] ?? 0) + n;
  }
  return total;
}

/** (b) The most each bid may be: what the minors it may trade with offer this turn. */
export const partnerSupply = (state: GameState, nationId: NationId): TradeAmounts => sumOverPartners(state, nationId, (m) => minorOffers(state, m));

/** (c) The most each offer may be: what those minors bid for this turn (clothing, furniture, hardware only). */
export const partnerDemand = (state: GameState, nationId: NationId): TradeAmounts => sumOverPartners(state, nationId, (m) => minorDemand(state, m));

const entries = (amounts: TradeAmounts) => Object.entries(amounts) as [TradeCommodity, number][];

/**
 * (a) A consulate, at most one a turn, only when the minors it may trade with and that favour it (FR-187: they
 * serve it first) do not cover what it wants to trade (the units they cover are fewer than its holds), and only
 * with the first minor in id order, among those it has no consulate with and no other barrier to, that offers a
 * commodity it wants more of or bids for a good it wants to sell more of; while its treasury after the order
 * stays at `reserve` or more. A refused order tries the next.
 */
export function planConsulate(view: () => GameState, nationId: NationId, reserve: number, wants: TradeWants, propose: Propose): void {
  const state = view();
  const after = diplomacyAfterThisTurn(state);
  const favoured = (minorId: string) => favouritePartner(after, minorId) === nationId;
  const supply = sumOverPartners(state, nationId, (m) => (favoured(m) ? minorOffers(state, m) : {}));
  const demand = sumOverPartners(state, nationId, (m) => (favoured(m) ? minorDemand(state, m) : {}));
  const covered =
    entries(wants.buy).reduce((sum, [c, n]) => sum + Math.min(n, supply[c] ?? 0), 0) +
    entries(wants.sell).reduce((sum, [c, n]) => sum + Math.min(n, demand[c] ?? 0), 0);
  if (covered >= tradeCapacityOf(state, nationId).holds) return;
  const short = (want: TradeAmounts, cover: TradeAmounts, has: TradeAmounts) => entries(want).some(([c, n]) => n > (cover[c] ?? 0) && (has[c] ?? 0) > 0);
  for (const minorId of minorIds(state)) {
    const now = view();
    if ((nationById(now, nationId)?.treasury ?? 0) - OVERTURE_COST.consulate < reserve) return;
    if (tradeBarrier(now, nationId, minorId) !== "no-consulate") continue;
    if (!short(wants.buy, supply, minorOffers(now, minorId)) && !short(wants.sell, demand, minorDemand(now, minorId))) continue;
    if (propose({ kind: "proposeOverture", nationId, overture: "consulate", targetId: minorId })) return;
  }
}
