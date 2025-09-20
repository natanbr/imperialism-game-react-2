// Game state slice for Zustand store composition
import { NewsItem } from "@/types/Common";
import { Nation } from "@/types/Nation";
import { GameMap } from "@/types/Map";
import { StateCreator } from 'zustand';
import { mockNations, mockMap5x5 } from "@/testing/mockNation";

export interface GameStateSlice {
  turn: number;
  year: number;
  activeNationId: string;
  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
  newsLog: NewsItem[];
  nations: Nation[];
  map: GameMap;
  
  // Actions
  setActiveNation: (nationId: string) => void;
  advanceTurn: () => void;
  addNews: (news: NewsItem) => void;
  setNations: (nations: Nation[]) => void;
  setMap: (map: GameMap) => void;
}

export const createGameStateSlice: StateCreator<GameStateSlice> = (set, get) => ({
  turn: 1,
  year: 1900,
  activeNationId: "nation-1",
  difficulty: "normal",
  newsLog: [],
  nations: mockNations,
  map: mockMap5x5,
  
  // Actions
  setActiveNation: (nationId: string) => set({ activeNationId: nationId }),
  advanceTurn: () => set((state) => ({ 
    turn: state.turn + 1,
    year: state.year + (state.turn % 4 === 0 ? 1 : 0) // Advance year every 4 turns (seasons)
  })),
  addNews: (news: NewsItem) => set((state) => ({ 
    newsLog: [...state.newsLog, news] 
  })),
  setNations: (nations: Nation[]) => set({ nations }),
  setMap: (map: GameMap) => set({ map }),
});
