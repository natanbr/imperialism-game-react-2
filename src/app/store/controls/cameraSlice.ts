import { StateCreator } from 'zustand';

/**
 * The map's scroll position in pixels. MapView scrolls its container to it and writes back where
 * the browser put it, so it stays inside the map (FR-083).
 */
export interface CameraSlice {
  cameraX: number;
  cameraY: number;
  /** Counts `moveCamera` calls, so MapView scrolls even when the camera value did not change (FR-092). */
  cameraMoves: number;
  /** Mirrors where the browser scrolled the map; does not scroll it. */
  setCamera: (x: number, y: number) => void;
  /** Scrolls the map there, even if the stored camera already says so: it can lag the real scroll (FR-092). */
  moveCamera: (x: number, y: number) => void;
}

export const createCameraSlice: StateCreator<CameraSlice, [], [], CameraSlice> = (set) => ({
  cameraX: 0,
  cameraY: 0,
  cameraMoves: 0,
  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
  moveCamera: (x, y) => set((s) => ({ cameraX: x, cameraY: y, cameraMoves: s.cameraMoves + 1 })),
});
