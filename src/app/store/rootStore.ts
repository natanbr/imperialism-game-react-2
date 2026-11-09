import { create } from 'zustand';
import { createGameSlice, GameSlice, GameSliceOptions } from './gameSlice';
import { createTileSelectionSlice, TileSelectionSlice } from './controls/tileSelectionSlice';
import { createCameraSlice, CameraSlice } from './controls/cameraSlice';
import { createOverlaySlice, OverlaySlice } from './controls/overlaySlice';
import { ControlsSlice, createControlsSlice } from './controls/controlsSlice';

export { EVENT_LOG_TURNS, randomSeed, type OrderLogEntry, type OrderRejection, type TurnReport } from './gameSlice';

/** One engine GameState (`game`) plus UI state: session, selection, camera, overlays, dialogs. */
export type GameStore =
  & GameSlice
  & TileSelectionSlice
  & CameraSlice
  & OverlaySlice
  & ControlsSlice;

export type GameStoreOptions = GameSliceOptions;

/** A new store; the app has one (`useGameStore`), tests make their own. */
export function createGameStore(options: GameStoreOptions = {}) {
  return create<GameStore>()((...a) => ({
    ...createGameSlice(options)(...a),
    ...createCameraSlice(...a),
    ...createOverlaySlice(...a),
    ...createTileSelectionSlice(...a),
    ...createControlsSlice(...a),
  }));
}

/** The app's store: a new game with a random seed. */
export const useGameStore = createGameStore();
