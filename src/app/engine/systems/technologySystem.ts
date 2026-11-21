import { inventionNews } from "../technology";
import type { TurnSystem } from "../turn/context";
import { turnLimitOf } from "../turn/gameOver";

/** Last phase: purchases become usable for the coming turn, after all current-turn work. */
export const technologySystem: TurnSystem = (state, ctx) => {
  if (state.turn < turnLimitOf(state)) {
    for (const event of inventionNews(state, state.turn + 1)) ctx.emit(event);
  }
  if (!state.nations.some(nation => nation.pendingTechnologies?.length)) return state;
  const nations = state.nations.map(nation => nation.pendingTechnologies?.length ? {
    ...nation, technologies: [...(nation.technologies ?? []), ...nation.pendingTechnologies], pendingTechnologies: [],
  } : nation);
  return { ...state, nations };
};
