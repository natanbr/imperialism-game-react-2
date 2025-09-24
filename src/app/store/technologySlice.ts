import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
import { TechnologyState } from "@/types/Technology";

export interface TechnologySlice {
  technologyState: TechnologyState;
  setOilDrillingTech: (unlocked: boolean) => void;
}

export const createTechnologySlice: StateCreator<GameState, [], [], TechnologySlice> = (set) => ({
  technologyState: {
    oilDrillingTechUnlocked: false,
    technologies: [],
  },
  setOilDrillingTech: (unlocked: boolean) =>
    set((state) => ({
      technologyState: { ...state.technologyState, oilDrillingTechUnlocked: unlocked },
    })),
});
