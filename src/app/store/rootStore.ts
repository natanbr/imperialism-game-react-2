import { create } from 'zustand';
import { createTileSelectionSlice, TileSelectionSlice } from './controls/tileSelectionSlice';
import { createUiSlice, UiSlice } from './controls/uiSlice';
import { createGameStateSlice, GameStateSlice } from './gameSlice';

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
  & UiSlice;

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
  ...createUiSlice(...a),
  ...createTileSelectionSlice(...a),
}));
