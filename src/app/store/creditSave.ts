import { CREDIT_INCOME_TURNS } from "@/engine/credit/definitions";
import { postedCreditLimit } from "@/engine/credit/settlement";
import type { Order } from "@/engine/orders/Order";
import type { GameState } from "@/types/GameState";
import type { GameSession } from "./gameSlice";

/** Both the position offered to Continue and any older replay checkpoint need the owner's logged authorization. */
export function validSavedCredit(session: GameSession): boolean {
  const { activeNationId, game, orderLog, ordersThisTurn, replayBoundary } = session;
  let opening: { turn: number; index: number } | undefined;
  function inspect(orders: readonly Order[], submitter: string, turn: number, pending: boolean): boolean {
    for (const [index, order] of orders.entries()) {
      if (order.kind !== "openCredit") continue;
      if (submitter !== activeNationId || order.nationId !== submitter || !Number.isInteger(turn) ||
          turn < 1 || (!pending && turn >= game.turn)) return false;
      if (!opening || turn < opening.turn) opening = { turn, index };
    }
    return true;
  }
  for (const entry of orderLog) {
    if (!inspect(entry.orders, entry.nationId, entry.turn, false)) return false;
  }
  if (!inspect(ordersThisTurn, activeNationId, game.turn, true)) return false;

  function validPosition(state: GameState, appliedOrders: number): boolean {
    const authorized = opening && (opening.turn < state.turn || (opening.turn === state.turn && opening.index < appliedOrders));
    if (authorized && !state.nations.some(n => n.id === activeNationId && n.controller === "human")) return false;
    return state.nations.every(nation => {
      if (!Number.isFinite(nation.treasury)) return false;
      const account = nation.creditAccount;
      if (!authorized || nation.id !== activeNationId) return account === undefined && nation.treasury >= 0;
      if (!account || !Array.isArray(account.saleReceipts)) return false;
      const history = account.saleReceipts;
      return history.length === Math.min(CREDIT_INCOME_TURNS, state.turn - opening!.turn) &&
        history.every(value => Number.isSafeInteger(value) && value >= 0) &&
        Number.isSafeInteger(account.limit) && account.limit === postedCreditLimit(history);
    });
  }
  return validPosition(game, ordersThisTurn.length) &&
    (!replayBoundary?.checkpoint || validPosition(replayBoundary.checkpoint, replayBoundary.appliedOrders));
}
