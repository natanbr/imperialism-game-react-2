import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

export interface MapSlice {
  // actions: generateMap, revealTile, setOwnership...
}

export const createMapSlice: StateCreator<GameState, [], [], MapSlice> = (set) => ({
  // initial state for map slice
});
