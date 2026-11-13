// The combat phase (rules 01 section 1). M8: the marches into the nation's own provinces (FR-206), then the healing of
// the regiments that neither moved nor fought (FR-208). M9 adds the battles between the two (FR-216). A world without
// armies (two-islands) passes unchanged.
import type { GameState } from "@/types/GameState";
import type { NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { Regiment } from "@/types/Army";
import { FULL_HEALTH, HEALING_PER_TURN, isMilitia } from "@/definisions/regiments";
import { findRegiment, holds, isArmyMoveIntent, mapRegiments, placeRegiments, removeRegiments } from "../army/armies";
import { byIntentOrder } from "../turn/intents";
import type { TurnContext, TurnSystem } from "../turn/context";

export const combatSystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState => {
  if (state.armies.length === 0) return state;
  return heal(march(state, ctx), ctx);
};

interface Route {
  nationId: NationId;
  fromProvinceId: ProvinceId;
  toProvinceId: ProvinceId;
  regiments: Regiment[];
}

/**
 * FR-206: every move intent into the nation's own province resolves at once (two armies may swap provinces), each
 * regiment one province, intents in `intentOrder`. Checked again when resolved: a regiment no longer in the nation's
 * army in the province it left from, or a destination the nation no longer holds (M9: an attack), stays. The arrivals
 * join the army there, marked as moved this turn; one `army-moved` per nation and route.
 */
function march(state: GameState, ctx: TurnContext): GameState {
  const moves = byIntentOrder(state, ctx.turn, state.intents.filter(isArmyMoveIntent));
  if (moves.length === 0) return state;
  const moving = new Set<RegimentId>();
  const routes = new Map<string, Route>();
  for (const intent of moves) {
    if (!holds(state, intent.nationId, intent.toProvinceId)) continue;
    for (const id of intent.regimentIds) {
      const found = findRegiment(state, id);
      if (!found || moving.has(id) || isMilitia(found.regiment.type)) continue;
      if (found.army.ownerId !== intent.nationId || found.army.provinceId !== intent.fromProvinceId) continue;
      moving.add(id);
      const key = `${intent.nationId} ${intent.fromProvinceId} ${intent.toProvinceId}`;
      const route = routes.get(key) ?? { nationId: intent.nationId, fromProvinceId: intent.fromProvinceId, toProvinceId: intent.toProvinceId, regiments: [] };
      route.regiments.push({ ...found.regiment, movedOnTurn: ctx.turn });
      routes.set(key, route);
    }
  }
  if (moving.size === 0) return state;
  let s = removeRegiments(state, moving);
  for (const { nationId, fromProvinceId, toProvinceId, regiments } of routes.values()) {
    s = placeRegiments(s, nationId, toProvinceId, regiments);
    ctx.emit({ type: "army-moved", nationId, fromProvinceId, toProvinceId, count: regiments.length });
  }
  return s;
}

/** FR-208 (Q32: the rate is remake): each regiment that did not move this turn gains 10 health, up to 100. */
const heal = (state: GameState, ctx: TurnContext): GameState =>
  mapRegiments(state, (r) =>
    r.movedOnTurn === ctx.turn || r.health >= FULL_HEALTH ? r : { ...r, health: Math.min(FULL_HEALTH, r.health + HEALING_PER_TURN) }
  );
