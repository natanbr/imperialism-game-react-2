import { TIME_CONFIG } from "@/constants/gameConstants";
import { TECHNOLOGIES, technologyById } from "@/definisions/technologies";
import type { GameState } from "@/types/GameState";
import type { GameEvent } from "./turn/context";
import { turnLimitOf } from "./turn/gameOver";

type Clock = Pick<GameState, "turnLimit">;

/** Q130 compresses the manual's 100-year technology calendar into the chosen game length. */
function firstTurn(state: Clock, firstYear: number): number {
  const years = Math.max(0, firstYear - TIME_CONFIG.STARTING_YEAR);
  return TIME_CONFIG.STARTING_TURN + Math.floor(years * turnLimitOf(state) / 100);
}

export function technologyTurn(state: Clock, techId: string): number {
  const tech = technologyById(techId);
  return tech ? firstTurn(state, tech.firstYear) : Infinity;
}

/** Inventions the nation could buy if it had the cash, in catalogue order. */
export function availableTechnologies(state: GameState, nationId: string) {
  const nation = state.nations.find(n => n.id === nationId);
  if (!nation) return [];
  return TECHNOLOGIES.filter(tech => state.turn >= firstTurn(state, tech.firstYear)
    && !nation.technologies?.includes(tech.id) && !nation.pendingTechnologies?.includes(tech.id)
    && tech.prerequisites.every(id => nation.technologies?.includes(id)));
}

export function inventionNews(state: Clock, turn: number): GameEvent[] {
  return TECHNOLOGIES.filter(tech => tech.cost > 0 && firstTurn(state, tech.firstYear) === turn)
    .map(tech => ({ type: "new-invention", techId: tech.id }));
}
