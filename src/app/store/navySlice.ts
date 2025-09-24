import { StateCreator } from "zustand";
import { GameStore } from "./types";
import { Fleet } from "@/types/Navy";

export interface NavySlice {
  fleets: Fleet[];
  createFleet: (fleet: Fleet) => void;
  moveFleet: (fleetId: string, toTileId: string) => void;
}

export const createNavySlice: StateCreator<
  GameStore,
  [],
  [],
  NavySlice
> = (set) => ({
  fleets: [],
  createFleet: (fleet) => set((state) => ({ fleets: [...state.fleets, fleet] })),
  moveFleet: (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _fleetId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _toTileId
  ) => {
    // TODO: Implement moveFleet
  },
});
