import { StateCreator } from 'zustand';
import type { GameStore } from '../rootStore';

export interface ControlsSlice {
  selectedWorkerId: string | null;
  setSelectedWorkerId: (workerId: string | null) => void;
}

export const createControlsSlice: StateCreator<GameStore, [], [], ControlsSlice> = (set) => ({
  selectedWorkerId: null,
  setSelectedWorkerId: (workerId) => set({ selectedWorkerId: workerId }),
});