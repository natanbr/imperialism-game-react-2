// Who plays the nations the person at this client does not (FR-099). The store asks here at End
// Turn; headless tests do the same. v3 adds an LLM player as one more registry entry (NR-006).
import type { GameState } from "@/types/GameState";
import type { NationController } from "@/types/Nation";
import type { Order } from "../orders/Order";
import { scriptedPlayer, type Player } from "./scriptedPlayer";

/** The player behind each controller that is not a human. */
export const PLAYERS: Readonly<Record<Exclude<NationController, "human">, Player>> = {
  scripted: scriptedPlayer,
};

/**
 * This turn's orders of every nation that is not human, in state order, each from its controller's
 * player. Pure: each player plans on the state as given (the human's orders already applied).
 */
export function computerOrders(state: GameState): Record<string, Order[]> {
  const orders: Record<string, Order[]> = {};
  for (const nation of state.nations) {
    if (nation.controller === "human" || !Object.hasOwn(PLAYERS, nation.controller)) continue;
    orders[nation.id] = PLAYERS[nation.controller](state, nation.id);
  }
  return orders;
}
