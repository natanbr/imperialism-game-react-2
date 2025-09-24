<<<<<<< HEAD
=======
<<<<<<< HEAD
// Empty createIndustrySlice for Zustand store composition
export const createIndustrySlice = () => ({});
import { IndustryState } from "@/types/Industry";
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
// Empty createIndustrySlice for Zustand store composition
export const createIndustrySlice = () => ({});
import { IndustryState } from "@/types/Industry";

export interface IndustrySlice {
  industry: IndustryState;
  // actions: buildFactory, allocateLabour, processProduction...
}
<<<<<<< HEAD
=======
=======
import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)

export interface IndustrySlice {
  industry: IndustryState;
  // actions: buildFactory, allocateLabour, processProduction...
}
<<<<<<< HEAD
=======

export const createIndustrySlice: StateCreator<GameState, [], [], IndustrySlice> = (set) => ({
  // initial state for industry slice
});
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
