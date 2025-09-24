import { Nation } from "@/types/Nation";
import { StateCreator } from "zustand";
import { GameStore } from "./rootStore";

export interface NationSlice {
  nations: Nation[];
  setNations: (nations: Nation[]) => void;
}

export const createNationSlice: StateCreator<GameStore, [], [], NationSlice> = (set) => ({
  nations: [],
  setNations: (nations) => set({ nations }),
});