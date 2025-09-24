import { developmentSystem } from "@/systems/developmentSystem";
import { GameStore } from "./rootStore";

// Placeholders for remaining phases (extend as systems are implemented)
export const diplomacySystem = (state: GameStore): GameStore => state;
export const tradeSystem = (state: GameStore): GameStore => state;
export const productionSystem = (state: GameStore): GameStore => state;
export const combatSystem = (state: GameStore): GameStore => state;
export const interceptionSystem = (state: GameStore): GameStore => state;
export const logisticsSystem = (state: GameStore): GameStore => state;

export const runTurnPhases = (initialState: GameStore): GameStore => {
  let state = initialState;

  state = developmentSystem(state);
  state = diplomacySystem(state);
  state = tradeSystem(state);
  state = productionSystem(state);
  state = combatSystem(state);
  state = interceptionSystem(state);
  state = logisticsSystem(state);

  return state;
};