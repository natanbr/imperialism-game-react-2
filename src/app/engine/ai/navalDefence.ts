import type { GameState } from "@/types/GameState";
import type { NationId } from "@/types/Common";
import { SHIPS, WARSHIPS } from "@/definisions/ships";
import { SCRIPTED_GARRISON } from "@/definisions/regiments";
import { deployedFleet, fleetApproach, homeFleet, threatenedPorts } from "../navy/fleets";
import { planProduction } from "../industry/productionPlan";
import type { Order } from "../orders/Order";
import { nationById } from "../orders/queries";
import { saveShipMaterials } from "./economy";
import { armsWanted } from "./scriptedArmy";

const DEFENSIVE_FRIGATES = 1;

/** Run after army, industry and trade planning. The port list uses resolved foreign positions only. */
export function coastalDefenceOrder(state: GameState, nationId: NationId): Order | undefined {
  if (state.fleets.length === 0) return;
  const threatened = threatenedPorts(state, nationId);
  if (!threatened.length) return;

  const fleet = deployedFleet(state, nationId) ?? homeFleet(state, nationId);
  if (fleet) {
    const sea = fleetApproach(state, fleet)?.seaId;
    const port = threatened.find(p => p.seaId === sea);
    if (!port || fleet.approach?.provinceId === port.provinceId) return;
    return { kind: "setFleetMission", nationId, fleetId: fleet.id, mission: "sail", provinceId: port.provinceId };
  }

  const nation = nationById(state, nationId);
  if (!nation || Object.values(nation.pendingWarships ?? {}).some(count => count > 0)) return;
  const cost = WARSHIPS.frigate;
  const { stock } = planProduction(nation);
  const merchant = saveShipMaterials(state, nationId);
  // Paid orders, including sell offers, have already removed their materials from the warehouse.
  const reserved = {
    lumber: merchant ? SHIPS.indiaman.lumber : 0,
    fabric: merchant ? SHIPS.indiaman.fabric : 0,
    armaments: armsWanted(state, nationId) ? SCRIPTED_GARRISON.armaments : 0,
  };
  for (const resource of ["lumber", "fabric", "armaments"] as const) {
    if ((stock[resource] ?? 0) - reserved[resource] < cost[resource] * DEFENSIVE_FRIGATES) return;
  }
  return { kind: "setShipyard", nationId, ship: "frigate", count: DEFENSIVE_FRIGATES };
}
