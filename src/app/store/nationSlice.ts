import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
import { Nation } from "@/types/Nation";

export interface NationSlice {
  // Nation-level actions
  setNations: (nations: Nation[]) => void;
  setNationTransportCapacity: (nationId: string, capacity: number) => void;
}

export const createNationSlice: StateCreator<GameState, [], [], NationSlice> = (set) => ({
  setNations: (nations: Nation[]) => set({ nations }),
  setNationTransportCapacity: (nationId: string, capacity: number) =>
    set((state) => ({
      nations: state.nations.map((n) =>
        n.id === nationId
          ? { ...n, transportCapacity: Math.max(0, Math.floor(capacity)) }
          : n
      ),
    })),
});
