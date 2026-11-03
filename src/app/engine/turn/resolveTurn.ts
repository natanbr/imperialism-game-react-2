import type { GameState } from "@/types/GameState";
import type { Order } from "../orders/Order";
import { tryApplyOrder } from "../orders/apply";
import { advanceClock, applyQueuedTransportCapacity, resetWorkers } from "../systems/turnHousekeeping";
import { createTurnContext, type GameEvent } from "./context";
import { runTurnPhases } from "./phases";

export type OrdersByNation = Readonly<Record<string, readonly Order[]>>;

export interface TurnResult {
  state: GameState;
  events: GameEvent[];
}

/**
 * Applies the turn's orders: nations in state order (then unknown keys, sorted), each nation's
 * orders in the order given. An order filed under another nation's key, or refused by
 * validation, is skipped and reported as an `order-rejected` event.
 */
export function applyTurnOrders(
  state: GameState,
  ordersByNation: OrdersByNation,
  emit: (event: GameEvent) => void
): { state: GameState; accepted: Order[] } {
  const submitted = Object.keys(ordersByNation);
  const known = state.nations.map((n) => n.id).filter((id) => submitted.includes(id));
  const unknown = submitted.filter((id) => !known.includes(id)).sort();

  let s = state;
  const accepted: Order[] = [];
  for (const nationId of [...known, ...unknown]) {
    for (const order of ordersByNation[nationId] ?? []) {
      if (order.nationId !== nationId) {
        emit({ type: "order-rejected", nationId, order, reason: "not-owner" });
        continue;
      }
      const { state: next, result } = tryApplyOrder(s, order);
      if (result.ok) {
        s = next;
        accepted.push(order);
      } else {
        emit({ type: "order-rejected", nationId, order, reason: result.reason });
      }
    }
  }
  return { state: s, accepted };
}

/**
 * Resolves one turn (FR-011). This is the only place where the turn's orders are applied, the
 * queued transport capacity arrives, every system runs, workers are reset and the turn and
 * year advance. `seed` is the game seed (normally `state.seed`); the RNG is derived from it and
 * the turn number, so the same state and orders always give the same result.
 *
 * Giving the orders here is equivalent to applying them with applyOrder first and passing none.
 */
export function resolveTurn(state: GameState, ordersByNation: OrdersByNation, seed: number = state.seed): TurnResult {
  const events: GameEvent[] = [];
  const emit = (event: GameEvent) => {
    events.push(event);
  };

  const { state: ordered, accepted } = applyTurnOrders(state, ordersByNation, emit);
  const ctx = createTurnContext({ turn: ordered.turn, seed, orders: accepted, emit });

  let s = applyQueuedTransportCapacity(ordered, ctx);
  s = runTurnPhases(s, ctx);
  s = resetWorkers(s, ctx);
  s = advanceClock(s, ctx);

  emit({ type: "turn-ended", turn: s.turn, year: s.year });
  return { state: s, events };
}
