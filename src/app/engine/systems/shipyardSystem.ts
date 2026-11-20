import { fleetHolds, SHIP_TYPES, shipsOf } from "@/definisions/ships";
import type { TurnSystem } from "../turn/context";

export const shipyardSystem: TurnSystem = state => {
  if (!state.nations.some(n => SHIP_TYPES.some(type => n.merchantMarine.pendingShips?.[type]))) return state;
  const nations = state.nations.map(nation => {
    const marine = nation.merchantMarine;
    if (!marine.pendingShips || !Object.keys(marine.pendingShips).length) return nation;
    const ships = { ...shipsOf(marine) };
    for (const type of SHIP_TYPES) {
      const built = marine.pendingShips[type] ?? 0;
      if (built) ships[type] = (ships[type] ?? 0) + built;
    }
    return { ...nation, merchantMarine: { ...marine, ships, holds: fleetHolds(ships), pendingShips: {}, lastShipOrderTurn: state.turn } };
  });
  return { ...state, nations };
};
