// The army upkeep End Turn will charge (FR-202) and the cash it will find (FR-261; M8 review F2): the screens show the
// upkeep before End Turn and warn when the player's own spending leaves too little, as the scripted player's reserve
// (FR-213 (a)) does for the computer. A pure read of the state and this turn's intents.
import type { Regiment } from "@/types/Army";
import type { NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { GrantIntent } from "@/types/Intent";
import { isMilitia, REGIMENTS, UPKEEP_PER_ARMS } from "@/definisions/regiments";
import { armyAt, isArmyIntent, regimentsOf } from "./armies";

export interface UpkeepForecast {
  /** FR-202's upkeep on the regiments left after this turn's disband orders (FR-207); this turn's recruits pay from next turn. */
  due: number;
  /**
   * The treasury once the diplomacy phase has paid the standing locked grants it can (FR-170), the step that comes
   * before the upkeep; this turn's sales come on top of it in the trade phase.
   */
  cash: number;
  /** `cash` < `due`: unless this turn's sales bring in the rest, the newest regiments are disbanded (FR-202). */
  short: boolean;
}

/** The regiments the nation ordered to disband this turn (FR-207): they leave before the upkeep step. */
const disbandingOf = (state: GameState, nationId: NationId): ReadonlySet<RegimentId> =>
  new Set(state.intents.filter(isArmyIntent).flatMap((i) => (i.kind === "disband" && i.nationId === nationId ? i.regimentIds : [])));

/** FR-202's upkeep on these regiments, leaving out the militia and those to be disbanded. */
const upkeepOn = (regiments: readonly Regiment[], disbanding: ReadonlySet<RegimentId>): number =>
  UPKEEP_PER_ARMS * regiments.filter((r) => !isMilitia(r.type) && !disbanding.has(r.id)).reduce((sum, r) => sum + REGIMENTS[r.type].stats.armamentsCost, 0);

/**
 * The part of `upkeepForecast`'s `due` paid for the nation's regiments now in the province (FR-266): $0 for militia
 * only. A regiment ordered to march still counts here, as the upkeep step comes before the marches.
 */
export const upkeepIn = (state: GameState, nationId: NationId, provinceId: ProvinceId): number =>
  upkeepOn(armyAt(state, nationId, provinceId)?.regiments ?? [], disbandingOf(state, nationId));

/** What End Turn's upkeep step will ask of the nation and what the treasury will hold before this turn's sales. */
export function upkeepForecast(state: GameState, nationId: NationId): UpkeepForecast {
  const due = upkeepOn(regimentsOf(state, nationId), disbandingOf(state, nationId));

  let cash = state.nations.find((n) => n.id === nationId)?.treasury ?? 0;
  // A standing locked grant replaced by a locked grant ordered this turn (paid when ordered) or stopped this turn is not
  // paid again; the others are paid, in pair order, while the treasury holds them (FR-170).
  const settled = new Set(
    state.intents
      .filter((i) => i.nationId === nationId && ((i.kind === "grant" && (i as GrantIntent).locked) || i.kind === "grant-stop"))
      .map((i) => i.targetId)
  );
  for (const key of Object.keys(state.diplomacy).sort()) {
    const amount = state.diplomacy[key].lockedGrants[nationId];
    if (amount === undefined) continue;
    const [a, b] = key.split("|");
    if (settled.has(a === nationId ? b : a)) continue;
    if (cash >= amount) cash -= amount;
  }
  return { due, cash, short: cash < due };
}
