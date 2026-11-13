// The scripted player's trade with partners (FR-193), used by economy.ts in a "partners" market: a consulate
// a turn, and the caps on its FR-128 bids and offers from what the minors it may trade with offer and want.
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { TradeAmounts, TradeCommodity } from "@/types/Market";
import { OVERTURE_COST } from "@/definisions/diplomacyRules";
import { relationOf } from "../diplomacy/relations";
import { diplomacyIntentsOf } from "../diplomacy/queries";
import { minorDemand, minorOffers, tradeBarrier } from "../market/partners";
import { nationById } from "../orders/queries";
import type { Order } from "../orders/Order";

type Propose = (order: Order) => boolean;

const minorIds = (state: GameState): string[] => state.minorNations.map((m) => m.id).sort();

/**
 * (a) One consulate a turn, with the first minor in id order it holds none with and has ordered none with
 * this turn, while its treasury after the order stays at `reserve` or more. A refused order (at war with
 * that minor) tries the next one.
 */
export function planConsulate(view: () => GameState, nationId: NationId, reserve: number, propose: Propose): void {
  for (const minorId of minorIds(view())) {
    const state = view();
    if ((nationById(state, nationId)?.treasury ?? 0) - OVERTURE_COST.consulate < reserve) return;
    const held = relationOf(state, nationId, minorId)?.consulates.includes(nationId) ?? true;
    const ordered = diplomacyIntentsOf(state, nationId, minorId).some((i) => i.kind === "consulate");
    if (held || ordered) continue;
    if (propose({ kind: "proposeOverture", nationId, overture: "consulate", targetId: minorId })) return;
  }
}

/** Sums one amount per minor the nation may trade with this turn (a consulate ordered this turn counts, FR-185). */
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
