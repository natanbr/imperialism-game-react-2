// Turns a tile click into the orders it asks for (FR-023). Plain functions, no React, so the
// click policy is tested without a browser; useTileClickHandler sends the orders.
import type { Order, ValidationResult } from "@/engine";
import { areTilesAdjacent, canBuildRailAt } from "@/engine/map/mapHelpers";
import { findWorker, isRailNode, railSectionStart, tileById } from "@/engine/orders/queries";
import type { GameState } from "@/types/GameState";
import type { PossibleAction } from "@/types/actions";
import { WorkerType } from "@/types/Workers";

/**
 * The orders a plain move tries, best first. An engineer stepping onto a neighbour builds rail on
 * the way: onto a tile without rail by rail-on-move; from a rail node onto a rail node not yet
 * linked to it, the section between the two (FR-137), else two networks that meet head on could
 * never be joined by a click. Otherwise, and as the fallback, it just moves.
 */
export function moveOrders(state: GameState, nationId: string, workerId: string, toTileId: string): Order[] {
  const from = findWorker(state, workerId);
  const to = tileById(state, toTileId);
  if (!from || !to) return [];
  const move: Order = { kind: "moveWorker", nationId, workerId, toTileId };
  const engineerStep =
    from.worker.type === WorkerType.Engineer && areTilesAdjacent(state.map, from.tile.x, from.tile.y, to.x, to.y);
  if (!engineerStep) return [move];
  if (canBuildRailAt(state.map, to.x, to.y, nationId)) return [{ kind: "moveAndBuildRail", nationId, workerId, toTileId }, move];
  if (isRailNode(to, nationId) && railSectionStart(state, nationId, to, from.tile)) {
    return [{ kind: "moveAndStartConstruction", nationId, workerId, toTileId, structure: "rail", fromTileId: from.tile.id }, move];
  }
  return [move];
}

/**
 * The orders a click on `tileId` tries for the selected worker, best first. A job on the worker's
 * own tile is a start; a job elsewhere is move-and-start, then the plain move, so a click still
 * moves the worker when only the job is refused (pre-M1 behaviour). The construction dialog on
 * the worker's own tile is UI only and asks for no order. All orders carry the active nation.
 */
export function tileClickOrders(
  state: GameState,
  nationId: string,
  workerId: string,
  tileId: string,
  action: PossibleAction
): Order[] {
  const at = findWorker(state, workerId);
  if (!at) return [];
  const sameTile = at.tile.id === tileId;
  const plainMove: Order = { kind: "moveWorker", nationId, workerId, toTileId: tileId };

  switch (action?.type) {
    case "prospect":
      return sameTile
        ? [{ kind: "startProspecting", nationId, workerId, tileId }]
        : [{ kind: "moveAndStartProspecting", nationId, workerId, toTileId: tileId }, plainMove];
    case "develop":
      return sameTile
        ? [{ kind: "startDevelopment", nationId, workerId, tileId }]
        : [{ kind: "moveAndStartDevelopment", nationId, workerId, toTileId: tileId }, plainMove];
    case "construct":
      return sameTile
        ? [{ kind: "startConstruction", nationId, workerId, tileId, structure: action.kind }]
        : [{ kind: "moveAndStartConstruction", nationId, workerId, toTileId: tileId, structure: action.kind }, plainMove];
    case "open-construct-modal":
      return sameTile ? [] : moveOrders(state, nationId, workerId, tileId);
    default:
      return moveOrders(state, nationId, workerId, tileId);
  }
}

/**
 * Submits the orders one by one until one is accepted. A refusal for lack of money stops the
 * list: an unaffordable job never turns into a plain move. Returns the last result.
 */
export function submitFirstAccepted(
  submit: (order: Order) => ValidationResult,
  orders: readonly Order[]
): ValidationResult | undefined {
  let result: ValidationResult | undefined;
  for (const order of orders) {
    result = submit(order);
    if (result.ok || result.reason === "insufficient-funds") break;
  }
  return result;
}
