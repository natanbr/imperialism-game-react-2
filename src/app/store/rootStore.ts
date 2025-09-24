import { create } from 'zustand';
import { createTileSelectionSlice, TileSelectionSlice } from './controls/tileSelectionSlice';
import { createGameStateSlice, GameStateSlice } from './gameSlice';
import { createCameraSlice, CameraSlice } from './controls/cameraSlice';
import { createOverlaySlice, OverlaySlice } from './controls/overlaySlice';
import { createNationSlice, NationSlice } from './nationSlice';
import { createWorkerActionsSlice, WorkerActionsSlice } from './workerActionsSlice';

export type GameStore =
  & GameStateSlice
  & NationSlice
  & WorkerActionsSlice
  // & CitySlice
  // & ArmySlice
  // & NavySlice
  // & DiplomacySlice
  // & TradeSlice
  // & TransportSlice
  // & IndustrySlice
  // & TechnologySlice
  & TileSelectionSlice
  & CameraSlice
  & OverlaySlice;

export const useGameStore = create<GameStore>()((...a) => ({
  ...createGameStateSlice(...a),
  ...createNationSlice(...a),
  ...createWorkerActionsSlice(...a),
  // ...createCitySlice(...a),
  // ...createArmySlice(...a),
  // ...createNavySlice(...a),
  // ...createDiplomacySlice(...a),
  // ...createTradeSlice(...a),
  // ...createTransportSlice(...a),
  // ...createIndustrySlice(...a),
  // ...createTechnologySlice(...a),
  ...createCameraSlice(...a),
  ...createOverlaySlice(...a),
  ...createTileSelectionSlice(...a),
}));
