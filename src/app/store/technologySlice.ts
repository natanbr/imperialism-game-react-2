// Empty createTechnologySlice for Zustand store composition
export const createTechnologySlice = () => ({});
import { Technology } from "@/types/Technology";

export interface TechnologySlice {
  technologies: Technology[];
  // actions: purchaseTech, unlockTech, applyTechBenefits...
}
