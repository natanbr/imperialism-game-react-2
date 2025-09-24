import { StateCreator } from "zustand";
import { GameStore } from "./rootStore";

export interface TechnologyState {
  oilDrillingTechUnlocked: boolean;
  technologies: any[]; // Replace 'any' with a proper type later
}

export interface TechnologySlice {
  technologyState: TechnologyState;
  setOilDrillingTech: (unlocked: boolean) => void;
}

export const createTechnologySlice: StateCreator<GameStore, [], [], TechnologySlice> = (set) => ({
  technologyState: {
    oilDrillingTechUnlocked: false,
    technologies: [],
  },
  setOilDrillingTech: (unlocked) =>
    set((state) => ({
      technologyState: { ...state.technologyState, oilDrillingTechUnlocked: unlocked },
    })),
});