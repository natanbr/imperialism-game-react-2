// Empty createArmySlice for Zustand store composition
export const createArmySlice = () => ({});
import { Army } from "@/types/Army";

export interface ArmySlice {
  armies: Army[];
  // actions: createArmy, moveArmy, mergeArmies, resolveBattle...
}
