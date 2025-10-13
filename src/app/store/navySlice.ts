import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NavySlice {
  // actions: createFleet, moveFleet, blockadePort, resolveNavalBattle...
}

export const createNavySlice: StateCreator<GameState, [], [], NavySlice> = (set) => ({
  // initial state for navy slice
});
