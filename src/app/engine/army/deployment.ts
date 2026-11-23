import type { NationId, RegimentId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import { forceSize, isArmyIntent } from "./armies";

export function regimentArms(state: GameState, ids: readonly RegimentId[]): number {
  const selected = new Set(ids);
  return state.armies.reduce((sum, army) =>
    sum + forceSize({ regiments: army.regiments.filter(r => selected.has(r.id)) }), 0);
}

/** Replacing any of the selected regiments releases its old booking before checking the new route. */
export function bookedArms(state: GameState, nationId: NationId, via: "rail" | "sea", excludingIds: readonly RegimentId[] = []): number {
  const excluded = new Set(excludingIds);
  const ids = state.intents.flatMap(i => isArmyIntent(i) && i.kind !== "disband" && i.nationId === nationId && i.via === via
    ? i.regimentIds.filter(id => !excluded.has(id)) : []);
  return regimentArms(state, ids);
}
