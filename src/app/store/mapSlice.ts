import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { initWorld } from "@/testing/worldInit";
import { Worker } from "@/types/Workers";

export interface MapSlice {
  map: GameMap;
  setMap: (map: GameMap) => void;
  getAllWorkers: () => Worker[];
  getWorkerById: (workerId: string) => Worker | null;
}

export const createMapSlice: StateCreator<GameState, [], [], MapSlice> = (set, get) => {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  
  // Set nations in the store so other slices can access them
  set({ nations });
  
  return {
    map,
    setMap: (map: GameMap) => set({ map }),
    getAllWorkers: () => {
      const { map } = get();
      return map.tiles.flatMap(row => row.flatMap(tile => tile.workers));
    },
    getWorkerById: (workerId: string) => {
      const workers = get().getAllWorkers();
      return workers.find(w => w.id === workerId) || null;
    },
  };
};
