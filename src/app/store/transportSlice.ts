import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

export interface TransportSlice {
  // actions: buildRail, buildDepot, allocateTransportCapacity...
}

export const createTransportSlice: StateCreator<GameState, [], [], TransportSlice> = (set) => ({
  // initial state for transport slice
});
