import { create } from 'zustand';
<<<<<<< HEAD
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
=======
<<<<<<< HEAD
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
=======
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
=======
import { createMapSlice, MapSlice } from './mapSlice';
import { createNationSlice, NationSlice } from './nationSlice';
import { createPlayerSlice, PlayerSlice } from './playerSlice';
import { createTurnSlice, TurnSlice } from './turnSlice';
import { createWorkerSlice, WorkerSlice } from './workerSlice';
import { createTransportSlice, TransportSlice } from './transportSlice';
import { createTechnologySlice, TechnologySlice } from './technologySlice';
>>>>>>> b7a3834 (Apply patch /tmp/46f53035-1478-4341-ab41-5f71f2cb01d9.patch)
import { createTileSelectionSlice, TileSelectionSlice } from './controls/tileSelectionSlice';
import { createUiSlice, UiSlice } from './controls/uiSlice';

export type GameStore =
  & MapSlice
  & NationSlice
  & PlayerSlice
  & TurnSlice
  & WorkerSlice
  & TransportSlice
  & TechnologySlice
  & TileSelectionSlice
  & UiSlice;

export const useGameStore = create<GameStore>()((...a) => ({
  ...createMapSlice(...a),
  ...createNationSlice(...a),
  ...createPlayerSlice(...a),
  ...createTurnSlice(...a),
  ...createWorkerSlice(...a),
  ...createTransportSlice(...a),
  ...createTechnologySlice(...a),
  ...createUiSlice(...a),
  ...createTileSelectionSlice(...a),
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
}));
