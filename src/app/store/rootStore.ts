import { create } from 'zustand';
import { createTileSelectionSlice, TileSelectionSlice } from './controls/tileSelectionSlice';
import { createGameStateSlice, GameStateSlice } from './gameSlice';
import { createCameraSlice, CameraSlice } from './controls/cameraSlice';
import { createOverlaySlice, OverlaySlice } from './controls/overlaySlice';
import { createNationSlice, NationSlice } from './nationSlice';
import { createWorkerActionsSlice, WorkerActionsSlice } from './workerActionsSlice';
import { createTurnSlice, TurnSlice } from './turnSlice';
import { createMapSlice, MapSlice } from './mapSlice';
import { createTechnologySlice, TechnologySlice } from './technologySlice';
import { createTransportSlice, TransportSlice } from './transportSlice';

export type GameStore =
  & GameStateSlice
  & NationSlice
  & WorkerActionsSlice
  & TurnSlice
  & MapSlice
  & TechnologySlice
  & TransportSlice
  // & CitySlice
  // & ArmySlice
  // & NavySlice
  // & DiplomacySlice
  // & TradeSlice
  // & IndustrySlice
  & TileSelectionSlice
  & CameraSlice
  & OverlaySlice;

export const useGameStore = create<GameStore>()((...a) => ({
  ...createMapSlice(...a), // Initialize map and nations first
  ...createGameStateSlice(...a),
  ...createNationSlice(...a),
  ...createWorkerActionsSlice(...a),
  ...createTurnSlice(...a),
  ...createTechnologySlice(...a),
  ...createTransportSlice(...a),
  // ...createCitySlice(...a),
  // ...createArmySlice(...a),
  // ...createNavySlice(...a),
  // ...createDiplomacySlice(...a),
  // ...createTradeSlice(...a),
  // ...createIndustrySlice(...a),
  ...createCameraSlice(...a),
  ...createOverlaySlice(...a),
  ...createTileSelectionSlice(...a),
}));
