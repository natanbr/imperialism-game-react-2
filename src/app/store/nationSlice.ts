import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

export interface NationSlice {
  // actions: addNation, updateTreasury, manageWarehouse, adjustMerchantMarine...
}

export const createNationSlice: StateCreator<GameState, [], [], NationSlice> = (set) => ({
  // initial state for nation slice
});
