import type { GameState } from "@/types/GameState";
import type { Order } from "../orders/Order";
import { tryApplyOrder } from "../orders/apply";
import { advanceClock, promoteFreightCars, resetWorkers } from "../systems/turnHousekeeping";
import { createTurnContext, type GameEvent } from "./context";
import { runTurnPhases } from "./phases";
import { isGameOver, turnLimitOf } from "./gameOver";
import { scoreTable } from "../score/score";
import { dropResolvedIntents } from "./intents";
import { conquestWinner } from "../army/conquest";
import type { GameOver } from "@/types/Score";

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
/** The submitting nations: those in the state in state order, then unknown keys, sorted. */
function submitters(state: GameState, ordersByNation: OrdersByNation): string[] {
  const submitted = Object.keys(ordersByNation);
  const known = state.nations.map((n) => n.id).filter((id) => submitted.includes(id));
  const unknown = submitted.filter((id) => !known.includes(id)).sort();
  return [...known, ...unknown];
}

export function applyTurnOrders(
  state: GameState,
  ordersByNation: OrdersByNation,
  emit: (event: GameEvent) => void
): { state: GameState; accepted: Order[] } {
  let s = state;
  const accepted: Order[] = [];
  for (const nationId of submitters(state, ordersByNation)) {
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
 * Resolves one turn (FR-011). This is the only place where the turn's orders are applied, every
 * system runs (the production phase builds the freight cars ordered this turn; they go into
 * service after the phases, FR-101), workers are reset and the turn and year advance. `seed` is
 * the game seed (normally `state.seed`); the RNG is
 * derived from it and the turn number, so the same state and orders always give the same result.
 *
 * Giving the orders here is equivalent to applying them with applyOrder first and passing none.
 *
 * Resolving the turn numbered `turnLimitOf(state)` ends the game (FR-068): `gameOver` records the
 * final scores, after the clock; so does a turn after which one Great Power is left standing, with
 * `reason` "conquest" and `winnerId` (FR-223). Once the game is over this is a no-op (FR-069): the
 * same state object comes back and every given order is reported as refused with `game-over`.
 */
export function resolveTurn(state: GameState, ordersByNation: OrdersByNation, seed: number = state.seed): TurnResult {
  const events: GameEvent[] = [];
  const emit = (event: GameEvent) => {
    events.push(event);
  };

  if (isGameOver(state)) {
    for (const nationId of submitters(state, ordersByNation)) {
      for (const order of ordersByNation[nationId] ?? []) emit({ type: "order-rejected", nationId, order, reason: "game-over" });
    }
    return { state, events };
  }

  const { state: ordered, accepted } = applyTurnOrders(state, ordersByNation, emit);
  const ctx = createTurnContext({ turn: ordered.turn, seed, orders: accepted, emit });

  let s = runTurnPhases(ordered, ctx);
  // Every phase that resolves intents has run: none of this turn is left (FR-152).
  s = dropResolvedIntents(s, ordered.turn);
  s = promoteFreightCars(s, ctx);
  s = resetWorkers(s, ctx);
  s = advanceClock(s, ctx);

  emit({ type: "turn-ended", turn: s.turn, year: s.year });

  // FR-223: one Great Power left standing ends the game at once; else the turn limit does (FR-068)
  const winnerId = conquestWinner(s);
  if (winnerId !== undefined || ordered.turn >= turnLimitOf(ordered)) {
    const gameOver: GameOver = {
      turn: ordered.turn,
      year: ordered.year,
      scores: scoreTable(s),
      ...(winnerId !== undefined ? { reason: "conquest" as const, winnerId } : {}),
    };
    s = { ...s, gameOver };
    emit({ type: "game-over", ...gameOver });
  }
  return { state: s, events };
}
