import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DiplomacySlice {
  // actions: proposeTreaty, declareWar, sendGrant, setTradePolicy...
}

export const createDiplomacySlice: StateCreator<GameState, [], [], DiplomacySlice> = (set) => ({
  // initial state for diplomacy slice
});
