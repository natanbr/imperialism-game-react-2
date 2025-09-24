<<<<<<< HEAD
=======
<<<<<<< HEAD
// Empty createArmySlice for Zustand store composition
export const createArmySlice = () => ({});
import { Army } from "@/types/Army";
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
// Empty createArmySlice for Zustand store composition
export const createArmySlice = () => ({});
import { Army } from "@/types/Army";

export interface ArmySlice {
  armies: Army[];
  // actions: createArmy, moveArmy, mergeArmies, resolveBattle...
}
<<<<<<< HEAD
=======
=======
import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)

export interface ArmySlice {
  armies: Army[];
  // actions: createArmy, moveArmy, mergeArmies, resolveBattle...
}
<<<<<<< HEAD
=======

export const createArmySlice: StateCreator<GameState, [], [], ArmySlice> = (set) => ({
  // initial state for army slice
});
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
