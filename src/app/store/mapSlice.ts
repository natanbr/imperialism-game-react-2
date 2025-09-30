import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { initWorld } from '../testing/worldInit';

export interface MapSlice {
  map: GameMap;
  setMap: (map: GameMap) => void;
}

export const createMapSlice: StateCreator<GameState, [], [], MapSlice> = (set) => {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  
  // Set nations in the store so other slices can access them
  set({ nations });
  
  return {
    map,
    setMap: (map: GameMap) => set({ map }),
  };
};
