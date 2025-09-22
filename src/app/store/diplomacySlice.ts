import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

export interface DiplomacySlice {
  // actions: proposeTreaty, declareWar, sendGrant, setTradePolicy...
}

export const createDiplomacySlice: StateCreator<GameState, [], [], DiplomacySlice> = (set) => ({
  // initial state for diplomacy slice
});
