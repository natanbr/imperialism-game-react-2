// Game state slice for Zustand store composition
import { NewsItem } from "@/types/Common";
import { GameState } from "@/types/GameState";
import { StateCreator } from 'zustand';

export interface GameStateSlice {
  activeNationId: string;
  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
  newsLog: NewsItem[];
  nations: GameState['nations'];
  cities: GameState['cities'];
  armies: GameState['armies'];
  fleets: GameState['fleets'];
  relations: GameState['relations'];
  treaties: GameState['treaties'];
  tradePolicies: GameState['tradePolicies'];
  grants: GameState['grants'];
  tradeRoutes: GameState['tradeRoutes'];
  
  // Actions
  setActiveNation: (nationId: string) => void;
  addNews: (news: NewsItem) => void;
}

export const createGameStateSlice: StateCreator<GameStateSlice, [], [], GameStateSlice> = (set, get) => {
  // Get nations from the store (set by mapSlice)
  const currentState = get();
  const nations = currentState.nations || [];

  return {
    activeNationId: "nation-1",
    difficulty: "normal",
    newsLog: [],
    nations,
    cities: [],
    armies: [],
    fleets: [],
    relations: [],
    treaties: [],
    tradePolicies: [],
    grants: [],
    tradeRoutes: [],

    // Actions
    setActiveNation: (nationId: string) => set({ activeNationId: nationId }),
    addNews: (news: NewsItem) => set((state) => ({
      newsLog: [...state.newsLog, news]
    })),
  };
}