import { StateCreator } from "zustand";
import { GameStore } from "./types";
import { Army } from "@/types/Army";

export interface ArmySlice {
  armies: Army[];
  createArmy: (army: Army) => void;
  moveArmy: (armyId: string, toTileId: string) => void;
}

export const createArmySlice: StateCreator<
  GameStore,
  [],
  [],
  ArmySlice
> = (set) => ({
  armies: [],
  createArmy: (army) => set((state) => ({ armies: [...state.armies, army] })),
  moveArmy: (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _armyId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _toTileId
  ) => {
    // TODO: Implement moveArmy
  },
});
