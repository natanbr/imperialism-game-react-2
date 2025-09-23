import { StateCreator } from 'zustand';

// store/cameraSlice.ts
export interface CameraSlice {
  cameraX: number;
  cameraY: number;
  setCamera: (x: number, y: number) => void;
  moveCamera: (dx: number, dy: number) => void;
}

export const createCameraSlice: StateCreator<CameraSlice, [], [], CameraSlice> = (set) => ({
  cameraX: 0,
  cameraY: 0,
  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
  // Avoid referencing window during SSR; keep simple deltas
  moveCamera: (dx, dy) =>
    set((state) => ({
      cameraX: state.cameraX + dx,
      cameraY: state.cameraY + dy,
    })),
});