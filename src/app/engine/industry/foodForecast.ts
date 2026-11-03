// The meal the turn being played would serve if it ended now (FR-049). A read-only query: it runs
// the turn's phases on the given state, with the game's RNG and no further orders, and reads the
// meal; nothing is kept. Systems never mutate their input, so the state is untouched.
import type { GameState } from "@/types/GameState";
import type { NationId } from "@/types/Common";
import { createTurnContext, type GameEvent } from "../turn/context";
import { runTurnPhases } from "../turn/phases";

export interface FoodForecast {
  /** Workers that eat at this meal (this turn's migrants join after it). */
  mouths: number;
  fed: number;
  /** Would eat the wrong raw food and give no labour next turn. */
  sick: number;
  /** Would find nothing and leave the workforce. */
  starved: number;
  /** Someone would fall sick or starve. */
  short: boolean;
}

const NO_MEAL: FoodForecast = { mouths: 0, fed: 0, sick: 0, starved: 0, short: false };

export function foodForecast(state: GameState, nationId: NationId): FoodForecast {
  if (!state.nations.some((n) => n.id === nationId)) return NO_MEAL;
  let meal: FoodForecast = NO_MEAL;
  const emit = (event: GameEvent) => {
    if (event.type !== "workers-fed" || event.nationId !== nationId) return;
    const { fed, sick, starved } = event;
    meal = { mouths: fed + sick + starved, fed, sick, starved, short: sick + starved > 0 };
  };
  runTurnPhases(state, createTurnContext({ turn: state.turn, seed: state.seed, emit }));
  return meal;
}
