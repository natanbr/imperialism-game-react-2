// The scripted Great Power's own diplomacy (FR-174, FR-408): it proposes peace to a Great Power it is at war with once
// that enemy took one of its provinces or won a battle against it in this war, and after an offer that did not end the
// war not again for 6 turns; it proposes nothing else in M6. M13 (FR-489): in a war it declared on a Great Power it
// also proposes peace once it holds a province it took (`warAimHeld`), on that turn and then every 6 turns. At peace it
// orders nothing, so its orders are as before M6 (FR-181).
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import { SCRIPTED_DIPLOMACY } from "@/definisions/diplomacyRules";
import type { Order } from "../orders/Order";
import { warBetween } from "../diplomacy/queries";
import { beatenInWar, warAimHeldSince } from "../diplomacy/scriptedAnswers";

export function scriptedDiplomacyOrders(state: GameState, nationId: NationId): Order[] {
  const orders: Order[] = [];
  for (const enemy of state.nations) {
    if (enemy.id === nationId) continue;
    const war = warBetween(state, nationId, enemy.id);
    const aimSince = war ? warAimHeldSince(state, nationId, enemy.id) : undefined;
    if (!war || !(beatenInWar(state, nationId, enemy.id) || aimSince !== undefined)) continue;
    const last = war.lastPeaceOffer?.[nationId];
    // M13 T-15 (FR-489): an offer made before the province was taken (FR-408, a battle lost) does not hold back the war
    // aim's offer, which comes on the turn after the capture (measured: idle seed 12 offered on 23, took on 26, offered on 29)
    const beforeTheAim = last !== undefined && aimSince !== undefined && last < aimSince;
    if (last !== undefined && !beforeTheAim && state.turn - last < SCRIPTED_DIPLOMACY.offerAgainTurns) continue;
    orders.push({ kind: "proposeOverture", nationId, overture: "peace", targetId: enemy.id });
  }
  return orders;
}
