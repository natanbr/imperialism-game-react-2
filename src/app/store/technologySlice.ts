<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
// Empty createTechnologySlice for Zustand store composition
export const createTechnologySlice = () => ({});
import { Technology } from "@/types/Technology";

export interface TechnologySlice {
  technologies: Technology[];
  // actions: purchaseTech, unlockTech, applyTechBenefits...
}
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
=======
import { StateCreator } from "zustand";

export interface TechnologyState {
  oilDrillingTechUnlocked: boolean;
  technologies: any[]; // Replace 'any' with a proper type later
}

export interface TechnologySlice {
  technologyState: TechnologyState;
  setOilDrillingTech: (unlocked: boolean) => void;
}

export const createTechnologySlice: StateCreator<TechnologySlice> = (set) => ({
  technologyState: {
    oilDrillingTechUnlocked: false,
    technologies: [],
  },
  setOilDrillingTech: (unlocked) =>
    set((state) => ({
      technologyState: { ...state.technologyState, oilDrillingTechUnlocked: unlocked },
    })),
});
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
