import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CitySlice {
  // actions: addCity, queueProduction, completeProduction, updateInfrastructure...
}

export const createCitySlice: StateCreator<GameState, [], [], CitySlice> = (set) => ({
  // initial state for city slice
});
