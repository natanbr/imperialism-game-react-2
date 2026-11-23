import { isWarship, SHIPS, WARSHIPS } from "@/definisions/ships";
import type { GameState } from "@/types/GameState";
import { homeApproach } from "../navy/approaches";
import type { Nation } from "@/types/Nation";
import type { Order, ValidationResult } from "./Order";
import { nationById, owns } from "./queries";

type ShipyardOrder = Extract<Order, { kind: "setShipyard" }>;

function pending(nation: Nation, ship: ShipyardOrder["ship"]) {
  return (isWarship(ship) ? nation.pendingWarships?.[ship] : nation.merchantMarine.pendingShips?.[ship]) ?? 0;
}

export function validateShipyard(state: GameState, { nationId, ship, count }: ShipyardOrder): ValidationResult {
  if (isWarship(ship)) {
    if (!homeApproach(state, nationId)) return { ok: false, reason: "invalid-site" };
  } else if (!Object.hasOwn(SHIPS, ship)) return { ok: false, reason: "invalid-target" };
  if (!Number.isSafeInteger(count) || count < 0) return { ok: false, reason: "invalid-amount" };
  const nation = nationById(state, nationId)!;
  const delta = count - pending(nation, ship);
  const cost = isWarship(ship) ? WARSHIPS[ship] : SHIPS[ship];
  const technology = "requiredTechnology" in cost && cost.requiredTechnology;
  if (delta > 0 && technology && !owns(state, nationId, technology)) {
    return { ok: false, reason: "missing-technology", techId: technology };
  }
  if ((nation.warehouse.lumber ?? 0) < delta * cost.lumber || (nation.warehouse.fabric ?? 0) < delta * cost.fabric ||
      ("armaments" in cost && (nation.warehouse.armaments ?? 0) < delta * cost.armaments)) {
    return { ok: false, reason: "insufficient-resources" };
  }
  return { ok: true };
}

export function applyShipyard(state: GameState, { nationId, ship, count }: ShipyardOrder): GameState {
  const nations = state.nations.map(nation => {
    if (nation.id !== nationId) return nation;
    const marine = nation.merchantMarine;
    const delta = count - pending(nation, ship);
    if (!delta) return nation;
    const cost = isWarship(ship) ? WARSHIPS[ship] : SHIPS[ship];
    const pendingShips: Partial<Record<ShipyardOrder["ship"], number>> = {
      ...(isWarship(ship) ? nation.pendingWarships : marine.pendingShips), [ship]: count,
    };
    if (!count) delete pendingShips[ship];
    return {
      ...nation,
      warehouse: { ...nation.warehouse,
        lumber: (nation.warehouse.lumber ?? 0) - cost.lumber * delta,
        fabric: (nation.warehouse.fabric ?? 0) - cost.fabric * delta,
        ...("armaments" in cost && { armaments: (nation.warehouse.armaments ?? 0) - cost.armaments * delta }),
      },
      ...(isWarship(ship) ? { pendingWarships: pendingShips } : { merchantMarine: { ...marine, pendingShips } }),
    };
  });
  return { ...state, nations };
}
