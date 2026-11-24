import { StateCreator } from 'zustand';

/**
 * The map's scroll position in pixels. MapView scrolls its container to it and writes back where
 * the browser put it, so it stays inside the map (FR-083). The zoom step the map is drawn at (FR-368).
 */
export interface CameraSlice {
  cameraX: number;
  cameraY: number;
  /** Counts `moveCamera` calls, so MapView scrolls even when the camera value did not change (FR-092). */
  cameraMoves: number;
  /** The map's zoom, 1 (100%) to 2 (components/camera.ts): a step (FR-368), the opening fit, the wheel or a pinch (FR-567). */
  zoom: number;
  /** Mirrors where the browser scrolled the map; does not scroll it. */
  setCamera: (x: number, y: number) => void;
  /** Scrolls the map there, even if the stored camera already says so: it can lag the real scroll (FR-092). */
  moveCamera: (x: number, y: number) => void;
  /** Draws the map at this zoom and scrolls it to the camera given for that zoom, in one step (FR-368). */
  zoomTo: (zoom: number, camera: { x: number; y: number }) => void;
}

export const createCameraSlice: StateCreator<CameraSlice, [], [], CameraSlice> = (set) => ({
  cameraX: 0,
  cameraY: 0,
  cameraMoves: 0,
  zoom: 1,
  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
  moveCamera: (x, y) => set((s) => ({ cameraX: x, cameraY: y, cameraMoves: s.cameraMoves + 1 })),
  zoomTo: (zoom, camera) => set((s) => ({ zoom, cameraX: camera.x, cameraY: camera.y, cameraMoves: s.cameraMoves + 1 })),
});
