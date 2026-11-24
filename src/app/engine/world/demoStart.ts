// The Demo level (FR-561, NR-037): a testing aid, not a rule of the original game. The human nation starts richer and
// armed so a war and a landing can be tried in the first ten turns; every other nation starts as on Normal.
import { newHomeSquadron, WARSHIPS } from "@/definisions/ships";
import type { GameState } from "@/types/GameState";
import type { Ship } from "@/types/Navy";
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from "@/types/Resource";
import type { RegimentType } from "@/types/Unit";
import { capitalProvinceOf, raiseRegiments } from "../army/armies";
import { withFleets } from "../navy/fleets";

/** Every Demo start number, so tuning is one edit (FR-561's first guess). */
export const DEMO_START = {
  /** The human's start treasury times this ($30,000 for Normal's $10,000). */
  cashMultiplier: 3,
  /** Added to the human's start warehouse: arms to recruit and to build hulls, horses for cavalry, lumber and fabric for hulls. */
  extraStock: {
    [GoodsType.Armaments]: 20,
    [ResourceType.Horses]: 10,
    [MaterialType.Lumber]: 20,
    [MaterialType.Fabric]: 10,
  } satisfies Partial<Record<WarehouseCommodities, number>>,
  /** Raised into the field army in the capital province, after every start regiment, so no other regiment id moves. */
  extraRegiments: [["regulars", 2]] as readonly (readonly [RegimentType, number])[],
  /** Frigates in a home squadron at the capital's berth: 2 ARMS of landing allowance each. */
  frigates: 1,
} as const;

/**
 * A new game's start with the Demo kit for the human nation (FR-561): the cash multiplied, the extra stock added and, on a
 * world with provinces, the extra regiments and a home squadron. On two-islands (no provinces, no armies, no sea war) only
 * the cash and the stock. Every other nation, minor and tile is left as it was (NR-037).
 */
export function withDemoStart(state: GameState): GameState {
  const human = state.nations.find((n) => n.controller === "human");
  if (!human) return state;
  const warehouse = { ...human.warehouse };
  for (const [commodity, extra] of Object.entries(DEMO_START.extraStock) as [WarehouseCommodities, number][]) {
    warehouse[commodity] = (warehouse[commodity] ?? 0) + extra;
  }
  let s: GameState = {
    ...state,
    nations: state.nations.map((n) => (n.id === human.id ? { ...n, treasury: n.treasury * DEMO_START.cashMultiplier, warehouse } : n)),
  };
  if (state.provinces.length === 0) return s;

  const capital = capitalProvinceOf(s, human.id);
  if (capital) for (const [type, count] of DEMO_START.extraRegiments) s = raiseRegiments(s, human.id, capital.id, type, count);
  const { type, firepower, range, armour, hull, battleMove, speed } = WARSHIPS.frigate;
  // Turn 0 in the id: the shipyard names a hull by the turn it is commissioned (1 on), so none can take this id
  const ships: Ship[] = Array.from({ length: DEMO_START.frigates }, (_, i) => ({
    id: `${human.id}-0-frigate-${i + 1}`, type, firepower, range, armour, hull, battleMove, speed, experience: 0,
  }));
  return ships.length > 0 ? withFleets(s, [...s.fleets, newHomeSquadron(human, ships)]) : s;
}
