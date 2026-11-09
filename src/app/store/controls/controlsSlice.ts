import { StateCreator } from 'zustand';
import { GameStore } from '../rootStore';
import { isPlayersWorker } from './playersWorker';

export interface ControlsSlice {
  selectedWorkerId: string | undefined;
  /** Same rule as selectWorker: only the player's civilians (FR-108). */
  setSelectedWorkerId: (workerId: string | undefined) => void;
  isConstructionModalOpen: boolean;
  constructionModalTileId: string | null;
  constructionModalWorkerId: string | null;
  openConstructionModal: (tileId: string, workerId: string) => void;
  closeConstructionModal: () => void;
}

export const createControlsSlice: StateCreator<GameStore, [], [], ControlsSlice> = (set) => ({
  selectedWorkerId: undefined,
  setSelectedWorkerId: (workerId) =>
    set((s) => (workerId === undefined || isPlayersWorker(s, workerId) ? { selectedWorkerId: workerId } : {})),
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