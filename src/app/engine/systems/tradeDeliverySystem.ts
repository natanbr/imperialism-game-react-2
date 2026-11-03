// The units bought in the trade phase reach the warehouse with the transported goods, after
// production and before the workers' meal (rules 01 section 1 phase 6; FR-064).
import type { GameState } from "@/types/GameState";
import type { TurnSystem } from "../turn/context";

export const tradeDeliverySystem: TurnSystem = (state: GameState): GameState => {
  const market = state.market;
  if (!market || Object.keys(market.deliveries).length === 0) return state;

  const nations = state.nations.map((nation) => {
    if (!Object.hasOwn(market.deliveries, nation.id)) return nation;
    const warehouse = { ...nation.warehouse } as Record<string, number>;
    for (const [commodity, amount] of Object.entries(market.deliveries[nation.id])) {
      warehouse[commodity] = (warehouse[commodity] ?? 0) + (amount ?? 0);
    }
    return { ...nation, warehouse: warehouse as typeof nation.warehouse };
  });

  return { ...state, nations, market: { ...market, deliveries: {} } };
};
