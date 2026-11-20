import { SHIPS } from "@/definisions/ships";
import type { GameState } from "@/types/GameState";
import type { Order, ValidationResult } from "./Order";
import { nationById } from "./queries";

type ShipyardOrder = Extract<Order, { kind: "setShipyard" }>;

export function validateShipyard(state: GameState, { nationId, ship, count }: ShipyardOrder): ValidationResult {
  if (!Object.hasOwn(SHIPS, ship)) return { ok: false, reason: "invalid-target" };
  if (!Number.isSafeInteger(count) || count < 0) return { ok: false, reason: "invalid-amount" };
  const nation = nationById(state, nationId)!;
  const delta = count - (nation.merchantMarine.pendingShips?.[ship] ?? 0);
  const cost = SHIPS[ship];
  if ((nation.warehouse.lumber ?? 0) < delta * cost.lumber || (nation.warehouse.fabric ?? 0) < delta * cost.fabric) {
    return { ok: false, reason: "insufficient-resources" };
  }
  return { ok: true };
}

export function applyShipyard(state: GameState, { nationId, ship, count }: ShipyardOrder): GameState {
  const nations = state.nations.map(nation => {
    if (nation.id !== nationId) return nation;
    const marine = nation.merchantMarine;
    const delta = count - (marine.pendingShips?.[ship] ?? 0);
    if (!delta) return nation;
    const pendingShips = { ...marine.pendingShips, [ship]: count };
    if (!count) delete pendingShips[ship];
    return {
      ...nation,
      warehouse: { ...nation.warehouse,
        lumber: (nation.warehouse.lumber ?? 0) - SHIPS[ship].lumber * delta,
        fabric: (nation.warehouse.fabric ?? 0) - SHIPS[ship].fabric * delta,
      },
      merchantMarine: { ...marine, pendingShips },
    };
  });
  return { ...state, nations };
}
