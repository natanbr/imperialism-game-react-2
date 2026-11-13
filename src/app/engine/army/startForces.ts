// The start forces of a new game with provinces (FR-203; Imp1: militia 4 per Great Power province and 3 per minor
// province, manual p37; start force size 4 and upkeep $100; every capital starts with a level-1 fort, v1.0 readme; the
// composition is remake, Q30). A world without provinces (two-islands) gets nothing, so every v1 baseline is unchanged.
import type { GameState } from "@/types/GameState";
import { ResourceType } from "@/types/Resource";
import { START_FORCES } from "@/definisions/regiments";
import { provincesOf } from "../world/provinces";
import { capitalProvinceOf, raiseRegiments } from "./armies";

/**
 * Each Great Power, in state order: its field army (2 Regulars, 1 Artillery) in its capital province, then 4 Minutemen
 * in each of its provinces (state order), a level-1 fort on its capital tile and 4 more horses; then each minor nation:
 * 3 Minutemen in its province, no fort. Regiment ids follow that order.
 */
export function withStartForces(state: GameState): GameState {
  if (state.provinces.length === 0) return state;
  let s: GameState = { ...state, regimentsRaised: {} };
  for (const nation of state.nations) {
    const capital = capitalProvinceOf(s, nation.id);
    if (!capital) continue;
    for (const [type, count] of START_FORCES.field) s = raiseRegiments(s, nation.id, capital.id, type, count);
    for (const province of provincesOf(s, nation.id)) s = raiseRegiments(s, nation.id, province.id, "minutemen", START_FORCES.militiaPerGreatPowerProvince);
  }
  for (const minor of state.minorNations) {
    for (const province of provincesOf(s, minor.id)) s = raiseRegiments(s, minor.id, province.id, "minutemen", START_FORCES.militiaPerMinorProvince);
  }

  const capitals = new Set(state.nations.map((n) => n.cities[0]));
  const tiles = s.map.tiles.map((row) =>
    row.some((t) => t.cityId && capitals.has(t.cityId))
      ? row.map((t) => (t.cityId && capitals.has(t.cityId) ? { ...t, fortLevel: START_FORCES.capitalFortLevel } : t))
      : row
  );
  const nations = s.nations.map((n) => ({
    ...n,
    warehouse: { ...n.warehouse, [ResourceType.Horses]: (n.warehouse[ResourceType.Horses] ?? 0) + START_FORCES.extraHorses },
  }));
  return { ...s, nations, map: { ...s.map, tiles } };
}
