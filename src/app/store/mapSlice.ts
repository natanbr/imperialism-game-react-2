// Empty createMapSlice for Zustand store composition
import { GameMap } from "@/types/Map";
import { StateCreator } from 'zustand';

export interface MapSlice {
  map: GameMap;
  // actions: generateMap, revealTile, setOwnership...
}
