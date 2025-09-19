// Empty createIndustrySlice for Zustand store composition
export const createIndustrySlice = () => ({});
import { IndustryState } from "@/types/Industry";

export interface IndustrySlice {
  industry: IndustryState;
  // actions: buildFactory, allocateLabour, processProduction...
}
