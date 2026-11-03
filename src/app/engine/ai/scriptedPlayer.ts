import type { GameState } from "@/types/GameState";
import { ResourceType } from "@/types/Resource";
import type { Tile } from "@/types/Tile";
import { WorkerStatus, WorkerType } from "@/types/Workers";
import type { Order } from "../orders/Order";
import { applyOrder } from "../orders/apply";
import { findWorker, nationById, workersOf, type WorkerLocation } from "../orders/queries";
import { validateOrder } from "../orders/validate";
import { BUILDING_ORDER, BUILDINGS } from "@/definisions/industryBuildings";
import { RECIPES } from "@/definisions/ResourceConversions";
import { buildingOf } from "../industry/industryState";

/**
 * A player is any function from the game state to its orders for this turn. Scripted and,
 * from v3, LLM players share this shape (NR-006).
 */
export type Player = (state: GameState, nationId: string) => Order[];

/**
 * A tiny greedy player for headless tests. Deterministic: tiles are scanned row by row and
 * workers in map order. It plans on a private copy of the state, applying each order it
 * keeps, so every order it returns is valid in sequence (FR-016).
 */
export const scriptedPlayer: Player = (state, nationId) => {
  const orders: Order[] = [];
  let view = state;
  const propose = (order: Order): boolean => {
    if (!validateOrder(view, order).ok) return false;
    view = applyOrder(view, order);
    orders.push(order);
    return true;
  };

  const nation = nationById(state, nationId);
  if (!nation) return orders;

  // Ship half the capacity as grain, leave the rest to the greedy fill. Always valid, so the
  // nation issues at least one order every turn.
  propose({
    kind: "setTransportAllocations",
    nationId,
    allocations: { [ResourceType.Grain]: Math.floor((nation.transportCapacity ?? 0) / 2) },
  });
  propose({ kind: "changeTransportCapacity", nationId, delta: 1 });

  // Industry: each building's outputs at the most the stock, labour and capacity allow, in the
  // production order; canned food one batch at a time so the workers keep raw food to eat.
  for (const building of BUILDING_ORDER) {
    const def = BUILDINGS[building];
    for (const output of def.outputs) {
      const batch = RECIPES[output].batch;
      const most = def.unlimited ? batch : buildingOf(nationById(view, nationId)!, building).capacity;
      for (let amount = most - (most % batch); amount > 0; amount -= batch) {
        if (propose({ kind: "setProduction", nationId, building, output, amount })) break;
      }
    }
  }

  const ownTiles = state.map.tiles.flat().filter((t) => t.ownerNationId === nationId);
  for (const { worker } of workersOf(state, nationId)) {
    const current = findWorker(view, worker.id);
    if (!current || current.worker.status !== WorkerStatus.Available || current.worker.justMoved) continue;
    for (const order of candidateOrders(nationId, current, ownTiles)) {
      if (propose(order)) break;
    }
  }
  return orders;
};

/** What this worker could do, best first; validation picks the first one that is allowed. */
function candidateOrders(nationId: string, { worker, tile }: WorkerLocation, ownTiles: Tile[]): Order[] {
  const workerId = worker.id;
  switch (worker.type) {
    case WorkerType.Prospector:
      return [
        { kind: "startProspecting", nationId, workerId, tileId: tile.id },
        ...ownTiles.map((t): Order => ({ kind: "moveAndStartProspecting", nationId, workerId, toTileId: t.id })),
      ];
    case WorkerType.Engineer:
      return [
        ...ownTiles.map((t): Order => ({ kind: "moveAndBuildRail", nationId, workerId, toTileId: t.id })),
        { kind: "startConstruction", nationId, workerId, tileId: tile.id, structure: "depot" },
        ...ownTiles.map((t): Order => ({ kind: "moveAndStartConstruction", nationId, workerId, toTileId: t.id, structure: "depot" })),
      ];
    default:
      return [
        { kind: "startDevelopment", nationId, workerId, tileId: tile.id },
        ...ownTiles.map((t): Order => ({ kind: "moveAndStartDevelopment", nationId, workerId, toTileId: t.id })),
      ];
  }
}
