import { StateCreator } from "zustand";
import { GameStore } from "./types";
import { City } from "@/types/City";

export interface CitySlice {
  cities: City[];
  addCity: (city: City) => void;
}

export const createCitySlice: StateCreator<
  GameStore,
  [],
  [],
  CitySlice
> = (set) => ({
  cities: [],
  addCity: (city) => set((state) => ({ cities: [...state.cities, city] })),
});
