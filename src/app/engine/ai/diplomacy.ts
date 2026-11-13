// The scripted Great Power's own diplomacy (FR-174): it proposes peace to a Great Power it is at war with
// when it is losing that war (the enemy took one of its provinces, or it is the weaker), at most once every
// 3 turns, and proposes nothing else in M6. At peace it orders nothing, so its orders are as before M6 (FR-181).
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import { SCRIPTED_DIPLOMACY } from "@/definisions/diplomacyRules";
import type { Order } from "../orders/Order";
import { warBetween } from "../diplomacy/queries";
import { losingWar } from "../diplomacy/scriptedAnswers";

export function scriptedDiplomacyOrders(state: GameState, nationId: NationId): Order[] {
  const orders: Order[] = [];
  for (const enemy of state.nations) {
    if (enemy.id === nationId) continue;
    const war = warBetween(state, nationId, enemy.id);
    if (!war || !losingWar(state, nationId, enemy.id)) continue;
    const last = war.lastPeaceOffer?.[nationId];
    if (last !== undefined && state.turn - last < SCRIPTED_DIPLOMACY.offerEveryTurns) continue;
    orders.push({ kind: "proposeOverture", nationId, overture: "peace", targetId: enemy.id });
  }
  return orders;
}
