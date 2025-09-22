import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

export interface TechnologySlice {
  // actions: purchaseTech, unlockTech, applyTechBenefits...
}

export const createTechnologySlice: StateCreator<GameState, [], [], TechnologySlice> = (set) => ({
  // initial state for technology slice
});
