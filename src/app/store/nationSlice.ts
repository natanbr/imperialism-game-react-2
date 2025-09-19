// Empty createNationSlice for Zustand store composition
export const createNationSlice = () => ({});
import { Nation } from "@/types/Nation";

export interface NationSlice {
  nations: Nation[];
  // actions: addNation, updateTreasury, manageWarehouse, adjustMerchantMarine...
}
