import { Nation } from "@/types/Nation";
import { StateCreator } from "zustand";

export interface NationSlice {
  nations: Nation[];
  setNations: (nations: Nation[]) => void;
}

export const createNationSlice: StateCreator<NationSlice> = (set) => ({
  nations: [],
  setNations: (nations) => set({ nations }),
});
