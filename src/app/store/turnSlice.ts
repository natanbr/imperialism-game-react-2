import { StateCreator } from "zustand";
import { runTurnPhases } from "./phases";
import { GameStore } from "./rootStore";

export interface TurnSlice {
  turn: number;
  year: number;
  advanceTurn: () => void;
}

export const createTurnSlice: StateCreator<GameStore, [], [], TurnSlice> = (set, get) => ({
  turn: 1,
  year: 1900,
  advanceTurn: () => {
    const currentState = get();

    // Run all game systems
    const newState = runTurnPhases(currentState);

    // Update the state
    set({
      ...newState,
      turn: currentState.turn + 1,
      year: currentState.turn % 4 === 0 ? currentState.year + 1 : currentState.year,
    });
  },
});
