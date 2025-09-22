import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

export interface ArmySlice {
  // actions: createArmy, moveArmy, mergeArmies, resolveBattle...
}

export const createArmySlice: StateCreator<GameState, [], [], ArmySlice> = (set) => ({
  // initial state for army slice
});
