import { StateCreator } from 'zustand';
import { GameState } from '@/types/GameState';

export interface ControlsSlice {
  selectedWorkerId: string | null;
  setSelectedWorkerId: (workerId: string | null) => void;
}

export const createControlsSlice: StateCreator<GameState, [], [], ControlsSlice> = (set) => ({
  selectedWorkerId: null,
  setSelectedWorkerId: (workerId) => set({ selectedWorkerId: workerId }),
});