import { StateCreator } from 'zustand';

export interface OverlaySlice {
  isWarehouseOpen: boolean;
  openWarehouse: () => void;
  closeWarehouse: () => void;
}

export const createOverlaySlice: StateCreator<OverlaySlice, [], [], OverlaySlice> = (set) => ({
  isWarehouseOpen: false,
  openWarehouse: () => set({ isWarehouseOpen: true }),
  closeWarehouse: () => set({ isWarehouseOpen: false }),
});