import { GameMap } from "@/types/Map";
import { StateCreator } from "zustand";
import { GameStore } from "./rootStore";

export interface MapSlice {
  map: GameMap;
  setMap: (map: GameMap) => void;
}

export const createMapSlice: StateCreator<GameStore, [], [], MapSlice> = (set) => ({
  map: {
    config: {
      cols: 0,
      rows: 0,
    },
    tiles: [],
  },
  setMap: (map) => set({ map }),
});