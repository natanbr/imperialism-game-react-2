import { GameMap } from "@/types/Map";
import { StateCreator } from "zustand";
import { GameStore } from "./types";
import { initWorld } from "@/testing/worldInit";

export interface MapSlice {
  map: GameMap;
  setMap: (map: GameMap) => void;
}

export const createMapSlice: StateCreator<GameStore, [], [], MapSlice> = (
  set
) => {
  const { map } = initWorld({ cols: 5, rows: 5 });

  return {
    map,
    setMap: (map: GameMap) => set({ map }),
  };
};