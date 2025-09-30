import { StateCreator } from 'zustand';
import { GameState } from '@/types/GameState';
import { GameStore } from '../rootStore';

export interface ControlsSlice {
  selectedWorkerId: string | undefined;
  setSelectedWorkerId: (workerId: string | undefined) => void;
  isConstructionModalOpen: boolean;
  constructionModalTileId: string | null;
  constructionModalWorkerId: string | null;
  openConstructionModal: (tileId: string, workerId: string) => void;
  closeConstructionModal: () => void;
}

export const createControlsSlice: StateCreator<GameStore, [], [], ControlsSlice> = (set) => ({
  selectedWorkerId: undefined,
  setSelectedWorkerId: (workerId) => set({ selectedWorkerId: workerId }),
  isConstructionModalOpen: false,
  constructionModalTileId: null,
  constructionModalWorkerId: null,
  openConstructionModal: (tileId, workerId) => set({
    isConstructionModalOpen: true,
    constructionModalTileId: tileId,
    constructionModalWorkerId: workerId,
  }),
  closeConstructionModal: () => set({
    isConstructionModalOpen: false,
    constructionModalTileId: null,
    constructionModalWorkerId: null,
  }),
});