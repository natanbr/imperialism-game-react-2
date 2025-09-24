<<<<<<< HEAD
// Empty createGameSlice for Zustand store composition
=======
<<<<<<< HEAD
// Empty createGameSlice for Zustand store composition
=======
<<<<<<< HEAD
// Empty createGameSlice for Zustand store composition
import { NewsItem } from "@/types/Common";
import { StateCreator } from 'zustand';

export interface GameSlice {
  turn: number;
  year: number;
  activeNationId: string;
  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
  newsLog: NewsItem[];
  // actions: advanceTurn, addNews, setActiveNation...
}
export const createGameSlice: StateCreator<GameSlice> = () => ({
  turn: 1,
  year: 1900,
  activeNationId: "",
  difficulty: "normal",
  newsLog: [],
});
=======
// Game state slice for Zustand store composition
import { initWorld } from "@/testing/worldInit";
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
import { NewsItem } from "@/types/Common";
import { StateCreator } from 'zustand';

export interface GameSlice {
  turn: number;
  year: number;
  activeNationId: string;
  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
  newsLog: NewsItem[];
  // actions: advanceTurn, addNews, setActiveNation...
}
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
export const createGameSlice: StateCreator<GameSlice> = () => ({
  turn: 1,
  year: 1900,
  activeNationId: "",
  difficulty: "normal",
  newsLog: [],
});
<<<<<<< HEAD
=======
=======

export const createGameStateSlice: StateCreator<GameStateSlice> = (set, get) => {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });

  return {
    turn: 1,
    year: 1900,
    activeNationId: "nation-1",
    difficulty: "normal",
    newsLog: [],
    map,
    nations,
    cities: [],
    armies: [],
    fleets: [],
    relations: [],
    treaties: [],
    tradePolicies: [],
    grants: [],
    transportNetwork: { railroads: [], shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    industry: {
      buildings: [],
      labour: { untrained: 0, trained: 0, expert: 0, availableThisTurn: 0 },
      power: 0,
    },
    technologyState: {
      oilDrillingTechUnlocked: false,
      technologies: [],
    },
    turnOrder: {
      phases: ["diplomacy", "trade", "production", "combat", "interceptions", "logistics"] as const,
    },

    // Actions
    setActiveNation: (nationId: string) => set({ activeNationId: nationId }),
    setOilDrillingTech: (unlocked: boolean) =>
      set((state) => ({
        technologyState: { ...state.technologyState, oilDrillingTechUnlocked: unlocked },
      })),
    advanceTurn: () => set((state) => {
      const nextTurn = state.turn + 1;
      const nextYear = state.year + (state.turn % 4 === 0 ? 1 : 0); // Advance year every 4 turns (seasons)

      // Orchestrate phases
      const newMap = runTurnPhases(state.map, state.turn, nextTurn);

      return {
        turn: nextTurn,
        year: nextYear,
        map: newMap,
      };
    }),
    addNews: (news: NewsItem) => set((state) => ({
      newsLog: [...state.newsLog, news]
    })),
    setNations: (nations: Nation[]) => set({ nations }),
    setMap: (map: GameMap) => set({ map }),

    moveSelectedWorkerToTile: (targetTileId: string, selectedWorkerId: string) => {
      set((state) => moveSelectedWorkerToTileHelper(state, targetTileId, selectedWorkerId));
    },

    startProspecting: (tileId: string, workerId: string) => {
      set((state) => startProspectingHelper(state, tileId, workerId));
    },

    startDevelopment: (tileId: string, workerId: string, workerType: WorkerType, targetLevel: 1 | 2 | 3) => {
      set((state) => startDevelopmentHelper(state, tileId, workerId, workerType, targetLevel));
    },

    startConstruction: (tileId: string, workerId: string, kind: "depot" | "port" | "fort" | "rail") => {
      set((state) => startConstructionHelper(state, tileId, workerId, kind));
    },
  };

}
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
