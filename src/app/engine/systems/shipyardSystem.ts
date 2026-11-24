import { fleetHolds, newHomeSquadron, SHIP_TYPES, shipsOf, WARSHIP_TYPES, WARSHIPS } from "@/definisions/ships";
import type { Nation } from "@/types/Nation";
import type { Ship } from "@/types/Navy";
import { withFleets } from "../navy/fleets";
import type { TurnSystem } from "../turn/context";

function commissionedShips(nation: Nation, turn: number): Ship[] {
  return WARSHIP_TYPES.flatMap(type => {
    const { firepower, range, armour, hull, battleMove, speed } = WARSHIPS[type];
    return Array.from({ length: nation.pendingWarships?.[type] ?? 0 }, (_, i) => ({
      id: `${nation.id}-${turn}-${type}-${i+1}`, type: WARSHIPS[type].type, firepower, range, armour, hull, battleMove, speed, experience: 0,
    }));
  });
}

export const shipyardSystem: TurnSystem = state => {
  const buildWarships = state.nations.some(n => WARSHIP_TYPES.some(t => n.pendingWarships?.[t]));
  if (!buildWarships && !state.nations.some(n => SHIP_TYPES.some(type => n.merchantMarine.pendingShips?.[type]))) return state;
  const fleets = [...state.fleets];
  const nations = state.nations.map(nation => {
    let updated = nation;
    if (buildWarships && nation.pendingWarships) {
      const built = commissionedShips(nation, state.turn);
      if (built.length) {
        const berth = fleets.findIndex(f => f.ownerNationId === nation.id && !f.approach);
        if (berth >= 0) fleets[berth] = { ...fleets[berth], ships: [...fleets[berth].ships, ...built] };
        else fleets.push(newHomeSquadron(nation, built));
        updated = { ...nation, pendingWarships: {} };
      }
    }
    const marine = nation.merchantMarine;
    if (!marine.pendingShips || !Object.keys(marine.pendingShips).length) return updated;
    const ships = { ...shipsOf(marine) };
    for (const type of SHIP_TYPES) {
      const built = marine.pendingShips[type] ?? 0;
      if (built) ships[type] = (ships[type] ?? 0) + built;
    }
    return { ...updated, merchantMarine: { ...marine, ships, holds: fleetHolds(ships), pendingShips: {}, lastShipOrderTurn: state.turn } };
  });
  const built = { ...state, nations };
  return buildWarships ? withFleets(built, fleets) : built;
};
