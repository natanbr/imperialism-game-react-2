import type { GameState } from "@/types/GameState";
import { WorkerStatus, WorkerType } from "@/types/Workers";
import type { Order } from "../orders/Order";
import { applyOrder } from "../orders/apply";
import type { Tile } from "@/types/Tile";
import type { Worker } from "@/types/Workers";
import { CONSTRUCTION_COST, DEVELOPMENT_COST } from "@/definisions/workPrices";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
import { EngineerBuildDurationsTurns, WorkerLevelDurationsTurns } from "@/definisions/workerDurations";
import { findWorker, nationById, nextResourceLevel, treasuryOf, workersOf, type WorkerLocation } from "../orders/queries";
import { upkeepOf } from "../army/armies";
import { validateOrder } from "../orders/validate";
import { bestDepotSite, nextRailSections, tilesByReach, type DepotSite } from "./railPlan";
import { planEconomy, turnsAfter } from "./economy";
import { scriptedDiplomacyOrders } from "./diplomacy";

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
 * tiles first (FR-123) and the developers start the cheapest level that pays first (FR-131).
 */
export const scriptedPlayer: Player = (state, nationId) => {
  const orders: Order[] = [];
  let view = state;
  const propose = (order: Order): boolean => {
    if (!validateOrder(view, order).ok) return false;
    const next = applyOrder(view, order);
    if (spendsTheUpkeep(view, next, nationId)) return false;
    view = next;
    orders.push(order);
    return true;
  };

  if (!nationById(state, nationId)) return orders;

  planEconomy(() => view, nationId, propose);

  // The engineer plans first, so the depot he starts is paid for and its tiles count as gathered
  // when the others choose (FR-123). The sort is stable: the others keep their map order.
  const civilians = workersOf(state, nationId).sort(
    (a, b) => Number(b.worker.type === WorkerType.Engineer) - Number(a.worker.type === WorkerType.Engineer)
  );
  for (const { worker } of civilians) {
    const current = findWorker(view, worker.id);
    if (!current || current.worker.status !== WorkerStatus.Available || current.worker.justMoved) continue;
    for (const order of candidateOrders(view, nationId, current)) {
      if (propose(order)) break;
    }
  }

  // Last, and only at war: a peace offer when losing (FR-174). At peace nothing is added (FR-181).
  for (const order of scriptedDiplomacyOrders(view, nationId)) propose(order);
  return orders;
};

/**
 * FR-213: it keeps its garrison, so no order of its own spends the cash of the army upkeep (FR-202) of this turn and
 * the next (this turn's only, on the last turn): an order that takes the treasury below it is dropped. Two turns, so
 * a turn that ends with less than an upkeep left still leaves the next one paid. A world without armies has no
 * upkeep, so there nothing is dropped and its orders are as before M8.
 */
function spendsTheUpkeep(before: GameState, after: GameState, nationId: string): boolean {
  const left = treasuryOf(after, nationId);
  const kept = upkeepOf(after, nationId) * (turnsAfter(after) > 0 ? 2 : 1);
  return left < treasuryOf(before, nationId) && left < kept;
}

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
 * The level a development job on this tile would reach, when the job pays (FR-131): its 10 points
 * are at least its price in points (level 1 $100 and level 2 $1,000 do; level 3 at $5,000 = 50
 * points does not) and it finishes by the last turn.
 */
function developmentLevel(view: GameState, tile: Tile, worker: Worker): number | undefined {
  const level = nextResourceLevel(tile);
  const price = DEVELOPMENT_COST[level as 1 | 2 | 3];
  if (price === undefined || price / SCORE_WEIGHTS.dollarsPerPoint > SCORE_WEIGHTS.pointsPerLevel) return undefined;
  const duration = WorkerLevelDurationsTurns[worker.type]?.[level as 1 | 2 | 3] ?? 1;
  return turnsAfter(view) >= duration - 1 ? level : undefined;
}

/** What this civilian could do, best first; validation picks the first one that is allowed. */
function candidateOrders(view: GameState, nationId: string, { worker, tile }: WorkerLocation): Order[] {
  const workerId = worker.id;
  if (worker.type === WorkerType.Engineer) return engineerOrders(view, nationId, workerId, tile.id);
  const prospecting = worker.type === WorkerType.Prospector;
  let tiles = tilesByReach(view, nationId);
  if (!prospecting) {
    // The cheapest level first; the sort is stable, so each level keeps the FR-123 order.
    tiles = tiles
      .map((t) => ({ t, level: developmentLevel(view, t, worker) }))
      .filter((x): x is { t: Tile; level: number } => x.level !== undefined)
      .sort((a, b) => a.level - b.level)
      .map(({ t }) => t);
  }
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
 * depot to the capital's network, naming its start; else (2), while no depot is being built, the depot
 * that newly gathers most, if it pays back (FR-132). It lays no rail that joins nothing and builds no
 * port (nothing it ships needs one).
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
