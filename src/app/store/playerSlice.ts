import { StateCreator } from "zustand";

export interface PlayerSlice {
  activeNationId: string;
  setActiveNation: (nationId: string) => void;
}

export const createPlayerSlice: StateCreator<PlayerSlice> = (set) => ({
  activeNationId: "nation-1",
  setActiveNation: (nationId) => set({ activeNationId: nationId }),
});