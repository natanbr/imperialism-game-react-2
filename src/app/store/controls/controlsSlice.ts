import { StateCreator } from 'zustand';
import { GameState } from '@/types/GameState';

export interface ControlsSlice {
  selectedWorkerId: string | null;
  setSelectedWorkerId: (workerId: string | null) => void;
  isConstructionModalOpen: boolean;
  constructionModalTileId: string | null;
  constructionModalWorkerId: string | null;
  openConstructionModal: (tileId: string, workerId: string) => void;
  closeConstructionModal: () => void;
}

export const createControlsSlice: StateCreator<GameState, [], [], ControlsSlice> = (set) => ({
  selectedWorkerId: null,
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