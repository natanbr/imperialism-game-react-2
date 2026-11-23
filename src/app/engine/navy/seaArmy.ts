import { isMilitia, REGIMENTS } from "@/definisions/regiments";
import type { CountryId, NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import { armiesOf, holds, pendingArmyIntent } from "../army/armies";
import { bookedArms, regimentArms } from "../army/deployment";
import { hasLandRoute, warActive } from "../diplomacy/queries";
import type { MoveArmyOrder, ValidationResult } from "../orders/Order";
import { provinceById, provincesOf } from "../world/provinces";
import { approachesOf, deployedFleet, firstLandingTurn, fleetApproach, fleetArms, isPortClosed, openPortApproaches, pendingFleetMission } from "./fleets";

/** The missing requirement for a sea declaration. Only the declarer's commitments and resolved foreign positions count. */
export function seaWarRequirement(state: GameState, nationId: NationId, targetId: CountryId): string | undefined {
  const fleets = state.fleets.filter(f => f.ownerNationId === nationId && fleetArms(f) > 0);
  if (!fleets.length) return "Commission a warship at the Shipyard.";
  const waters = new Set(provincesOf(state, targetId).flatMap(p => approachesOf(state, p.id).map(a => a.seaId)));
  const capacity = new Map<string, number>();
  for (const fleet of fleets) {
    const seaId = fleetApproach(state, fleet)?.seaId;
    if (seaId && waters.has(seaId)) capacity.set(seaId, Math.max(capacity.get(seaId) ?? 0, fleetArms(fleet)));
  }
  if (!capacity.size) return "A commissioned squadron must share an ocean with the target coast.";
  for (const army of armiesOf(state, nationId)) {
    const origins = openPortApproaches(state, nationId, army.provinceId);
    const support = Math.max(0, ...origins.map(a => capacity.get(a.seaId) ?? 0));
    if (army.regiments.some(r => !isMilitia(r.type) && !pendingArmyIntent(state, r.id) && REGIMENTS[r.type].stats.armamentsCost <= support)) return;
  }
  return "Place an available mobile regiment in an open port on that ocean, within the squadron’s ARMS allowance.";
}

export const canReachWar = (state: GameState, nationId: NationId, targetId: CountryId): boolean =>
  hasLandRoute(state, nationId, targetId) || !seaWarRequirement(state, nationId, targetId);

/** Used both for the booking and again with resolved fleet positions before the troops leave. */
export function validateSeaDeployment(state: GameState, order: MoveArmyOrder, phase: "planning" | "dispatch" = "planning"): ValidationResult {
  const { nationId, fromProvinceId, toProvinceId, regimentIds } = order;
  const target = provinceById(state, toProvinceId);
  if (!target || fromProvinceId === toProvinceId || !holds(state, nationId, fromProvinceId)) return { ok: false, reason: "invalid-target" };
  if (target.ownerId !== nationId && !warActive(state, nationId, target.ownerId)) return { ok: false, reason: "not-at-war" };
  const fleet = deployedFleet(state, nationId);
  const mission = phase === "planning" ? pendingFleetMission(state, nationId)?.mission : undefined;
  if (!fleet?.approach || fleet.approach.provinceId !== toProvinceId || fleet.contested ||
      fleet.siteSinceTurn === undefined || state.turn < firstLandingTurn(fleet.siteSinceTurn) || mission === "sail" || mission === "return") {
    return { ok: false, reason: "no-landing-site" };
  }
  const seaId = fleet.approach.seaId;
  if (!openPortApproaches(state, nationId, fromProvinceId).some(a => a.seaId === seaId)) {
    return { ok: false, reason: isPortClosed(state, nationId, fromProvinceId, seaId) ? "port-closed" : "no-port-route" };
  }
  const booked = bookedArms(state, nationId, "sea", regimentIds);
  return booked + regimentArms(state, regimentIds) <= fleetArms(fleet)
    ? { ok: true } : { ok: false, reason: "insufficient-naval-support" };
}
