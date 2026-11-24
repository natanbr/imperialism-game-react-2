import type { GameState } from "@/types/GameState";
import { warActive } from "../diplomacy/queries";
import { approachesOf, deployedFleet, fleetApproach, pendingFleetMission } from "../navy/fleets";
import { addIntent, removeIntent } from "../turn/intents";
import { provinceById } from "../world/provinces";
import type { SetFleetMissionOrder, ValidationResult } from "./Order";

export function validateFleetMission(state: GameState, order: SetFleetMissionOrder): ValidationResult {
  const { nationId, fleetId, mission, provinceId } = order;
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet?.ships.length) return { ok: false, reason: "invalid-target" };
  if (fleet.ownerNationId !== nationId) return { ok: false, reason: "not-owner" };
  switch (mission) {
    case "cancel":
      return pendingFleetMission(state, nationId)?.fleetId === fleetId ? { ok: true } : { ok: false, reason: "invalid-target" };
    case "sail": {
      if (!provinceId || fleet.approach?.provinceId === provinceId || (!fleet.approach && deployedFleet(state, nationId))) {
        return { ok: false, reason: "invalid-target" };
      }
      const from = fleetApproach(state, fleet);
      return from && approachesOf(state, provinceId).some(a => a.seaId === from.seaId) ? { ok: true } : { ok: false, reason: "invalid-site" };
    }
    case "return":
      return fleet.approach ? { ok: true } : { ok: false, reason: "invalid-target" };
    case "station": {
      if (!fleet.approach || (provinceId && provinceId !== fleet.approach.provinceId)) return { ok: false, reason: "invalid-site" };
      const province = provinceById(state, fleet.approach.provinceId);
      if (!province) return { ok: false, reason: "invalid-site" };
      if (province.ownerId !== nationId && !warActive(state, nationId, province.ownerId)) return { ok: false, reason: "not-at-war" };
      return fleet.siteSinceTurn === undefined ? { ok: true } : { ok: false, reason: "already-in-place" };
    }
    default:
      return { ok: false, reason: "invalid-target" };
  }
}

export function applyFleetMission(state: GameState, order: SetFleetMissionOrder): GameState {
  const old = pendingFleetMission(state, order.nationId);
  const next = old ? removeIntent(state, old.id) : state;
  if (order.mission === "cancel") return next;
  return addIntent(next, { kind: "fleet-mission", nationId: order.nationId, fleetId: order.fleetId,
    mission: order.mission, ...(order.provinceId && { provinceId: order.provinceId }) });
}
