import { StateCreator } from "zustand";
import { GameStore } from "./types";
import { IndustryState } from "@/types/Industry";

export interface IndustrySlice {
  industry: IndustryState;
}

export const createIndustrySlice: StateCreator<
  GameStore,
  [],
  [],
  IndustrySlice
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
> = (_set) => ({
  industry: {
    buildings: [],
    labour: { untrained: 0, trained: 0, expert: 0, availableThisTurn: 0 },
    power: 0,
  },
});
