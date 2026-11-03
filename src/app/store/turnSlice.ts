import { StateCreator } from 'zustand';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { GameState } from '@/types/GameState';

export interface TurnSlice {
  turn: number;
  year: number;
  turnOrder: {
    phases: [
      "diplomacy",
      "trade",
      "production",
      "combat",
      "interceptions",
      "logistics"
    ];
  };
  advanceTurn: () => void;
}

export const createTurnSlice: StateCreator<
  GameState,
  [],
  [],
  TurnSlice
> = (set) => ({
  turn: 1,
  year: 1900,
  turnOrder: {
    phases: ["diplomacy", "trade", "production", "combat", "interceptions", "logistics"]
  },

  // The engine resolves the whole turn. The UI's actions were already applied as orders when
  // they were made, so no orders are passed here; part B surfaces the returned events.
  advanceTurn: () => set((state) => resolveTurn(state, {}, state.seed).state),
});
