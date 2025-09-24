import { StateCreator } from "zustand";
import { GameStore } from "./types";
import { runTurnPhases } from "./phases";

export interface TurnSlice {
  turn: number;
  year: number;
  advanceTurn: () => void;
}

export const createTurnSlice: StateCreator<GameStore, [], [], TurnSlice> = (
  set,
  get
) => ({
  turn: 1,
  year: 1900,
  advanceTurn: () => {
    const state = get();
    const nextTurn = state.turn + 1;
    const nextYear = state.year + (state.turn % 4 === 0 ? 1 : 0);

    const nationsWithAppliedCapacity = state.nations.map((n) => {
      const inc = n.transportCapacityPendingIncrease ?? 0;
      if (inc > 0) {
        return {
          ...n,
          transportCapacity: Math.max(
            0,
            Math.floor((n.transportCapacity ?? 0) + inc)
          ),
          transportCapacityPendingIncrease: 0,
        };
      }
      return n;
    });

    const prePhasesState: GameStore = {
      ...state,
      nations: nationsWithAppliedCapacity,
    };

    const phasedState = runTurnPhases(prePhasesState, nextTurn);

    set({
      ...phasedState,
      turn: nextTurn,
      year: nextYear,
    });
  },
});