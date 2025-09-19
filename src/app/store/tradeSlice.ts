// Empty createTradeSlice for Zustand store composition
export const createTradeSlice = () => ({});
import { TradeRoute } from "@/types/TradeRoute";

export interface TradeSlice {
  tradeRoutes: TradeRoute[];
  // actions: addTradeRoute, cancelTradeRoute, resolveTradeTurn...
}
