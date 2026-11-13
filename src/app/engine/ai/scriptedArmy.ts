// The scripted garrison (FR-213; Imp1 Defense Minister: "Strengthen the Army" when a rival army is more than twice ours
// [08:W26]; the rule is remake). The scripted player never moves or disbands a regiment (so its capital province keeps
// the start army's 4 arms); under a threat it recruits 1 Regulars a turn, and its production run (economy.ts) first
// makes the armaments for it and keeps them. On a world without provinces there is never a threat, so its orders there
// are as before M8.
import type { GameState } from "@/types/GameState";
import type { CountryId, NationId } from "@/types/Common";
import { REGIMENTS, SCRIPTED_GARRISON } from "@/definisions/regiments";
import { recruitingOf, strengthIn } from "../army/armies";
import { warBetween } from "../diplomacy/queries";
import { nationById } from "../orders/queries";
import { adjacentProvinces, provincesOf } from "../world/provinces";
import type { Order } from "../orders/Order";

/**
 * A country at war with the nation has a strength (FR-204) in a province bordering one of the nation's provinces above
 * the nation's own strength in that province (FR-213).
 */
export function armyThreat(state: GameState, nationId: NationId): boolean {
  if (state.provinces.length === 0) return false;
  const countries: CountryId[] = [...state.nations.map((n) => n.id), ...state.minorNations.map((m) => m.id)];
  const enemies = countries.filter((id) => id !== nationId && warBetween(state, nationId, id) !== undefined);
  if (enemies.length === 0) return false;
  return provincesOf(state, nationId).some((own) => {
    const ours = strengthIn(state, nationId, own.id);
    return adjacentProvinces(state, own.id).some((near) => enemies.some((enemy) => strengthIn(state, enemy, near.id) > ours));
  });
}

/**
 * FR-213: under a threat, 1 Regulars this turn while the treasury after the order stays at $2,500 or more; `propose`
 * keeps it only when it validates, so without an armament or a free untrained worker nothing is ordered. Planned after
 * the standing orders are cleared and before anything else takes labour or cash.
 */
export function planGarrison(view: () => GameState, nationId: NationId, propose: (order: Order) => boolean): void {
  const state = view();
  const nation = nationById(state, nationId);
  if (!nation || !armyThreat(state, nationId)) return;
  const { regiment, treasuryFloor } = SCRIPTED_GARRISON;
  if (nation.treasury - REGIMENTS[regiment].cash < treasuryFloor) return;
  propose({ kind: "setRecruitment", nationId, regiment, count: recruitingOf(nation, regiment) + 1 });
}
