import { StateCreator } from "zustand";
import { GameStore } from "./types";
import { TradeRoute } from "@/types/TradeRoute";

export interface TradeSlice {
  tradeRoutes: TradeRoute[];
  addTradeRoute: (tradeRoute: TradeRoute) => void;
}

export const createTradeSlice: StateCreator<
  GameStore,
  [],
  [],
  TradeSlice
> = (set) => ({
  tradeRoutes: [],
  addTradeRoute: (tradeRoute) =>
    set((state) => ({ tradeRoutes: [...state.tradeRoutes, tradeRoute] })),
});
