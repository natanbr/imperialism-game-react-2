import { StateCreator } from 'zustand';

/**
 * The map's scroll position in pixels. MapView scrolls its container to it and writes back where
 * the browser put it, so it stays inside the map (FR-083).
 */
export interface CameraSlice {
  cameraX: number;
  cameraY: number;
  setCamera: (x: number, y: number) => void;
}

export const createCameraSlice: StateCreator<CameraSlice, [], [], CameraSlice> = (set) => ({
  cameraX: 0,
  cameraY: 0,
  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
});
