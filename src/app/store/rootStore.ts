import { create } from 'zustand';
import { GameState } from '../types/GameState';
import { GameMap } from '../types/Map';
import { Nation } from '../types/Nation';
import { createTileSelectionSlice, TileSelectionSlice } from './controls/tileSelectionSlice';

export interface NationSlice {
  nations: Nation[];
}

export interface MapSlice {
  map: GameMap;
}

export type GameStore = GameState & TileSelectionSlice & {
  init: (initialState: Partial<GameState>) => void;
};

export const useGameStore = create<GameStore>((set, get, api) => ({
  // Default initial state
  turn: 1,
  year: 1900,
  activeNationId: '',
  nations: [],
  cities: [],
  armies: [],
  fleets: [],
  map: { config: { cols: 0, rows: 0, style: 'SquareGrid' as const }, tiles: [] },
  transportNetwork: { nodes: [], edges: [] },
  tradeRoutes: [],
  industry: { factories: [], production: [] },
  technologies: [],
  newsLog: [],
  turnOrder: {
    phases: [
      "diplomacy",
      "trade",
      "production",
      "combat",
      "interceptions",
      "logistics"
    ],
  },
  difficulty: 'normal',

  init: (initialState: Partial<GameState>) => set(initialState),
  ...createTileSelectionSlice(set, get, api),
}));
