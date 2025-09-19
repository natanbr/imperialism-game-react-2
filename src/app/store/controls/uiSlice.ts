import { StateCreator } from 'zustand';

// store/uiSlice.ts
export interface UiSlice {
  cameraX: number;
  cameraY: number;
  setCamera: (x: number, y: number) => void;
  moveCamera: (dx: number, dy: number) => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  cameraX: 0,
  cameraY: 0,
  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
  moveCamera: (dx, dy) =>
    set((state) => ({
      cameraX: Math.min(Math.max(-100, state.cameraX + dx), window.innerWidth),
      cameraY: Math.min(Math.max(-100, state.cameraY + dy), window.innerHeight),
    })),
});