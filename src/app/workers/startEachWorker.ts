import { GameState } from "@/types/GameState";
import { Tile } from "@/types/Tile";
import { Worker, WorkerStatus, WorkerType } from "@/types/Workers";
import { applyOrder } from "@/engine/orders/apply";
import { Order } from "@/engine/orders/Order";
import { findWorker } from "@/engine/orders/queries";

/**
 * Adapter for the pre-M1 start functions, which take an optional worker id and, without one,
 * start every available worker of the type. Each start is now one engine order, so the
 * engine's rules and prices apply (FR-017). Part B removes these functions.
 */
export function startEachWorker(
  state: GameState,
  type: WorkerType,
  workerId: string | undefined,
  toOrder: (state: GameState, worker: Worker, tile: Tile) => Order | undefined
): GameState {
  const ids = state.map.tiles
    .flat()
    .flatMap((tile) => tile.workers)
    .filter((w) => w.type === type && w.status === WorkerStatus.Available && (workerId === undefined || w.id === workerId))
    .map((w) => w.id);

  let s = state;
  for (const id of ids) {
    const loc = findWorker(s, id);
    const order = loc && toOrder(s, loc.worker, loc.tile);
    if (order) s = applyOrder(s, order);
  }
  return s;
}
