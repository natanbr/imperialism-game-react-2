// Game state slice for Zustand store composition
import { initWorld } from "@/testing/worldInit";
import { NewsItem } from "@/types/Common";
import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { Nation } from "@/types/Nation";
import { WorkerType } from "@/types/Workers";
import { StateCreator } from 'zustand';
import {
  moveSelectedWorkerToTileHelper,
  startConstructionHelper,
  startDevelopmentHelper,
  startProspectingHelper,
} from "./helpers/workerHelpers";
import { runTurnPhases } from "./phases";

export interface GameStateSlice extends GameState {
  // Actions
  setActiveNation: (nationId: string) => void;
  advanceTurn: () => void;
  addNews: (news: NewsItem) => void;
  setNations: (nations: Nation[]) => void;
  setMap: (map: GameMap) => void;
  moveSelectedWorkerToTile: (targetTileId: string, selectedWorkerId: string) => void;
  startProspecting: (tileId: string, workerId: string) => void;
  startDevelopment: (tileId: string, workerId: string, workerType: WorkerType, targetLevel: 1 | 2 | 3) => void;
  startConstruction: (tileId: string, workerId: string, kind: "depot" | "port" | "fort" | "rail") => void;
  setOilDrillingTech: (unlocked: boolean) => void;
}

export const createGameStateSlice: StateCreator<GameStateSlice, [], [], GameStateSlice> = (set, get, _store) => {
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

      // Run all phases and get a new game state (map + nations updated via logistics)
      const phasedState = runTurnPhases(state, nextTurn);

      return {
        ...phasedState,
        turn: nextTurn,
        year: nextYear,
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