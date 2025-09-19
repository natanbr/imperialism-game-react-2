// Empty createNavySlice for Zustand store composition
export const createNavySlice = () => ({});
import { Fleet } from "@/types/Navy";

export interface NavySlice {
  fleets: Fleet[];
  // actions: createFleet, moveFleet, blockadePort, resolveNavalBattle...
}
