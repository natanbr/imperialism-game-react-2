import { create } from 'zustand';
import { createMapSlice, MapSlice } from './mapSlice';
import { createNationSlice, NationSlice } from './nationSlice';
import { createPlayerSlice, PlayerSlice } from './playerSlice';
import { createTurnSlice, TurnSlice } from './turnSlice';
import { createWorkerSlice, WorkerSlice } from './workerSlice';
import { createTransportSlice, TransportSlice } from './transportSlice';
import { createTechnologySlice, TechnologySlice } from './technologySlice';
import { createTileSelectionSlice, TileSelectionSlice } from './controls/tileSelectionSlice';
import { createUiSlice, UiSlice } from './controls/uiSlice';

export type GameStore =
  & MapSlice
  & NationSlice
  & PlayerSlice
  & TurnSlice
  & WorkerSlice
  & TransportSlice
  & TechnologySlice
  & TileSelectionSlice
  & UiSlice;

export const useGameStore = create<GameStore>()((...a) => ({
  ...createMapSlice(...a),
  ...createNationSlice(...a),
  ...createPlayerSlice(...a),
  ...createTurnSlice(...a),
  ...createWorkerSlice(...a),
  ...createTransportSlice(...a),
  ...createTechnologySlice(...a),
  ...createUiSlice(...a),
  ...createTileSelectionSlice(...a),
}));
