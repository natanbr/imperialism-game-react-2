import type { GameState } from "@/types/GameState";
import { WorkerStatus, WorkerType } from "@/types/Workers";
import type { Order } from "../orders/Order";
import { applyOrder } from "../orders/apply";
import { orderedDevelopmentSites, planTechnology } from "./scriptedTechnology";
import { CONSTRUCTION_COST } from "@/definisions/workPrices";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
import { EngineerBuildDurationsTurns } from "@/definisions/workerDurations";
import { findWorker, nationById, treasuryOf, workersOf, type WorkerLocation } from "../orders/queries";
import { validateOrder } from "../orders/validate";
import { bestDepotSite, nextRailSections, pendingRailTiles, tilesByReach, type DepotSite } from "./railPlan";
import { planEconomy, planFinalTransport, researchReserve, turnsAfter } from "./economy";
import { scriptedDiplomacyOrders } from "./diplomacy";
import { upkeepReserve } from "./scriptedArmy";
import { planWarDeclaration, planWarMoves } from "./scriptedWar";

/**
 * A player is any function from the game state to its orders for this turn. Scripted and,
 * from v3, LLM players share this shape (NR-006).
 */
export type Player = (state: GameState, nationId: string) => Order[];

/**
 * A small scripted player. Deterministic: tiles are scanned row by row and workers in map order,
 * the engineer first. It plans on a private copy of the state, applying each order it keeps, so
 * every order it returns is valid in sequence (FR-016). Order of its plan: the economy (transport,
 * training, freight cars, expansion, production, world-market trade; economy.ts, FR-126 to FR-130),
 * then the civilians: the engineer joins depots to the capital by the shortest rail path or starts
 * the depot that gathers most when it pays back (FR-122, FR-132), the prospector works the gathered
 * tiles first (FR-123) and the developers start the cheapest level that pays first (FR-131); neither starts a job on
 * a tile the engineer's rail still needs (FR-459).
 */
type AllowOrder = (order: Order, before: GameState, after: GameState) => boolean;

export function planOrdinaryTurn(state: GameState, nationId: string, allowOrder?: AllowOrder) {
  const orders: Order[] = [];
  let view = state;
  const propose = (order: Order): boolean => {
    if (!validateOrder(view, order).ok) return false;
    const next = applyOrder(view, order);
    // A policy sharing this planner (the FR-509 diplomat) must decline an order before later decisions see its effects.
    if (spendsTheUpkeep(view, next, nationId) || (allowOrder && !allowOrder(order, view, next))) return false;
    view = next;
    orders.push(order);
    return true;
  };

  if (!nationById(state, nationId)) return { view, orders, propose };

  // FR-274, FR-488: a declaration of war first, so this turn's economy and trade see the war
  planWarDeclaration(() => view, nationId, propose);
  planEconomy(() => view, nationId, propose);

  // The engineer plans first, so the depot he starts is paid for and its tiles count as gathered
  // when the others choose (FR-123). The sort is stable: the others keep their map order.
  const civilians = workersOf(state, nationId).sort(
    (a, b) => Number(b.worker.type === WorkerType.Engineer) - Number(a.worker.type === WorkerType.Engineer)
  );
  // FR-459: taken before the engineer's section of this turn, whose job would hide the rest of the path from railPath
  const railTiles = pendingRailTiles(view, nationId);
  for (const { worker } of civilians) {
    const current = findWorker(view, worker.id);
    if (!current || current.worker.status !== WorkerStatus.Available || current.worker.justMoved) continue;
    for (const order of candidateOrders(view, nationId, current, railTiles)) {
      if (propose(order)) break;
    }
  }

  // FR-389: the transport plan again, now that this turn's rails are known (a rail finished this turn joins a hub)
  planFinalTransport(state, view, nationId, propose);

  // At war (or declaring war this turn): the attacks and marches (FR-228, FR-274, FR-489)
  planWarMoves(() => view, nationId, propose);

  // Last, and only at war: a peace offer when beaten (FR-408) or holding what it went to war for (FR-489). At peace
  // nothing is added (FR-181).
  for (const order of scriptedDiplomacyOrders(view, nationId)) propose(order);
  return { view, orders, propose };
}

export const scriptedOrdersWithoutResearch: Player = (state, nationId) => planOrdinaryTurn(state, nationId).orders;

export function scriptedPlayer(state: GameState, nationId: string, allowOrder?: AllowOrder): Order[] {
  if (!nationById(state, nationId)) return [];
  const { view, orders, propose } = planOrdinaryTurn(state, nationId, allowOrder);
  planTechnology(view, nationId, researchReserve(view, nationId), propose, planOrdinaryTurn);
  return orders;
}

/**
 * FR-213 (a): it keeps its garrison, so no order of its own takes the treasury below `upkeepReserve` (an order that
 * would is dropped). A world without armies has no upkeep, so there nothing is dropped and its orders are as before M8.
 */
function spendsTheUpkeep(before: GameState, after: GameState, nationId: string): boolean {
  const left = treasuryOf(after, nationId);
  return left < treasuryOf(before, nationId) && left < upkeepReserve(after, nationId);
}

// FR-213 (a), FR-275: defined beside the garrison since M13 (FR-483 counts a recruit in it); still exported from here.
export { upkeepReserve };

/**
 * A depot pays back (FR-132) when what it newly gathers, over the turns it delivers, is worth its
 * price and its rail: `gain` units a turn at about $100 each (a resource's world price, 1 point),
 * counted from two turns after the build starts plus one turn per rail section (FR-138). So no depot is
 * started in the last 2 + rail sections + (20 + rail cost / 100) / gain turns: at least 14 turns after
 * this one for a gain of 2 and the one flat section every depot needs (2 + 1 + 21 / 2 = 13.5).
 */
function depotPaysBack(view: GameState, site: DepotSite): boolean {
  const delivering = turnsAfter(view) - (EngineerBuildDurationsTurns.depot - 1) - site.railNeeded;
  const cost = (CONSTRUCTION_COST.depot + site.railCost) / SCORE_WEIGHTS.dollarsPerPoint;
  return site.gain * delivering >= cost;
}

/**
 * What this civilian could do, best first; validation picks the first one that is allowed. The prospector and the
 * developers leave `railTiles` (`pendingRailTiles`, FR-459) to the engineer.
 */
function candidateOrders(view: GameState, nationId: string, { worker, tile }: WorkerLocation, railTiles: Set<string>): Order[] {
  const workerId = worker.id;
  if (worker.type === WorkerType.Engineer) return engineerOrders(view, nationId, workerId, tile.id);
  const prospecting = worker.type === WorkerType.Prospector;
  let tiles = tilesByReach(view, nationId).filter((t) => !railTiles.has(t.id));
  if (!prospecting) tiles = orderedDevelopmentSites(view, worker, tiles);
  return tiles.map((t): Order => {
    if (t.id === tile.id) {
      return prospecting ? { kind: "startProspecting", nationId, workerId, tileId: t.id } : { kind: "startDevelopment", nationId, workerId, tileId: t.id };
    }
    return prospecting
      ? { kind: "moveAndStartProspecting", nationId, workerId, toTileId: t.id }
      : { kind: "moveAndStartDevelopment", nationId, workerId, toTileId: t.id };
  });
}

/**
 * The engineer (FR-122, FR-138): (1) the next missing rail section of the shortest path joining a built
 * depot to the capital's network, naming its start; else (2), while no depot is being built, the best
 * depot site (`bestDepotSite`: an urgent meal first, then the shortest payback of what the nation will
 * use, FR-456, FR-457), if it pays back (FR-132). It lays no rail that joins nothing and builds no port.
 */
function engineerOrders(view: GameState, nationId: string, workerId: string, standingOn: string): Order[] {
  const rail = nextRailSections(view, nationId).map(
    ({ fromTileId, toTileId }): Order => ({ kind: "moveAndStartConstruction", nationId, workerId, toTileId, structure: "rail", fromTileId })
  );
  if (rail.length > 0) return rail;
  const building = view.map.tiles.flat().some((t) => t.ownerNationId === nationId && t.constructionJob?.kind === "depot");
  if (building) return [];
  const site = bestDepotSite(view, nationId);
  if (!site || !depotPaysBack(view, site)) return [];
  if (site.tileId === standingOn) return [{ kind: "startConstruction", nationId, workerId, tileId: site.tileId, structure: "depot" }];
  return [{ kind: "moveAndStartConstruction", nationId, workerId, toTileId: site.tileId, structure: "depot" }];
}
