import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

export interface CitySlice {
  // actions: addCity, queueProduction, completeProduction, updateInfrastructure...
}

export const createCitySlice: StateCreator<GameState, [], [], CitySlice> = (set) => ({
  // initial state for city slice
});
