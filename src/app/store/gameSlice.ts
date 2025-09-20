// Game state slice for Zustand store composition
import { NewsItem } from "@/types/Common";
import { Nation } from "@/types/Nation";
import { GameMap } from "@/types/Map";
import { StateCreator } from 'zustand';
import { mockNations, mockMap5x5 } from "@/testing/mockNation";
import { WorkerType, Worker } from "@/types/Workers";
import { TerrainType } from "@/types/Tile";

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
  moveSelectedWorkerToTile: (targetTileId: string) => void;
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

  // Movement: allow movement to any owned land tile of same nation
  moveSelectedWorkerToTile: (targetTileId: string) => {
    const state = get() as any; // access other slices (selectedWorkerId)
    const selectedWorkerId: string | undefined = state.selectedWorkerId;
    if (!selectedWorkerId) return;

    const map = state.map as GameMap;

    // Find current tile containing the worker
    let fromX = -1, fromY = -1, worker: Worker | undefined;
    outer: for (let y = 0; y < map.config.rows; y++) {
      for (let x = 0; x < map.config.cols; x++) {
        const t = map.tiles[y][x];
        const w = t.workers.find((w: Worker) => w.id === selectedWorkerId);
        if (w) { fromX = x; fromY = y; worker = w; break outer; }
      }
    }
    if (!worker) return;

    // Locate target tile
    const [tx, ty] = targetTileId.split('-').map(Number);
    if (Number.isNaN(tx) || Number.isNaN(ty)) return;

    const target = map.tiles[ty]?.[tx];
    if (!target) return;

    // Must be land (not water/river) and owned by same nation
    const isLand = target.terrain !== TerrainType.Water && target.terrain !== TerrainType.River;
    const sameNation = target.ownerNationId === worker.nationId;
    if (!isLand || !sameNation) return;

    // Update tiles immutably
    const newTiles = map.tiles.map((row, y) => row.map((t, x) => {
      if (x === fromX && y === fromY) {
        return { ...t, workers: t.workers.filter((w) => w.id !== selectedWorkerId) };
      }
      if (x === tx && y === ty) {
        return { ...t, workers: [...t.workers, { ...worker!, assignedTileId: `${tx}-${ty}` }] };
      }
      return t;
    }));

    set({ map: { ...map, tiles: newTiles } });
  },
});
