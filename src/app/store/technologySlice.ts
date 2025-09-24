import { StateCreator } from "zustand";
import { TechnologyState } from "@/types/Technology";

export interface TechnologySlice {
  technologyState: TechnologyState;
  setOilDrillingTech: (unlocked: boolean) => void;
}

export const createTechnologySlice: StateCreator<TechnologySlice> = (set) => ({
  technologyState: {
    oilDrillingTechUnlocked: false,
    technologies: [],
  },
  setOilDrillingTech: (unlocked: boolean) =>
    set((state) => ({
      technologyState: {
        ...state.technologyState,
        oilDrillingTechUnlocked: unlocked,
      },
    })),
});