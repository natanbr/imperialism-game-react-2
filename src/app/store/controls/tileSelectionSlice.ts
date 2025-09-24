import { StateCreator } from "zustand";
import { TileId } from "../../types/Common";

export interface TileSelectionSlice {
  selectedTileId?: TileId;
  hoveredTileId?: TileId;
<<<<<<< HEAD
  selectTile: (tileId: TileId | undefined) => void;
  hoverTile: (tileId: TileId | undefined) => void;
=======
<<<<<<< HEAD
  selectTile: (tileId: TileId | undefined) => void;
  hoverTile: (tileId: TileId | undefined) => void;
=======
<<<<<<< HEAD
  selectTile: (tileId: TileId | undefined) => void;
  hoverTile: (tileId: TileId | undefined) => void;
=======
  selectedWorkerId?: string;
  selectTile: (tileId: TileId | undefined) => void;
  hoverTile: (tileId: TileId | undefined) => void;
  selectWorker: (workerId: string | undefined) => void;
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
}

export const createTileSelectionSlice: StateCreator<TileSelectionSlice, [], [], TileSelectionSlice> = (set) => ({
  selectedTileId: undefined,
  hoveredTileId: undefined,
<<<<<<< HEAD
  selectTile: (tileId) => set({ selectedTileId: tileId }),
  hoverTile: (tileId) => set({ hoveredTileId: tileId }),
=======
<<<<<<< HEAD
  selectTile: (tileId) => set({ selectedTileId: tileId }),
  hoverTile: (tileId) => set({ hoveredTileId: tileId }),
=======
<<<<<<< HEAD
  selectTile: (tileId) => set({ selectedTileId: tileId }),
  hoverTile: (tileId) => set({ hoveredTileId: tileId }),
=======
  selectedWorkerId: undefined,
  selectTile: (tileId) => set({ selectedTileId: tileId }),
  hoverTile: (tileId) => set({ hoveredTileId: tileId }),
  selectWorker: (workerId) => set({ selectedWorkerId: workerId }),
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
});