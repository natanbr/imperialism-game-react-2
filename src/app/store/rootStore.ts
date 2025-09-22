import { create } from 'zustand';
import { createTileSelectionSlice, TileSelectionSlice } from './controls/tileSelectionSlice';
import { createGameStateSlice, GameStateSlice } from './gameSlice';
import { createCameraSlice, CameraSlice } from './controls/cameraSlice';
import { createOverlaySlice, OverlaySlice } from './controls/overlaySlice';

export type GameStore =
  & GameStateSlice
  // & CitySlice
  // & ArmySlice
  // & NavySlice
  // & DiplomacySlice
  // & NationSlice
  // & TradeSlice
  // & TransportSlice
  // & IndustrySlice
  // & TechnologySlice
  & TileSelectionSlice
  & CameraSlice
  & OverlaySlice;

export const useGameStore = create<GameStore>()((...a) => ({
  ...createGameStateSlice(...a),
  // ...createCitySlice(...a),
  // ...createArmySlice(...a),
  // ...createNavySlice(...a),
  // ...createDiplomacySlice(...a),
  // ...createNationSlice(...a),
  // ...createTradeSlice(...a),
  // ...createTransportSlice(...a),
  // ...createIndustrySlice(...a),
  // ...createTechnologySlice(...a),
  ...createCameraSlice(...a),
  ...createOverlaySlice(...a),
  ...createTileSelectionSlice(...a),
}));
