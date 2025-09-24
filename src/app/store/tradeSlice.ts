<<<<<<< HEAD
=======
<<<<<<< HEAD
// Empty createTradeSlice for Zustand store composition
export const createTradeSlice = () => ({});
import { TradeRoute } from "@/types/TradeRoute";
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
// Empty createTradeSlice for Zustand store composition
export const createTradeSlice = () => ({});
import { TradeRoute } from "@/types/TradeRoute";

export interface TradeSlice {
  tradeRoutes: TradeRoute[];
  // actions: addTradeRoute, cancelTradeRoute, resolveTradeTurn...
}
<<<<<<< HEAD
=======
=======
import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)

export interface TradeSlice {
  tradeRoutes: TradeRoute[];
  // actions: addTradeRoute, cancelTradeRoute, resolveTradeTurn...
}
<<<<<<< HEAD
=======

export const createTradeSlice: StateCreator<GameState, [], [], TradeSlice> = (set) => ({
  // initial state for trade slice
});
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
