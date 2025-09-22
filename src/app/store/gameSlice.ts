// Game state slice for Zustand store composition
import { NewsItem } from "@/types/Common";
import { Nation } from "@/types/Nation";
import { GameMap } from "@/types/Map";
import { StateCreator } from 'zustand';
import { initWorld } from "@/testing/worldInit";
import { WorkerType, Worker } from "@/types/Workers";
import { TerrainType } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { runTurnPhases } from "./phases";
import { WorkerLevelDurationsTurns, EngineerBuildDurationsTurns } from "@/definisions/workerDurations";
import {
  PROSPECTABLE_TERRAIN_TYPES,
  FARMING_TERRAINS,
  RANCHING_TERRAINS,
  FORESTRY_TERRAINS,
  MINING_TERRAINS,
  DRILLING_TERRAINS,
} from "../definisions/terrainDefinitions";
import { MINERAL_RESOURCES } from "../definisions/resourceDefinitions";
import { GameState } from "@/types/GameState";
import {
  moveSelectedWorkerToTileHelper,
  startProspectingHelper,
  startDevelopmentHelper,
  startConstructionHelper,
} from "./helpers/workerHelpers";

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
    transportNetwork: { routes: [] },
    tradeRoutes: [],
    industry: { factories: [] },
    technologyState: {
      oilDrillingTechUnlocked: false,
      technologies: [],
    },
    turnOrder: {
      phases: ["diplomacy", "trade", "production", "combat", "interceptions", "logistics"],
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
});
