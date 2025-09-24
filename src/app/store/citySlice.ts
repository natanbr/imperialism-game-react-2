<<<<<<< HEAD
=======
<<<<<<< HEAD
// Empty createCitySlice for Zustand store composition
export const createCitySlice = () => ({});
import { City } from "@/types/City";
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
// Empty createCitySlice for Zustand store composition
export const createCitySlice = () => ({});
import { City } from "@/types/City";

export interface CitySlice {
  cities: City[];
  // actions: addCity, queueProduction, completeProduction, updateInfrastructure...
}
<<<<<<< HEAD
=======
=======
import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)

export interface CitySlice {
  cities: City[];
  // actions: addCity, queueProduction, completeProduction, updateInfrastructure...
}
<<<<<<< HEAD
=======

export const createCitySlice: StateCreator<GameState, [], [], CitySlice> = (set) => ({
  // initial state for city slice
});
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
