import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { initWorld } from '../testing/worldInit';
import { initializeRailroadNetworks } from "@/systems/railroadSystem";
import { Nation } from "@/types/Nation";

export interface MapSlice {
  map: GameMap;
  setMap: (map: GameMap) => void;
}

export const createMapSlice: StateCreator<GameState, [], [], MapSlice> = (set) => {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });

  // Initialize railroad networks eagerly at game start
  const railroadNetworks = initializeRailroadNetworks(map, nations as Nation[]);

  // Set nations and railroad networks in the store so other slices can access them
  set({
    nations,
    transportNetwork: {
      shippingLanes: [],
      capacity: 0,
      railroadNetworks,
    }
  });

  return {
    map,
    setMap: (map: GameMap) => set({ map }),
  };
};