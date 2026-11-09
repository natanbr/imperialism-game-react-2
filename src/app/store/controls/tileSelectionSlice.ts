import { StateCreator } from "zustand";
import { TileId } from "../../types/Common";
import type { GameStore } from "../rootStore";
import { isPlayersWorker } from "./playersWorker";

export interface TileSelectionSlice {
  selectedTileId?: TileId;
  hoveredTileId?: TileId;
  selectedWorkerId?: string;
  selectTile: (tileId: TileId | undefined) => void;
  hoverTile: (tileId: TileId | undefined) => void;
  /** Selects one of the player's civilians, or none; another nation's worker is ignored (FR-108). */
  selectWorker: (workerId: string | undefined) => void;
}

export const createTileSelectionSlice: StateCreator<GameStore, [], [], TileSelectionSlice> = (set) => ({
  selectedTileId: undefined,
  hoveredTileId: undefined,
  selectedWorkerId: undefined,
  selectTile: (tileId) => set({ selectedTileId: tileId }),
  hoverTile: (tileId) => set({ hoveredTileId: tileId }),
  selectWorker: (workerId) =>
    set((s) => (workerId === undefined || isPlayersWorker(s, workerId) ? { selectedWorkerId: workerId } : {})),
});
