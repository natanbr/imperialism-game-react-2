import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

export interface IndustrySlice {
  // actions: buildFactory, allocateLabour, processProduction...
}

export const createIndustrySlice: StateCreator<GameState, [], [], IndustrySlice> = (set) => ({
  // initial state for industry slice
});
