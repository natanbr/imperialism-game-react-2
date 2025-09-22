import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";

export interface TradeSlice {
  // actions: addTradeRoute, cancelTradeRoute, resolveTradeTurn...
}

export const createTradeSlice: StateCreator<GameState, [], [], TradeSlice> = (set) => ({
  // initial state for trade slice
});
