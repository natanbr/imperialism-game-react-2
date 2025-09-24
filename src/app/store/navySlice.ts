<<<<<<< HEAD
=======
<<<<<<< HEAD
// Empty createNavySlice for Zustand store composition
export const createNavySlice = () => ({});
import { Fleet } from "@/types/Navy";
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
// Empty createNavySlice for Zustand store composition
export const createNavySlice = () => ({});
import { Fleet } from "@/types/Navy";

export interface NavySlice {
  fleets: Fleet[];
  // actions: createFleet, moveFleet, blockadePort, resolveNavalBattle...
}
<<<<<<< HEAD
=======
=======
import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)

export interface NavySlice {
  fleets: Fleet[];
  // actions: createFleet, moveFleet, blockadePort, resolveNavalBattle...
}
<<<<<<< HEAD
=======

export const createNavySlice: StateCreator<GameState, [], [], NavySlice> = (set) => ({
  // initial state for navy slice
});
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
