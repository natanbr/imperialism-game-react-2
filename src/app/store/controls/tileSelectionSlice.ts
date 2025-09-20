import { StateCreator } from "zustand";
import { TileId } from "../../types/Common";

export interface TileSelectionSlice {
  selectedTileId?: TileId;
  hoveredTileId?: TileId;
  selectedWorkerId?: string;
  selectTile: (tileId: TileId | undefined) => void;
  hoverTile: (tileId: TileId | undefined) => void;
  selectWorker: (workerId: string | undefined) => void;
}

export const createTileSelectionSlice: StateCreator<TileSelectionSlice, [], [], TileSelectionSlice> = (set) => ({
  selectedTileId: undefined,
  hoveredTileId: undefined,
  selectedWorkerId: undefined,
  selectTile: (tileId) => set({ selectedTileId: tileId }),
  hoverTile: (tileId) => set({ hoveredTileId: tileId }),
  selectWorker: (workerId) => set({ selectedWorkerId: workerId }),
});