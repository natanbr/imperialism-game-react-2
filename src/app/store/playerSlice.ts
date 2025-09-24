import { StateCreator } from "zustand";
import { GameStore } from "./rootStore";

export interface PlayerSlice {
  activeNationId: string;
  setActiveNation: (nationId: string) => void;
}

export const createPlayerSlice: StateCreator<GameStore, [], [], PlayerSlice> = (set) => ({
  activeNationId: "nation-1",
  setActiveNation: (nationId) => set({ activeNationId: nationId }),
});