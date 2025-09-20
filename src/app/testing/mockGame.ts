import { GameState } from '../types/GameState';
import { mockMap } from './mockMap';
import { mockNation } from './mockNation';

export const mockGame: GameState = {
  turn: 1,
  year: 1900,
  activeNationId: 'red-empire',
  nations: [mockNation],
  cities: [],
  armies: [],
  fleets: [],
  map: mockMap,
  transportNetwork: {
    nodes: [],
    edges: [],
  },
  tradeRoutes: [],
  industry: {
    factories: [],
    production: [],
  },
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
};
